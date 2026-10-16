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
