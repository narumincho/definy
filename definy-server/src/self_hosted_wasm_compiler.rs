//! definy の自己記述コンパイラ (`core.compile-to-wasm`) を呼び出し、
//! 任意の definy 式 AST から実行可能な WebAssembly バイナリを動的に生成するパイプライン。

use chrono::DateTime;
use definy_core::expression_eval::Value;
use definy_event::event::{
    AddExpression, CallArgument, CallExpression, Description, Event, EventContent, Expression,
    ModuleCommitEvent, NumberExpression, PartReferenceExpression, derive_module_id,
    derive_module_part_id,
};
use definy_event::{EventHashId, VerifyAndDeserializeError};

/// 自己記述コンパイラによる WebAssembly 生成時のエラー
#[derive(Debug)]
pub enum SelfHostedCompileError {
    AstConversion(String),
    Evaluation(String),
    InvalidOutput(Value),
    InvalidByteValue(i64),
    WasmExecution(String),
    PartNotFound(String),
    PartHasNoExpression(String),
}

impl std::fmt::Display for SelfHostedCompileError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::AstConversion(msg) => {
                write!(f, "AST conversion to self-hosted AST failed: {msg}")
            }
            Self::Evaluation(msg) => write!(f, "Failed to evaluate self-hosted compiler: {msg}"),
            Self::InvalidOutput(val) => {
                write!(
                    f,
                    "Invalid compiler output: expected list of numbers, got {val:?}"
                )
            }
            Self::InvalidByteValue(byte) => {
                write!(f, "Invalid byte value emitted by compiler: {byte}")
            }
            Self::WasmExecution(msg) => write!(f, "Failed to execute generated Wasm binary: {msg}"),
            Self::PartNotFound(id) => write!(f, "Part not found: {id}"),
            Self::PartHasNoExpression(id) => write!(f, "Part '{id}' does not have an expression"),
        }
    }
}

impl std::error::Error for SelfHostedCompileError {}

/// 検証済みのコミットイベント
pub type VerifiedCommitEvent = (
    EventHashId,
    Result<(ed25519_dalek::Signature, Event), VerifyAndDeserializeError>,
);

/// `core.compile-to-wasm` に渡す引数 (式の `core.expression` と, 参照するパーツのリスト) をリテラルの式として作る
pub fn self_hosted_compiler_input(
    expression: &Expression,
    events: &[VerifiedCommitEvent],
) -> Result<(Expression, Expression), SelfHostedCompileError> {
    let core_module_id = derive_module_id(&crate::seed::builtin_system_account_id(), "core");
    let expr_type_hash = derive_module_part_id(&core_module_id, "expression");
    let self_hosted_ast =
        definy_core::self_hosted_ast::expression_to_self_hosted_ast(expression, &expr_type_hash)
            .map_err(SelfHostedCompileError::AstConversion)?;
    let (parts, _) = referenced_parts_expression(expression, events, &expr_type_hash);
    Ok((self_hosted_ast, parts))
}

/// `self_hosted_compiler_input` と同じだが, definy 製コンパイラが正しくコンパイルできると分かる場合だけ返す.
/// 次の場合は `None` (Rust 製コンパイラにフォールバックする):
/// - 式か, 式がたどって参照するパーツが `core.expression` で表せない (ビット演算・型の式など)
/// - 参照するパーツが見つからないか, 式を持たない (コンパイラ組み込み). definy 製コンパイラはその参照を unreachable にする
/// - `core.compile-expr-instructions` が個別に扱わないタグ (`type_number` など) を含む. `_` アームで unreachable になる
fn checked_self_hosted_compiler_input(
    expression: &Expression,
    events: &[VerifiedCommitEvent],
) -> Option<(Expression, Expression)> {
    let core_module_id = derive_module_id(&crate::seed::builtin_system_account_id(), "core");
    let expr_type_hash = derive_module_part_id(&core_module_id, "expression");
    let self_hosted_ast =
        definy_core::self_hosted_ast::expression_to_self_hosted_ast(expression, &expr_type_hash)
            .ok()?;
    let (parts, complete) = referenced_parts_expression(expression, events, &expr_type_hash);
    if !complete {
        return None;
    }
    let supported = supported_expression_tags();
    let mut tags = Vec::new();
    collect_expression_tags(&self_hosted_ast, &expr_type_hash, &mut tags);
    collect_expression_tags(&parts, &expr_type_hash, &mut tags);
    tags.iter()
        .all(|tag| supported.contains(tag))
        .then_some((self_hosted_ast, parts))
}

/// `core.expression` の値 (リテラルの式) に現れるタグを集める
fn collect_expression_tags(
    expression: &Expression,
    expr_type_hash: &EventHashId,
    out: &mut Vec<String>,
) {
    fn walk(value: &serde_json::Value, expr_type_hash: &serde_json::Value, out: &mut Vec<String>) {
        match value {
            serde_json::Value::Object(fields) => {
                if let Some(variant) = fields.get("Variant")
                    && &variant["type_part_definition_event_hash"] == expr_type_hash
                    && let Some(tag) = variant["tag"].as_str()
                    && !out.iter().any(|existing| existing == tag)
                {
                    out.push(tag.to_string());
                }
                fields
                    .values()
                    .for_each(|value| walk(value, expr_type_hash, out));
            }
            serde_json::Value::Array(items) => items
                .iter()
                .for_each(|item| walk(item, expr_type_hash, out)),
            _ => {}
        }
    }
    if let (Ok(value), Ok(hash)) = (
        serde_json::to_value(expression),
        serde_json::to_value(expr_type_hash),
    ) {
        walk(&value, &hash, out);
    }
}

/// definy 製コンパイラ (`core.compile-expr-instructions`) が個別に扱う `core.expression` のタグ.
/// seed の `core.expression` に対する `match` のアームから読む. バリアントのペイロードを表す `some` / `none` も含める
fn supported_expression_tags() -> &'static [String] {
    static TAGS: std::sync::OnceLock<Vec<String>> = std::sync::OnceLock::new();
    TAGS.get_or_init(|| {
        fn find_expression_match(value: &serde_json::Value) -> Option<Vec<String>> {
            match value {
                serde_json::Value::Object(fields) => {
                    if let Some(serde_json::Value::Object(match_expression)) = fields.get("Match") {
                        let tags = match_expression["arms"]
                            .as_array()
                            .into_iter()
                            .flatten()
                            .filter_map(|arm| arm["tag"].as_str())
                            .map(str::to_string)
                            .collect::<Vec<_>>();
                        if tags.iter().any(|tag| tag == "number")
                            && tags.iter().any(|tag| tag == "add")
                        {
                            return Some(tags.into_iter().filter(|tag| tag != "_").collect());
                        }
                    }
                    fields.values().find_map(find_expression_match)
                }
                serde_json::Value::Array(items) => items.iter().find_map(find_expression_match),
                _ => None,
            }
        }
        let mut tags = crate::seed::find_builtin_part("compile-expr-instructions")
            .and_then(|part| part.expression.as_ref())
            .and_then(|expression| serde_json::to_value(expression).ok())
            .and_then(|value| find_expression_match(&value))
            .unwrap_or_default();
        tags.extend(["some".to_string(), "none".to_string()]);
        tags
    })
}

/// definy 製コンパイラを definy 製コンパイラ自身 (stage0: Rust 製の評価器の上で動かす) で Wasm にする.
/// できたモジュールは `definy_core::self_hosted_compiler_module::CompilerModule` で動かせる
pub fn build_self_hosted_compiler_wasm(
    events: &[VerifiedCommitEvent],
) -> Result<Vec<u8>, SelfHostedCompileError> {
    let core_module_id = derive_module_id(&crate::seed::builtin_system_account_id(), "core");
    compile_with_self_hosted_compiler(
        &Expression::PartReference(PartReferenceExpression::new(derive_module_part_id(
            &core_module_id,
            "compile-to-wasm",
        ))),
        events,
    )
}

/// Wasm にした definy 製コンパイラで式をコンパイルする. 入力は `compile_with_self_hosted_compiler` と同じ
pub fn compile_with_compiler_module(
    compiler: &definy_core::self_hosted_compiler_module::CompilerModule,
    expression: &Expression,
    events: &[VerifiedCommitEvent],
) -> Result<Vec<u8>, SelfHostedCompileError> {
    let (self_hosted_ast, parts) = self_hosted_compiler_input(expression, events)?;
    compiler
        .compile(&self_hosted_ast, &parts)
        .map_err(SelfHostedCompileError::WasmExecution)
}

/// 式が (たどって) 参照するパーツを `events` から集め, `core.compile-to-wasm` に渡す
/// `list<{ id: string, expression: core.expression }>` の式にする.
/// 式を持たないパーツ (コンパイラ組み込み) や `core.expression` で表せないパーツは入れない
/// (definy 製コンパイラはそのパーツへの参照を unreachable にする). 入れなかったパーツがあれば 2 つ目が `false`
fn referenced_parts_expression(
    expression: &Expression,
    events: &[VerifiedCommitEvent],
    expr_type_hash: &EventHashId,
) -> (Expression, bool) {
    let mut queue = Vec::new();
    collect_part_references(expression, &mut queue);
    let mut seen = Vec::<EventHashId>::new();
    let mut items = Vec::new();
    let mut complete = true;
    while let Some(part_id) = queue.pop() {
        if seen.contains(&part_id) {
            continue;
        }
        seen.push(part_id.clone());
        let Some(part_expression) =
            definy_core::wasm_emitter::compiler::resolve_part_expression(events, &part_id, None)
        else {
            complete = false;
            continue;
        };
        collect_part_references(part_expression, &mut queue);
        let Ok(ast) = definy_core::self_hosted_ast::expression_to_self_hosted_ast(
            part_expression,
            expr_type_hash,
        ) else {
            complete = false;
            continue;
        };
        items.push(Expression::TypeLiteral(
            definy_event::event::TypeLiteralExpression {
                items: vec![
                    definy_event::event::TypeLiteralItemExpression {
                        key: "id".into(),
                        value: Box::new(Expression::String(
                            definy_event::event::StringExpression {
                                value: part_id.to_string().into(),
                            },
                        )),
                    },
                    definy_event::event::TypeLiteralItemExpression {
                        key: "expression".into(),
                        value: Box::new(ast),
                    },
                ],
            },
        ));
    }
    (
        Expression::ListLiteral(definy_event::event::ListLiteralExpression { items }),
        complete,
    )
}

/// definy 製コンパイラを構成する core のパーツ. `core.compile-to-wasm` からパーツ参照をたどって集める
pub fn self_hosted_compiler_parts() -> Vec<definy_event::event::ModulePartEntry> {
    let account = crate::seed::builtin_system_account_id();
    let core_module_id = derive_module_id(&account, "core");
    let core_parts = crate::seed::get_builtin_module_seeds()
        .iter()
        .find(|seed| &*seed.module_name == "core")
        .map(|seed| seed.parts.as_slice())
        .unwrap_or_default();
    let mut collected = Vec::<definy_event::event::ModulePartEntry>::new();
    let mut queue = vec![derive_module_part_id(&core_module_id, "compile-to-wasm")];
    while let Some(part_id) = queue.pop() {
        let Some(part) = core_parts
            .iter()
            .find(|part| derive_module_part_id(&core_module_id, &part.name) == part_id)
        else {
            continue;
        };
        if collected.iter().any(|existing| existing.name == part.name) {
            continue;
        }
        if let Some(expression) = &part.expression {
            collect_part_references(expression, &mut queue);
        }
        collected.push(part.clone());
    }
    collected
}

fn collect_part_references(expression: &Expression, out: &mut Vec<EventHashId>) {
    // 式の種類が多いので serde の表現をたどる
    fn walk(value: &serde_json::Value, out: &mut Vec<EventHashId>) {
        match value {
            serde_json::Value::Object(fields) => {
                if let Some(reference) = fields.get("PartReference")
                    && let Ok(hash) = serde_json::from_value::<EventHashId>(
                        reference["part_definition_event_hash"].clone(),
                    )
                {
                    out.push(hash);
                }
                fields.values().for_each(|value| walk(value, out));
            }
            serde_json::Value::Array(items) => items.iter().for_each(|item| walk(item, out)),
            _ => {}
        }
    }
    if let Ok(value) = serde_json::to_value(expression) {
        walk(&value, out);
    }
}

/// 自己記述コンパイラパーツ (`core.compile-to-wasm`) によるメタ循環コンパイルを試行します。
///
/// Rust 製コンパイラへのフォールバックはしません. definy 製コンパイラが対応していない式も
/// エラーにならず誤った Wasm になることがあるので, 結果は実行して確かめてください
/// (`tests/self_hosted_compiler_coverage.rs`)
///
/// `events` は式が参照するパーツを探すのに使う. 参照をたどって集めたパーツを `core.compile-to-wasm` に渡す
pub fn compile_with_self_hosted_compiler(
    expression: &Expression,
    events: &[VerifiedCommitEvent],
) -> Result<Vec<u8>, SelfHostedCompileError> {
    // seed JSON 内のパーツ参照ハッシュはビルトインシステムアカウントの core モジュールを前提とする
    let dummy_account = crate::seed::builtin_system_account_id();
    let core_module_id = derive_module_id(&dummy_account, "core");

    let compile_to_wasm_hash = derive_module_part_id(&core_module_id, "compile-to-wasm");

    let (self_hosted_ast, referenced_parts) = self_hosted_compiler_input(expression, events)?;
    let parts = self_hosted_compiler_parts();

    // 評価器で直接参照可能なコミットイベント列を構築
    let dummy_commit_hash = EventHashId::from_bytes(&[200u8; 32]);
    let dummy_sig = ed25519_dalek::Signature::from_bytes(&[0u8; 64]);
    let compiler_events: Vec<VerifiedCommitEvent> = vec![(
        dummy_commit_hash,
        Ok((
            dummy_sig,
            Event {
                account_id: dummy_account,
                time: DateTime::UNIX_EPOCH,
                content: EventContent::ModuleCommit(ModuleCommitEvent {
                    module_name: "core".into(),
                    module_description: Description::Plain("Self-hosted compiler pipeline".into()),
                    parent_commit_hash: None,
                    message: "Self-hosted compiler commit".into(),
                    parts,
                }),
            },
        )),
    )];

    // compile-to-wasm(self_hosted_ast) の呼び出し式を作成
    let call_expr = Expression::Call(CallExpression {
        function: Box::new(Expression::PartReference(PartReferenceExpression::new(
            compile_to_wasm_hash,
        ))),
        arguments: vec![
            CallArgument {
                name: "expr".into(),
                value: Box::new(self_hosted_ast),
            },
            CallArgument {
                name: "parts".into(),
                value: Box::new(referenced_parts),
            },
        ],
    });

    // definy 実行系上で自己記述コンパイラを実行
    let evaluated_val = definy_core::evaluate_expression(&call_expr, &compiler_events)
        .map_err(|e| SelfHostedCompileError::Evaluation(format!("{e:?}")))?;

    // 戻り値 list<number> をバイト列 Vec<u8> に変換
    let Value::List(items) = evaluated_val else {
        return Err(SelfHostedCompileError::InvalidOutput(evaluated_val));
    };

    let mut wasm_bytes = Vec::with_capacity(items.len());
    for item in items {
        match item {
            Value::Number(n) if (0..=255).contains(&n) => {
                wasm_bytes.push(n as u8);
            }
            Value::Number(n) => return Err(SelfHostedCompileError::InvalidByteValue(n)),
            other => return Err(SelfHostedCompileError::InvalidOutput(other)),
        }
    }

    Ok(wasm_bytes)
}

/// stage1 (Wasm にした definy 製コンパイラ) のキャッシュのキー.
/// definy 製コンパイラを構成するパーツ (`self_hosted_compiler_parts`) の CBOR の content hash で,
/// パーツが変わると stage1 も変わるのでキーも変わる. DB の `contents` にはこのキーで stage1 を置く
pub fn self_hosted_compiler_cache_key() -> &'static str {
    static KEY: std::sync::OnceLock<String> = std::sync::OnceLock::new();
    KEY.get_or_init(|| {
        let parts = serde_cbor::to_vec(&self_hosted_compiler_parts()).unwrap_or_default();
        format!(
            "self-hosted-compiler-stage1:{}",
            definy_event::ContentHash::from_bytes(&parts)
        )
    })
}

/// プロセス内でキャッシュした stage1
struct Stage1 {
    wasm: Vec<u8>,
    compiler: definy_core::self_hosted_compiler_module::CompilerModule,
}

static STAGE1: std::sync::OnceLock<Result<Stage1, String>> = std::sync::OnceLock::new();
static STAGE1_PREPARATION_STARTED: std::sync::atomic::AtomicBool =
    std::sync::atomic::AtomicBool::new(false);

/// stage1 の Wasm を読み込み, サンプルの式 (`15 + 27`) を正しくコンパイルできるか確かめる
fn load_stage1(wasm: Vec<u8>) -> Result<Stage1, String> {
    let compiler = definy_core::self_hosted_compiler_module::CompilerModule::new(&wasm)?;
    let sample = compile_with_compiler_module(&compiler, &default_sample_expression(), &[])
        .map_err(|error| error.to_string())?;
    match definy_core::wasm_emitter::execute_wasm(&sample) {
        Ok(Value::Number(42)) => Ok(Stage1 { wasm, compiler }),
        other => Err(format!("stage1 compiled 15 + 27 incorrectly: {other:?}")),
    }
}

fn stage1() -> &'static Result<Stage1, String> {
    STAGE1.get_or_init(|| {
        let events = crate::builtin_migration::build_builtin_verified_events();
        build_self_hosted_compiler_wasm(&events)
            .map_err(|error| error.to_string())
            .and_then(load_stage1)
    })
}

/// stage1 を返す. まだ無ければ作る (debug ビルドで十数秒かかる) ので, 作り終わるまで待つ.
/// 作るのに失敗したらそのエラーを返し続ける
pub fn self_hosted_compiler()
-> Result<&'static definy_core::self_hosted_compiler_module::CompilerModule, SelfHostedCompileError>
{
    stage1()
        .as_ref()
        .map(|stage1| &stage1.compiler)
        .map_err(|error| SelfHostedCompileError::WasmExecution(error.clone()))
}

/// stage1 ができていれば返す. 待たない
pub fn ready_self_hosted_compiler()
-> Option<&'static definy_core::self_hosted_compiler_module::CompilerModule> {
    STAGE1.get()?.as_ref().ok().map(|stage1| &stage1.compiler)
}

/// stage1 の Wasm (できていれば). DB に保存するのに使う
pub fn self_hosted_compiler_wasm() -> Option<&'static [u8]> {
    STAGE1
        .get()?
        .as_ref()
        .ok()
        .map(|stage1| stage1.wasm.as_slice())
}

/// 保存しておいた stage1 の Wasm をプロセス内のキャッシュに入れる.
/// 読み込めないかサンプルの式を正しくコンパイルできなければエラー. 既にキャッシュがあれば何もしない
pub fn install_self_hosted_compiler_wasm(wasm: Vec<u8>) -> Result<(), String> {
    let stage1 = load_stage1(wasm)?;
    let _ = STAGE1.set(Ok(stage1));
    Ok(())
}

/// サーバーの起動時に呼ぶ. stage1 を DB (`contents` の `self_hosted_compiler_cache_key`) から読むか,
/// 無ければ作って DB に保存する. 2 回目以降の呼び出しは何もしない.
/// 用意できるまでの `compile_expression_to_wasm` は Rust 製コンパイラを使う
pub async fn prepare_self_hosted_compiler(
    db: Option<surrealdb::Surreal<surrealdb::engine::any::Any>>,
) {
    if STAGE1_PREPARATION_STARTED.swap(true, std::sync::atomic::Ordering::SeqCst) {
        return;
    }
    let key = self_hosted_compiler_cache_key();
    if let Some(db) = &db
        && let Ok(Some(wasm)) = crate::db::get_content(db, key).await
    {
        match tokio::task::spawn_blocking(move || install_self_hosted_compiler_wasm(wasm)).await {
            Ok(Ok(())) => {
                println!("Loaded self-hosted compiler (stage1) from database: {key}");
                return;
            }
            Ok(Err(error)) => {
                eprintln!(
                    "WARNING: Cached self-hosted compiler is unusable ({error}). Rebuilding."
                );
            }
            Err(error) => eprintln!("WARNING: Failed to load self-hosted compiler: {error}"),
        }
    }
    let started = std::time::Instant::now();
    let built = tokio::task::spawn_blocking(|| {
        self_hosted_compiler()
            .map(|_| ())
            .map_err(|e| e.to_string())
    })
    .await
    .unwrap_or_else(|error| Err(error.to_string()));
    if let Err(error) = built {
        eprintln!("WARNING: Failed to build self-hosted compiler (stage1): {error}");
        return;
    }
    println!(
        "Built self-hosted compiler (stage1) in {:?}: {key}",
        started.elapsed()
    );
    if let Some(db) = &db
        && let Some(wasm) = self_hosted_compiler_wasm()
        && let Err(error) = crate::db::save_content(db, key, wasm).await
    {
        eprintln!("WARNING: Failed to save self-hosted compiler to database: {error}");
    }
}

/// `compile_expression_to_wasm` がどちらのコンパイラを使ったか
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum UsedCompiler {
    /// definy 製コンパイラ (stage1)
    SelfHosted,
    /// Rust 製コンパイラ (`definy_core::wasm_emitter`)
    Rust,
}

/// 任意の definy 式 (`Expression`) を、実行可能な WebAssembly バイナリ (`Vec<u8>`) にコンパイルします。
/// `events` は式が参照するパーツを探すのに使う.
///
/// stage1 (Wasm にした definy 製コンパイラ) ができていればそれを使う. stage1 がまだ無い場合
/// (`prepare_self_hosted_compiler` が終わっていない) や, definy 製コンパイラが正しくコンパイルできない式
/// (`checked_self_hosted_compiler_input` が `None`) は Rust 製コンパイラでコンパイルする.
/// 出力の値の箱の形は同じなので, どちらでも同じように実行できる
pub fn compile_expression_to_wasm(
    expression: &Expression,
    events: &[VerifiedCommitEvent],
) -> Result<Vec<u8>, SelfHostedCompileError> {
    compile_expression_to_wasm_with(ready_self_hosted_compiler(), expression, events)
        .map(|(bytes, _)| bytes)
}

/// `compile_expression_to_wasm` の中身. 使う stage1 を渡し, どちらのコンパイラを使ったかも返す
pub fn compile_expression_to_wasm_with(
    compiler: Option<&definy_core::self_hosted_compiler_module::CompilerModule>,
    expression: &Expression,
    events: &[VerifiedCommitEvent],
) -> Result<(Vec<u8>, UsedCompiler), SelfHostedCompileError> {
    if let Some(compiler) = compiler
        && let Some((self_hosted_ast, parts)) =
            checked_self_hosted_compiler_input(expression, events)
    {
        match compiler.compile(&self_hosted_ast, &parts) {
            Ok(bytes) => return Ok((bytes, UsedCompiler::SelfHosted)),
            Err(error) => eprintln!(
                "WARNING: Self-hosted compiler failed ({error}). Falling back to the Rust compiler."
            ),
        }
    }
    definy_core::wasm_emitter::compile_expression_to_wasm(expression, events)
        .map(|bytes| (bytes, UsedCompiler::Rust))
        .map_err(SelfHostedCompileError::Evaluation)
}

/// コミットイベント群から指定されたパーツ ID (hex/base64 文字列、`module.part`、またはパーツ名) に一致する Expression を探索します。
pub fn find_part_expression_in_events(
    part_id: &str,
    events: &[VerifiedCommitEvent],
) -> Result<Expression, SelfHostedCompileError> {
    definy_core::http_app::find_part_expression(part_id, events).map_err(|message| {
        if message.starts_with("Part not found") {
            SelfHostedCompileError::PartNotFound(part_id.trim().to_string())
        } else {
            SelfHostedCompileError::PartHasNoExpression(part_id.trim().to_string())
        }
    })
}

/// シリアライズされた署名付きイベント列バイトからパーツの Expression を探索します。
pub fn find_part_expression_in_signed_events(
    part_id: &str,
    event_binaries: &[Vec<u8>],
) -> Result<Expression, SelfHostedCompileError> {
    let trimmed = part_id.trim();
    for bytes in event_binaries.iter().rev() {
        if let Ok((_sig, event)) = definy_event::verify_and_deserialize(bytes)
            && let EventContent::ModuleCommit(ref mc) = event.content
        {
            let module_id = derive_module_id(&event.account_id, &mc.module_name);
            for part in &mc.parts {
                let derived_part_id = derive_module_part_id(&module_id, &part.name);
                let qualified_name = format!("{}.{}", mc.module_name, part.name);
                if derived_part_id.to_string() == trimmed
                    || part.name.as_ref() == trimmed
                    || qualified_name == trimmed
                {
                    if let Some(ref expr) = part.expression {
                        return Ok(expr.clone());
                    } else {
                        return Err(SelfHostedCompileError::PartHasNoExpression(
                            trimmed.to_string(),
                        ));
                    }
                }
            }
        }
    }
    Err(SelfHostedCompileError::PartNotFound(trimmed.to_string()))
}

pub use definy_core::http_app::{
    build_byte_stream_expression, build_http_request_record_expression,
};

/// HTTP リクエストを受け取るパーツ（またはハンドラ式）にリクエストを適用する式を、Wasm にコンパイルします。
///
/// 実行は wasmtime（`execute_wasm_http_response`）でも wasmi（Cloudflare Workers 向け）でもできます。
pub fn compile_http_request_to_wasm(
    expression: &Expression,
    events: &[VerifiedCommitEvent],
    method: &str,
    url: &str,
    headers: &[(String, String)],
    body_bytes: &[u8],
) -> Result<Vec<u8>, SelfHostedCompileError> {
    definy_core::http_app::compile_http_request_to_wasm(
        expression, events, method, url, headers, body_bytes,
    )
    .map_err(SelfHostedCompileError::Evaluation)
}

/// パーツ式 (`Expression`) を全イベントコンテキスト付きで HTTP リクエストに対して評価し、
/// ステータス・ヘッダー・Pull 型ボディストリーム (`EvaluatedHttpResponse`) を返します。
pub fn evaluate_part_expression_for_http_request_stream(
    expression: &Expression,
    events: &[VerifiedCommitEvent],
    method: &str,
    url: &str,
    headers: &[(String, String)],
    body_bytes: &[u8],
) -> Result<definy_core::wasm_emitter::EvaluatedHttpResponse, SelfHostedCompileError> {
    let wasm_bytes =
        compile_http_request_to_wasm(expression, events, method, url, headers, body_bytes)?;
    definy_core::wasm_emitter::execute_wasm_http_response(&wasm_bytes)
        .map_err(SelfHostedCompileError::WasmExecution)
}

/// 自己記述コンパイラのデフォルト検証用サンプル式 (`15 + 27 = 42`) を生成します。
pub fn default_sample_expression() -> Expression {
    Expression::Add(AddExpression {
        left: Box::new(Expression::Number(NumberExpression { value: 15 })),
        right: Box::new(Expression::Number(NumberExpression { value: 27 })),
    })
}

/// デフォルトサンプル式を自己記述コンパイラでコンパイルし、Wasm バイト列を生成します。
pub fn compile_sample_to_wasm() -> Result<Vec<u8>, SelfHostedCompileError> {
    let expr = default_sample_expression();
    compile_expression_to_wasm(&expr, &[])
}

/// 生成された Wasm バイナリを検証のために実行し、戻り値 Value (文字列、数値、レコード、真偽値等) を取得します。
pub fn evaluate_compiled_wasm(wasm_bytes: &[u8]) -> Result<Value, SelfHostedCompileError> {
    definy_core::wasm_emitter::execute_wasm(wasm_bytes)
        .map_err(|e| SelfHostedCompileError::WasmExecution(format!("{e:?}")))
}

/// 生成された Wasm バイナリを検証のために実行し、エクスポート関数の数値返り値を取得します。
pub fn execute_compiled_wasm(wasm_bytes: &[u8]) -> Result<i64, SelfHostedCompileError> {
    let result = evaluate_compiled_wasm(wasm_bytes)?;

    match result {
        Value::Number(n) => Ok(n),
        other => Err(SelfHostedCompileError::WasmExecution(format!(
            "Expected number return value from wasm main(), got {other:?}"
        ))),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_compile_sample_expression_pipeline() {
        let wasm_bytes =
            compile_sample_to_wasm().expect("Self-hosted compiler should succeed for sample expr");
        assert!(!wasm_bytes.is_empty());
        assert_eq!(&wasm_bytes[0..4], b"\0asm");

        let ret = execute_compiled_wasm(&wasm_bytes)
            .expect("Wasm execution should succeed and return 42");
        assert_eq!(ret, 42);
    }

    #[test]
    fn test_compile_custom_arithmetic_expression() {
        // (10 * 5) - (8 / 2) = 50 - 4 = 46
        let expr = Expression::Subtract(definy_event::event::SubtractExpression {
            left: Box::new(Expression::Multiply(
                definy_event::event::MultiplyExpression {
                    left: Box::new(Expression::Number(NumberExpression { value: 10 })),
                    right: Box::new(Expression::Number(NumberExpression { value: 5 })),
                },
            )),
            right: Box::new(Expression::Divide(definy_event::event::DivideExpression {
                left: Box::new(Expression::Number(NumberExpression { value: 8 })),
                right: Box::new(Expression::Number(NumberExpression { value: 2 })),
            })),
        });

        let wasm_bytes = compile_expression_to_wasm(&expr, &[])
            .expect("Custom arithmetic expression compilation failed");
        let ret =
            execute_compiled_wasm(&wasm_bytes).expect("Custom arithmetic wasm execution failed");
        assert_eq!(ret, 46);
    }

    #[tokio::test]
    #[ignore = "requires live CLOUDFLARE_API_TOKEN"]
    async fn test_live_self_hosted_compiler_deploy_to_cloudflare() {
        let token = std::env::var("CLOUDFLARE_API_TOKEN")
            .or_else(|_| std::env::var("CF_API_TOKEN"))
            .expect("CLOUDFLARE_API_TOKEN required");
        let wasm_bytes = compile_sample_to_wasm().expect("Self-hosted compiler failed");
        assert_eq!(execute_compiled_wasm(&wasm_bytes).unwrap(), 42);

        let config = crate::cloudflare_workers::CloudflareWorkersConfig::new(token);
        let client = crate::cloudflare_workers::CloudflareWorkersClient::new(config);

        let res = client
            .deploy(Some("definy-self-hosted-edge"), Some(&wasm_bytes), None)
            .await
            .expect("Live deploy to Cloudflare Workers should succeed");

        println!("Deployed successfully! URL: {}", res.url);

        let http_client = reqwest::Client::new();
        let eval_res: serde_json::Value = http_client
            .get(&res.url)
            .send()
            .await
            .expect("Failed to query worker endpoint")
            .json()
            .await
            .expect("Failed to parse JSON from worker");

        println!("Worker response: {:?}", eval_res);
        assert_eq!(eval_res["service"], "definy-cloudflare-workers");
        assert_eq!(eval_res["evaluatedResult"], 42);
    }

    #[test]
    fn test_find_and_compile_part_expression() {
        let dummy_key = ed25519_dalek::VerifyingKey::from_bytes(&[1u8; 32]).unwrap();
        let dummy_account = definy_event::event::AccountId(dummy_key);
        let mod_id = derive_module_id(&dummy_account, "math_module");

        let part_name = "calculate_answer";
        let part_id = derive_module_part_id(&mod_id, part_name);

        let part_expr = Expression::Multiply(definy_event::event::MultiplyExpression {
            left: Box::new(Expression::Number(NumberExpression { value: 6 })),
            right: Box::new(Expression::Number(NumberExpression { value: 7 })),
        });

        let part = definy_event::event::ModulePartEntry {
            name: part_name.into(),
            part_type: None,
            description: Description::Plain("Calculate 6 * 7".into()),
            content_hash: None,
            expression: Some(part_expr),
        };

        let event = Event {
            account_id: dummy_account,
            time: DateTime::UNIX_EPOCH,
            content: EventContent::ModuleCommit(ModuleCommitEvent {
                module_name: "math_module".into(),
                module_description: Description::Plain("Math utilities".into()),
                parent_commit_hash: None,
                message: "Initial commit".into(),
                parts: vec![part],
            }),
        };

        let dummy_sig = ed25519_dalek::Signature::from_bytes(&[0u8; 64]);
        let events = vec![(EventHashId::from_bytes(&[10u8; 32]), Ok((dummy_sig, event)))];

        // 1. By derived part ID
        let found_expr = find_part_expression_in_events(&part_id.to_string(), &events)
            .expect("Should find expression by part_id");
        let wasm_bytes = compile_expression_to_wasm(&found_expr, &events)
            .expect("Should compile found expression to Wasm");
        assert_eq!(execute_compiled_wasm(&wasm_bytes).unwrap(), 42);

        // 2. By part name
        let found_by_name = find_part_expression_in_events(part_name, &events)
            .expect("Should find expression by part name");
        assert_eq!(found_expr, found_by_name);

        // 3. Not found case
        assert!(find_part_expression_in_events("non_existent_part", &events).is_err());
    }

    #[test]
    fn test_compile_string_expression_for_http_response() {
        let html_content = "<h1>Hello from definy Web Handler!</h1>";
        let expr = Expression::String(definy_event::event::StringExpression {
            value: html_content.into(),
        });

        let wasm_bytes = compile_expression_to_wasm(&expr, &[])
            .expect("Should compile string expression to Wasm");
        assert!(!wasm_bytes.is_empty());

        let result = evaluate_compiled_wasm(&wasm_bytes)
            .expect("Should evaluate string Wasm and return Value::String");
        assert_eq!(result, Value::String(html_content.to_string()));
    }

    #[test]
    fn test_compile_record_expression_for_http_response() {
        // Record expression: { status: 200, body: "OK" }
        let expr = Expression::TypeLiteral(definy_event::event::TypeLiteralExpression {
            items: vec![
                definy_event::event::TypeLiteralItemExpression {
                    key: "status".into(),
                    value: Box::new(Expression::Number(NumberExpression { value: 200 })),
                },
                definy_event::event::TypeLiteralItemExpression {
                    key: "body".into(),
                    value: Box::new(Expression::String(definy_event::event::StringExpression {
                        value: "OK".into(),
                    })),
                },
            ],
        });

        let wasm_bytes = compile_expression_to_wasm(&expr, &[])
            .expect("Should compile record expression to Wasm");
        assert!(!wasm_bytes.is_empty());

        let result = evaluate_compiled_wasm(&wasm_bytes)
            .expect("Should evaluate record Wasm and return Value::Record");
        match result {
            Value::Record(fields) => {
                let status_field = fields.iter().find(|(k, _)| k == "status").map(|(_, v)| v);
                let body_field = fields.iter().find(|(k, _)| k == "body").map(|(_, v)| v);
                assert_eq!(status_field, Some(&Value::Number(200)));
                assert_eq!(body_field, Some(&Value::String("OK".to_string())));
            }
            other => panic!("Expected Value::Record, got {other:?}"),
        }
    }

    #[test]
    fn test_compile_variant_expression_for_http_response() {
        // 1. Variant with payload: Result::Ok(200) -> Variant { tag: "ok", payload: Some(Number(200)) }
        let ok_expr = Expression::Variant(definy_event::event::VariantExpression {
            tag: "ok".into(),
            payload: Some(Box::new(Expression::Number(NumberExpression {
                value: 200,
            }))),
            type_part_definition_event_hash: None,
        });

        let wasm_bytes = compile_expression_to_wasm(&ok_expr, &[])
            .expect("Should compile variant with payload to Wasm");
        assert!(!wasm_bytes.is_empty());

        let result = evaluate_compiled_wasm(&wasm_bytes)
            .expect("Should evaluate variant Wasm and return Value::Variant");
        assert_eq!(
            result,
            Value::Variant {
                tag: "ok".to_string(),
                payload: Some(Box::new(Value::Number(200))),
            }
        );

        // 2. Variant without payload: Option::None -> Variant { tag: "none", payload: None }
        let none_expr = Expression::Variant(definy_event::event::VariantExpression {
            tag: "none".into(),
            payload: None,
            type_part_definition_event_hash: None,
        });

        let wasm_bytes = compile_expression_to_wasm(&none_expr, &[])
            .expect("Should compile variant without payload to Wasm");
        assert!(!wasm_bytes.is_empty());

        let result = evaluate_compiled_wasm(&wasm_bytes)
            .expect("Should evaluate variant Wasm and return Value::Variant");
        assert_eq!(
            result,
            Value::Variant {
                tag: "none".to_string(),
                payload: None,
            }
        );
    }

    #[test]
    fn test_compile_let_and_variable_expression() {
        // let a = 10, b = 25;
        // a + b = 35
        let expr = Expression::Let(definy_event::event::LetExpression {
            bindings: vec![
                definy_event::event::LetBinding {
                    variable_id: 0,
                    variable_name: "a".into(),
                    value: Box::new(Expression::Number(NumberExpression { value: 10 })),
                },
                definy_event::event::LetBinding {
                    variable_id: 1,
                    variable_name: "b".into(),
                    value: Box::new(Expression::Number(NumberExpression { value: 25 })),
                },
            ],
            body: Box::new(Expression::Add(AddExpression {
                left: Box::new(Expression::Variable(
                    definy_event::event::VariableExpression { variable_id: 0 },
                )),
                right: Box::new(Expression::Variable(
                    definy_event::event::VariableExpression { variable_id: 1 },
                )),
            })),
        });

        let wasm_bytes = compile_expression_to_wasm(&expr, &[])
            .expect("Should compile let and variable expression to Wasm");
        assert!(!wasm_bytes.is_empty());

        let result =
            execute_compiled_wasm(&wasm_bytes).expect("Should execute compiled Wasm and return 35");
        assert_eq!(result, 35);
    }

    /// サーバーの起動時の準備で stage1 が DB に保存され, 保存したものを読み込める
    #[tokio::test]
    async fn test_prepare_self_hosted_compiler_saves_stage1_to_database() {
        let db = crate::db::init_db_with_config(None)
            .await
            .expect("in-memory db");
        prepare_self_hosted_compiler(Some(db.clone())).await;
        assert!(ready_self_hosted_compiler().is_some());

        let saved = crate::db::get_content(&db, self_hosted_compiler_cache_key())
            .await
            .expect("get content")
            .expect("stage1 is saved");
        assert_eq!(&saved[0..4], b"\0asm");
        install_self_hosted_compiler_wasm(saved).expect("saved stage1 is usable");
        assert!(install_self_hosted_compiler_wasm(b"\0asm".to_vec()).is_err());
    }
}
