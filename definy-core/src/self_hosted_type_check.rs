//! 自己ホスト型チェッカー (`core.type-check-against`) でパーツの式を型検査する.
//!
//! UI の型エラー表示と, サーバー・seed の検証が同じ definy 製の型チェッカーを使うための入口.
//! 複数のパーツを 1 つの式 (`let env = ... in [check(a), check(b), ...]`) にまとめて
//! 1 回だけ Wasm にコンパイル・実行する.

use definy_event::EventHashId;
use definy_event::event::{
    CallArgument, CallExpression, Expression, LetBinding, LetExpression, ListLiteralExpression,
    PartReferenceExpression, PartType, StringExpression, TypeLiteralExpression,
    TypeLiteralItemExpression, VariableExpression,
};

use crate::expression_eval::Value;
use crate::self_hosted_ast::{
    expression_to_self_hosted_ast, part_type_to_self_hosted_ast,
    type_declaration_to_self_hosted_ast,
};

/// 自己ホスト型チェッカーが使う `core` モジュールのパーツ
#[derive(Debug, Clone, PartialEq)]
pub struct SelfHostedCoreParts {
    pub expression: EventHashId,
    pub type_ast: EventHashId,
    pub type_check_against: EventHashId,
}

impl SelfHostedCoreParts {
    pub fn from_core_module_id(core_module_id: &EventHashId) -> Self {
        let part = |name: &str| definy_event::event::derive_module_part_id(core_module_id, name);
        Self {
            expression: part("expression"),
            type_ast: part("type-ast"),
            type_check_against: part("type-check-against"),
        }
    }
}

/// 型環境に入れるパーツ (パーツ参照の型を解決するために使う)
pub struct PartTypeEntry<'a> {
    pub part_definition_event_hash: &'a EventHashId,
    pub part_type: &'a PartType,
    /// 型パーツ (`part_type` が `Type`) の宣言式. `core.type-resolve` が
    /// `reference` 型を中身の型に展開するために使う
    pub type_declaration: Option<&'a Expression>,
}

/// 型パーツの定義を型環境に入れるときのキーの接尾辞. `core.type-resolve` と揃える
pub const TYPE_DEFINITION_KEY_SUFFIX: &str = "#definition";

/// 検査するパーツ
#[derive(Clone, Copy)]
pub struct PartToCheck<'a> {
    pub expression: &'a Expression,
    pub part_type: &'a PartType,
}

#[derive(Debug, Clone, PartialEq)]
pub enum SelfHostedTypeCheckOutcome {
    Ok,
    /// 型チェッカーが返した `core.type-error`
    TypeError(SelfHostedTypeError),
    /// 式を `core.expression` で表せない (未入力, コンパイラ組み込みなど)
    Unsupported(String),
    /// 型チェッカーの実行に失敗した (Wasm の実行時エラーなど)
    CheckerFailed(String),
}

/// `core.type-error` の値. `tag` はバリアント名 (`type_mismatch` など), `detail` はそのペイロード
#[derive(Debug, Clone, PartialEq)]
pub struct SelfHostedTypeError {
    pub tag: String,
    pub detail: Option<Value>,
}

impl std::fmt::Display for SelfHostedTypeError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match &self.detail {
            Some(detail) => write!(f, "{} {}", self.tag, detail),
            None => write!(f, "{}", self.tag),
        }
    }
}

const ENV_VARIABLE_ID: i64 = 0;

/// `parts` の各パーツを `core.type-check-against` で検査する.
/// 結果は `parts` と同じ順に並ぶ
pub fn check_parts(
    parts: &[PartToCheck<'_>],
    env: &[PartTypeEntry<'_>],
    core: &SelfHostedCoreParts,
    events: &[crate::EventWithHash],
) -> Vec<SelfHostedTypeCheckOutcome> {
    let mut outcomes = Vec::with_capacity(parts.len());
    let mut calls = Vec::new();
    // calls[i] が outcomes のどの位置に対応するか
    let mut call_positions = Vec::new();
    for part in parts {
        match part_check_call(part, core) {
            Ok(call) => {
                call_positions.push(outcomes.len());
                calls.push(call);
                outcomes.push(SelfHostedTypeCheckOutcome::Ok);
            }
            Err(message) => outcomes.push(SelfHostedTypeCheckOutcome::Unsupported(message)),
        }
    }
    // 式が大きすぎると Wasm 関数のローカル変数の上限を超えるため, 数パーツずつ実行する.
    // まとめた実行が失敗したら, どのパーツで失敗したか分かるように 1 パーツずつ実行し直す
    let env_expression = type_env_expression(env, core);
    for (chunk_calls, chunk_positions) in calls
        .chunks(PARTS_PER_EVALUATION)
        .zip(call_positions.chunks(PARTS_PER_EVALUATION))
    {
        let chunk_outcomes = evaluate_checks(chunk_calls.to_vec(), env_expression.clone(), events)
            .or_else(|error| {
                if chunk_calls.len() == 1 {
                    return Err(error);
                }
                Ok(chunk_calls
                    .iter()
                    .map(|call| {
                        evaluate_checks(vec![call.clone()], env_expression.clone(), events)
                            .and_then(|mut outcomes| {
                                outcomes.pop().ok_or_else(|| "no result".to_string())
                            })
                            .unwrap_or_else(SelfHostedTypeCheckOutcome::CheckerFailed)
                    })
                    .collect())
            });
        match chunk_outcomes {
            Ok(chunk_outcomes) => {
                for (position, outcome) in chunk_positions.iter().zip(chunk_outcomes) {
                    outcomes[*position] = outcome;
                }
            }
            Err(error) => {
                for position in chunk_positions {
                    outcomes[*position] = SelfHostedTypeCheckOutcome::CheckerFailed(error.clone());
                }
            }
        }
    }
    outcomes
}

/// 1 回の評価でまとめて検査するパーツの数
const PARTS_PER_EVALUATION: usize = 8;

fn evaluate_checks(
    calls: Vec<Expression>,
    env_expression: Expression,
    events: &[crate::EventWithHash],
) -> Result<Vec<SelfHostedTypeCheckOutcome>, String> {
    let call_count = calls.len();
    let expression = Expression::Let(LetExpression {
        bindings: vec![LetBinding {
            variable_id: ENV_VARIABLE_ID,
            variable_name: "env".into(),
            value: Box::new(env_expression),
        }],
        body: Box::new(Expression::ListLiteral(ListLiteralExpression {
            items: calls,
        })),
    });
    let results = match crate::evaluate_expression(&expression, events)? {
        Value::List(results) => results,
        value => return Err(format!("self-hosted type checker returned {value}")),
    };
    if results.len() != call_count {
        return Err(format!(
            "self-hosted type checker returned {} results for {call_count} parts",
            results.len()
        ));
    }
    results.into_iter().map(type_result_to_outcome).collect()
}

fn part_check_call(
    part: &PartToCheck<'_>,
    core: &SelfHostedCoreParts,
) -> Result<Expression, String> {
    let expression = if part.part_type == &PartType::Type {
        type_declaration_to_self_hosted_ast(part.expression, &core.expression)?
    } else {
        expression_to_self_hosted_ast(part.expression, &core.expression)?
    };
    let expected_type = part_type_to_self_hosted_ast(part.part_type, &core.type_ast)?;
    Ok(Expression::Call(CallExpression {
        function: Box::new(Expression::PartReference(PartReferenceExpression::new(
            core.type_check_against.clone(),
        ))),
        arguments: vec![
            argument("expr", expression),
            argument(
                "env",
                Expression::Variable(VariableExpression {
                    variable_id: ENV_VARIABLE_ID,
                }),
            ),
            argument("expected_type", expected_type),
        ],
    }))
}

/// `core.type-env` の値 `{ variables: [], parts: [{ part_definition_event_hash, part_type }] }`.
/// 型パーツは, 宣言した型を `{hash}#definition` のキーでも入れる.
/// `core.type-ast` で表せない型のパーツは環境に入れない (参照すると `part_not_found` になる)
fn type_env_expression(env: &[PartTypeEntry<'_>], core: &SelfHostedCoreParts) -> Expression {
    let entry_record = |key: String, part_type: &PartType| {
        let part_type = part_type_to_self_hosted_ast(part_type, &core.type_ast).ok()?;
        Some(record(vec![
            ("part_definition_event_hash", string(&key)),
            ("part_type", part_type),
        ]))
    };
    let parts = env
        .iter()
        .flat_map(|entry| {
            let hash = entry.part_definition_event_hash.to_string();
            let definition = entry
                .type_declaration
                .and_then(type_declaration_to_part_type)
                .and_then(|declared| {
                    entry_record(format!("{hash}{TYPE_DEFINITION_KEY_SUFFIX}"), &declared)
                });
            entry_record(hash, entry.part_type)
                .into_iter()
                .chain(definition)
        })
        .collect();
    record(vec![
        (
            "variables",
            Expression::ListLiteral(ListLiteralExpression { items: Vec::new() }),
        ),
        (
            "parts",
            Expression::ListLiteral(ListLiteralExpression { items: parts }),
        ),
    ])
}

fn type_result_to_outcome(result: Value) -> Result<SelfHostedTypeCheckOutcome, String> {
    match result {
        Value::Variant { tag, .. } if tag == "ok" => Ok(SelfHostedTypeCheckOutcome::Ok),
        Value::Variant {
            tag,
            payload: Some(error),
        } if tag == "error" => match *error {
            Value::Variant { tag, payload } => {
                Ok(SelfHostedTypeCheckOutcome::TypeError(SelfHostedTypeError {
                    tag,
                    detail: payload.map(|payload| *payload),
                }))
            }
            value => Err(format!("unexpected core.type-error value: {value}")),
        },
        value => Err(format!("unexpected core.type-result value: {value}")),
    }
}

fn argument(name: &str, value: Expression) -> CallArgument {
    CallArgument {
        name: name.into(),
        value: Box::new(value),
    }
}

fn record(items: Vec<(&str, Expression)>) -> Expression {
    Expression::TypeLiteral(TypeLiteralExpression {
        items: items
            .into_iter()
            .map(|(key, value)| TypeLiteralItemExpression {
                key: key.into(),
                value: Box::new(value),
            })
            .collect(),
    })
}

fn string(value: &str) -> Expression {
    Expression::String(StringExpression {
        value: value.into(),
    })
}

/// 型パーツの宣言式 (`TypeUnion` など) を, それが表す型に変換する
pub fn type_declaration_to_part_type(expression: &Expression) -> Option<PartType> {
    use definy_event::event::{FunctionParameterType, RecordFieldType, UnionVariantType};
    let boxed = |expression: &Expression| type_declaration_to_part_type(expression).map(Box::new);
    match expression {
        Expression::TypeNumber => Some(PartType::Number),
        Expression::TypeString => Some(PartType::String),
        Expression::TypeBoolean => Some(PartType::Boolean),
        Expression::TypeList(list) => Some(PartType::List(boxed(&list.item_type)?)),
        Expression::TypeLiteral(record) => record
            .items
            .iter()
            .map(|item| {
                Some(RecordFieldType {
                    key: item.key.clone(),
                    value: boxed(&item.value)?,
                })
            })
            .collect::<Option<Vec<_>>>()
            .map(PartType::Record),
        Expression::TypeUnion(union) => union
            .variants
            .iter()
            .map(|variant| {
                Some(UnionVariantType {
                    tag: variant.tag.clone(),
                    payload: match &variant.payload_type {
                        Some(payload) => Some(boxed(payload)?),
                        None => None,
                    },
                })
            })
            .collect::<Option<Vec<_>>>()
            .map(PartType::Union),
        Expression::TypeFunction(function) => Some(PartType::Function {
            parameters: function
                .parameters
                .iter()
                .map(|parameter| {
                    Some(FunctionParameterType {
                        name: parameter.name.clone(),
                        r#type: boxed(&parameter.r#type)?,
                    })
                })
                .collect::<Option<Vec<_>>>()?,
            return_type: boxed(&function.return_type)?,
        }),
        Expression::PartReference(reference) => Some(PartType::TypePart(
            reference.part_definition_event_hash.clone(),
        )),
        _ => None,
    }
}

/// イベント列から求めた, あるパーツの最新の定義
#[derive(Debug, Clone)]
pub struct LatestPart {
    pub module_id: EventHashId,
    pub name: String,
    pub part_type: Option<PartType>,
    pub expression: Option<Expression>,
}

/// イベント列から, モジュールごとに最新のコミットのパーツを集める (キーはパーツ ID).
/// 式を content hash だけで持つパーツは, 他のイベントに埋め込まれた同じ式を探して埋める
pub fn latest_parts(
    events: &[crate::EventWithHash],
) -> std::collections::HashMap<EventHashId, LatestPart> {
    let mut commits = events
        .iter()
        .filter_map(|(_, event)| {
            let (_, event) = event.as_ref().ok()?;
            match &event.content {
                definy_event::event::EventContent::ModuleCommit(commit) => Some((event, commit)),
                _ => None,
            }
        })
        .collect::<Vec<_>>();
    commits.sort_by_key(|(event, _)| event.time);
    let mut module_parts =
        std::collections::HashMap::<EventHashId, Vec<(EventHashId, LatestPart)>>::new();
    for (event, commit) in commits {
        let module_id =
            definy_event::event::derive_module_id(&event.account_id, &commit.module_name);
        let parts = commit
            .parts
            .iter()
            .map(|part| {
                let part_id = definy_event::event::derive_module_part_id(&module_id, &part.name);
                let expression = part.expression.clone().or_else(|| {
                    let content_hash = part.resolve_content_hash()?;
                    crate::wasm_emitter::compiler::resolve_part_expression(
                        events,
                        &part_id,
                        Some(&content_hash),
                    )
                    .cloned()
                });
                (
                    part_id,
                    LatestPart {
                        module_id: module_id.clone(),
                        name: part.name.to_string(),
                        part_type: part.part_type.clone(),
                        expression,
                    },
                )
            })
            .collect();
        module_parts.insert(module_id, parts);
    }
    module_parts.into_values().flatten().collect()
}

/// モジュールのコミットを自己ホスト型チェッカーで検査する.
/// 型エラーがあれば, パーツごとの理由を改行でつないで返す.
/// 検査の内容は [`check_module_commit_parts`] を参照
pub fn check_module_commit(
    commit: &definy_event::event::ModuleCommitEvent,
    module_id: &EventHashId,
    previous_events: &[crate::EventWithHash],
    core: &SelfHostedCoreParts,
    allow_builtin_parts: bool,
) -> Result<(), String> {
    let errors = check_module_commit_parts(
        commit,
        module_id,
        previous_events,
        core,
        allow_builtin_parts,
    )
    .into_iter()
    .filter_map(|(name, outcome)| commit_error_message(&name, &outcome))
    .collect::<Vec<_>>();
    if errors.is_empty() {
        Ok(())
    } else {
        Err(errors.join("\n"))
    }
}

/// [`check_module_commit_parts`] の結果を, コミットを拒否する理由の 1 行にする. 問題なければ `None`
pub fn commit_error_message(name: &str, outcome: &SelfHostedTypeCheckOutcome) -> Option<String> {
    match outcome {
        SelfHostedTypeCheckOutcome::Ok => None,
        SelfHostedTypeCheckOutcome::TypeError(error) => {
            Some(format!("part '{name}': type error: {error}"))
        }
        SelfHostedTypeCheckOutcome::Unsupported(message) => {
            Some(format!("part '{name}': not supported: {message}"))
        }
        SelfHostedTypeCheckOutcome::CheckerFailed(message) => Some(format!(
            "part '{name}': type checker failed: {}",
            message.lines().next().unwrap_or_default()
        )),
    }
}

/// モジュールのコミットを自己ホスト型チェッカーで検査し, 検査したパーツの名前と結果を返す.
/// サーバーがコミットを受け付けるかの判定と, UI の変更ページのコミット前の検査が同じ関数を使う.
///
/// - 型環境は `previous_events` から求めた全モジュールの最新のパーツに, このコミットのパーツを重ねたもの
/// - パーツの型が 1 つも変わっていなければ, 式が変わったパーツ (と新しいパーツ) だけを検査する.
///   型が変わったら, それを参照するパーツに影響するのでモジュールの全パーツを検査する
/// - `allow_builtin_parts` が真なら, 式の無いパーツや `core.expression` で表せないパーツ
///   (コンパイラ組み込み) を検査せずに受け入れる (結果に含めない). システムアカウントのビルトインモジュール用
/// - `commit` のパーツの式が無く content hash だけのときは, `previous_events` に埋め込まれた同じ式で埋める
pub fn check_module_commit_parts(
    commit: &definy_event::event::ModuleCommitEvent,
    module_id: &EventHashId,
    previous_events: &[crate::EventWithHash],
    core: &SelfHostedCoreParts,
    allow_builtin_parts: bool,
) -> Vec<(String, SelfHostedTypeCheckOutcome)> {
    let mut parts = latest_parts(previous_events);
    let previous = parts
        .iter()
        .filter(|(_, part)| &part.module_id == module_id)
        .map(|(part_id, part)| (part_id.clone(), part.clone()))
        .collect::<std::collections::HashMap<_, _>>();
    parts.retain(|_, part| &part.module_id != module_id);
    let committed = commit
        .parts
        .iter()
        .map(|part| {
            let part_id = definy_event::event::derive_module_part_id(module_id, &part.name);
            let expression = part.expression.clone().or_else(|| {
                let content_hash = part.resolve_content_hash()?;
                crate::wasm_emitter::compiler::resolve_part_expression(
                    previous_events,
                    &part_id,
                    Some(&content_hash),
                )
                .cloned()
            });
            (
                part_id,
                LatestPart {
                    module_id: module_id.clone(),
                    name: part.name.to_string(),
                    part_type: part.part_type.clone(),
                    expression,
                },
            )
        })
        .collect::<Vec<_>>();
    for (part_id, part) in &committed {
        parts.insert(part_id.clone(), part.clone());
    }

    let types_changed = previous.len() != committed.len()
        || committed.iter().any(|(part_id, part)| {
            previous
                .get(part_id)
                .is_none_or(|previous| previous.part_type != part.part_type)
        });
    let mut results = Vec::new();
    let mut to_check = Vec::new();
    for (part_id, part) in &committed {
        let unchanged = previous
            .get(part_id)
            .is_some_and(|previous| previous.expression == part.expression);
        if !types_changed && unchanged {
            continue;
        }
        match (&part.expression, &part.part_type) {
            (Some(expression), Some(part_type)) => to_check.push((
                part.name.clone(),
                PartToCheck {
                    expression,
                    part_type,
                },
            )),
            _ if allow_builtin_parts => {}
            _ => results.push((
                part.name.clone(),
                SelfHostedTypeCheckOutcome::Unsupported("part has no expression or type".into()),
            )),
        }
    }
    if to_check.is_empty() {
        return results;
    }

    let env = parts
        .iter()
        .filter_map(|(part_id, part)| {
            let part_type = part.part_type.as_ref()?;
            Some(PartTypeEntry {
                part_definition_event_hash: part_id,
                part_type,
                type_declaration: (part_type == &PartType::Type)
                    .then_some(part.expression.as_ref())
                    .flatten(),
            })
        })
        .collect::<Vec<_>>();
    let outcomes = check_parts(
        &to_check.iter().map(|(_, part)| *part).collect::<Vec<_>>(),
        &env,
        core,
        previous_events,
    );
    results.extend(
        to_check
            .into_iter()
            .zip(outcomes)
            .filter(|(_, outcome)| {
                !(allow_builtin_parts
                    && matches!(outcome, SelfHostedTypeCheckOutcome::Unsupported(_)))
            })
            .map(|((name, _), outcome)| (name, outcome)),
    );
    results
}
