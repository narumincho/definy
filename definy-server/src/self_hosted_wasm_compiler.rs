//! definy の自己記述コンパイラ (`core.compile-to-wasm`) を呼び出し、
//! 任意の definy 式 AST から実行可能な WebAssembly バイナリを動的に生成するパイプライン。

use chrono::DateTime;
use definy_core::expression_eval::Value;
use definy_event::event::{
    AccountId, AddExpression, CallArgument, CallExpression, Description, Event, EventContent,
    Expression, ModuleCommitEvent, NumberExpression, PartReferenceExpression, derive_module_id,
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

/// 自己記述コンパイラパーツ (`core.compile-to-wasm`) によるメタ循環コンパイルを試行します。
fn try_compile_via_self_hosted(expression: &Expression) -> Result<Vec<u8>, SelfHostedCompileError> {
    // 決定論的なダミーアカウントと core モジュール ID を準備
    let dummy_key = ed25519_dalek::VerifyingKey::from_bytes(&[0u8; 32])
        .map_err(|e| SelfHostedCompileError::Evaluation(format!("invalid dummy key: {e}")))?;
    let dummy_account = AccountId(dummy_key);
    let core_module_id = derive_module_id(&dummy_account, "core");

    let expr_type_hash = derive_module_part_id(&core_module_id, "expression");
    let compile_to_wasm_hash = derive_module_part_id(&core_module_id, "compile-to-wasm");

    // 式を definy の自己記述 AST 直和型 (core.expression Variant) に変換
    let self_hosted_ast =
        crate::self_hosted_ast::expression_to_self_hosted_ast(expression, &expr_type_hash)
            .map_err(SelfHostedCompileError::AstConversion)?;

    // 自己記述コンパイラパーツを準備
    let compile_instr_part =
        crate::builtin_wasm_compiler::create_compile_expr_instructions_part(&core_module_id);
    let compile_to_wasm_part =
        crate::builtin_wasm_compiler::create_compile_to_wasm_part(&core_module_id);

    let parts = vec![compile_instr_part, compile_to_wasm_part];

    // 評価器で直接参照可能なコミットイベント列を構築
    let dummy_commit_hash = EventHashId::from_bytes(&[200u8; 32]);
    let dummy_sig = ed25519_dalek::Signature::from_bytes(&[0u8; 64]);
    let events: Vec<VerifiedCommitEvent> = vec![(
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
        arguments: vec![CallArgument {
            name: "expr".into(),
            value: Box::new(self_hosted_ast),
        }],
    });

    // definy 実行系上で自己記述コンパイラを実行
    let evaluated_val = definy_core::evaluate_expression(&call_expr, &events)
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

/// 式が現在の自己記述コンパイラ (`core.compile-expr-instructions`) で対応している構文のみで構成されているか判定します。
pub fn is_supported_by_self_hosted_compiler(expr: &Expression) -> bool {
    match expr {
        Expression::Number(_) | Expression::Boolean(_) | Expression::String(_) => true,
        Expression::Add(e) => {
            is_supported_by_self_hosted_compiler(&e.left)
                && is_supported_by_self_hosted_compiler(&e.right)
        }
        Expression::Subtract(e) => {
            is_supported_by_self_hosted_compiler(&e.left)
                && is_supported_by_self_hosted_compiler(&e.right)
        }
        Expression::Multiply(e) => {
            is_supported_by_self_hosted_compiler(&e.left)
                && is_supported_by_self_hosted_compiler(&e.right)
        }
        Expression::Divide(e) => {
            is_supported_by_self_hosted_compiler(&e.left)
                && is_supported_by_self_hosted_compiler(&e.right)
        }
        Expression::Remainder(e) => {
            is_supported_by_self_hosted_compiler(&e.left)
                && is_supported_by_self_hosted_compiler(&e.right)
        }
        Expression::Equal(e) => {
            is_supported_by_self_hosted_compiler(&e.left)
                && is_supported_by_self_hosted_compiler(&e.right)
        }
        Expression::LessThan(e) => {
            is_supported_by_self_hosted_compiler(&e.left)
                && is_supported_by_self_hosted_compiler(&e.right)
        }
        Expression::If(e) => {
            is_supported_by_self_hosted_compiler(&e.condition)
                && is_supported_by_self_hosted_compiler(&e.then_expr)
                && is_supported_by_self_hosted_compiler(&e.else_expr)
        }
        Expression::And(e) => {
            is_supported_by_self_hosted_compiler(&e.left)
                && is_supported_by_self_hosted_compiler(&e.right)
        }
        Expression::Or(e) => {
            is_supported_by_self_hosted_compiler(&e.left)
                && is_supported_by_self_hosted_compiler(&e.right)
        }
        Expression::TypeLiteral(e) => {
            e.items.len() <= 2
                && e.items
                    .iter()
                    .all(|item| is_supported_by_self_hosted_compiler(&item.value))
        }
        Expression::Variant(e) => e
            .payload
            .as_ref()
            .map(|p| is_supported_by_self_hosted_compiler(p))
            .unwrap_or(true),
        Expression::Let(e) => {
            is_supported_by_self_hosted_compiler(&e.value)
                && is_supported_by_self_hosted_compiler(&e.body)
        }
        Expression::Variable(_) => true,
        Expression::Not(e) => is_supported_by_self_hosted_compiler(&e.value),
        _ => false,
    }
}

/// 任意の definy 式 (`Expression`) を、実行可能な WebAssembly バイナリ (`Vec<u8>`) にコンパイルします。
/// 自己記述コンパイラパーツ (`core.compile-to-wasm`) によるメタ循環コンパイルを最優先し、
/// 文字列やレコードなどの拡張構文を含む場合は完全な Wasm エミッターによって線形メモリ付きバイナリを出力します。
pub fn compile_expression_to_wasm(
    expression: &Expression,
) -> Result<Vec<u8>, SelfHostedCompileError> {
    // 1. 自己記述コンパイラ (core.compile-to-wasm) が対応している構文群であればメタ循環コンパイルを実行
    if is_supported_by_self_hosted_compiler(expression)
        && let Ok(bytes) = try_compile_via_self_hosted(expression)
    {
        return Ok(bytes);
    }

    // 2. 文字列 (HTML 文字列) やレコード (HTTP レスポンス) 等の高度な式は definy_core の Wasm エミッターでコンパイル
    definy_core::wasm_emitter::compile_expression_to_wasm(expression, &[])
        .map_err(SelfHostedCompileError::Evaluation)
}

/// コミットイベント群から指定されたパーツ ID (hex 文字列、またはパーツ名) に一致する Expression を探索します。
pub fn find_part_expression_in_events(
    part_id: &str,
    events: &[VerifiedCommitEvent],
) -> Result<Expression, SelfHostedCompileError> {
    for (_hash, res) in events.iter().rev() {
        if let Ok((_sig, event)) = res
            && let EventContent::ModuleCommit(ref mc) = event.content
        {
            let module_id = derive_module_id(&event.account_id, &mc.module_name);
            for part in &mc.parts {
                let derived_part_id = derive_module_part_id(&module_id, &part.name);
                if derived_part_id.to_string() == part_id || part.name.as_ref() == part_id {
                    if let Some(ref expr) = part.expression {
                        return Ok(expr.clone());
                    } else {
                        return Err(SelfHostedCompileError::PartHasNoExpression(
                            part_id.to_string(),
                        ));
                    }
                }
            }
        }
    }
    Err(SelfHostedCompileError::PartNotFound(part_id.to_string()))
}

/// シリアライズされた署名付きイベント列バイトからパーツの Expression を探索します。
pub fn find_part_expression_in_signed_events(
    part_id: &str,
    event_binaries: &[Vec<u8>],
) -> Result<Expression, SelfHostedCompileError> {
    for bytes in event_binaries.iter().rev() {
        if let Ok((_sig, event)) = definy_event::verify_and_deserialize(bytes)
            && let EventContent::ModuleCommit(ref mc) = event.content
        {
            let module_id = derive_module_id(&event.account_id, &mc.module_name);
            for part in &mc.parts {
                let derived_part_id = derive_module_part_id(&module_id, &part.name);
                if derived_part_id.to_string() == part_id || part.name.as_ref() == part_id {
                    if let Some(ref expr) = part.expression {
                        return Ok(expr.clone());
                    } else {
                        return Err(SelfHostedCompileError::PartHasNoExpression(
                            part_id.to_string(),
                        ));
                    }
                }
            }
        }
    }
    Err(SelfHostedCompileError::PartNotFound(part_id.to_string()))
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
    compile_expression_to_wasm(&expr)
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

        let wasm_bytes = compile_expression_to_wasm(&expr)
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
        let dummy_account = AccountId(dummy_key);
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
        let wasm_bytes = compile_expression_to_wasm(&found_expr)
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

        let wasm_bytes =
            compile_expression_to_wasm(&expr).expect("Should compile string expression to Wasm");
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

        let wasm_bytes =
            compile_expression_to_wasm(&expr).expect("Should compile record expression to Wasm");
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

        let wasm_bytes = compile_expression_to_wasm(&ok_expr)
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

        let wasm_bytes = compile_expression_to_wasm(&none_expr)
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
        // let a = 10;
        // let b = 25;
        // a + b = 35
        let expr = Expression::Let(definy_event::event::LetExpression {
            variable_id: 0,
            variable_name: "a".into(),
            value: Box::new(Expression::Number(NumberExpression { value: 10 })),
            body: Box::new(Expression::Let(definy_event::event::LetExpression {
                variable_id: 1,
                variable_name: "b".into(),
                value: Box::new(Expression::Number(NumberExpression { value: 25 })),
                body: Box::new(Expression::Add(AddExpression {
                    left: Box::new(Expression::Variable(
                        definy_event::event::VariableExpression { variable_id: 0 },
                    )),
                    right: Box::new(Expression::Variable(
                        definy_event::event::VariableExpression { variable_id: 1 },
                    )),
                })),
            })),
        });

        let wasm_bytes = compile_expression_to_wasm(&expr)
            .expect("Should compile let and variable expression to Wasm");
        assert!(!wasm_bytes.is_empty());

        let result =
            execute_compiled_wasm(&wasm_bytes).expect("Should execute compiled Wasm and return 35");
        assert_eq!(result, 35);
    }
}
