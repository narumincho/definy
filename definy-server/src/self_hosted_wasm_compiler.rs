//! definy の自己記述コンパイラ (`core.compile-to-wasm`) を呼び出し、
//! 任意の definy 式 AST から実行可能な WebAssembly バイナリを動的に生成するパイプライン。

use chrono::DateTime;
use definy_core::expression_eval::Value;
use definy_event::event::{
    AccountId, AddExpression, CallExpression, Description, Event, EventContent, Expression,
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
        }
    }
}

impl std::error::Error for SelfHostedCompileError {}

/// 任意の definy 式 (`Expression`) を、definy 自身の自己記述コンパイラパーツ
/// (`core.compile-to-wasm`) をメタ循環評価することによって WebAssembly バイナリ (`Vec<u8>`) にコンパイルします。
pub fn compile_expression_to_wasm(
    expression: &Expression,
) -> Result<Vec<u8>, SelfHostedCompileError> {
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

    type VerifiedCommitEvent = (
        EventHashId,
        Result<(ed25519_dalek::Signature, Event), VerifyAndDeserializeError>,
    );

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
        argument: Box::new(self_hosted_ast),
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

/// 生成された Wasm バイナリを検証のために実行し、エクスポート関数 `main()` の返り値を取得します。
pub fn execute_compiled_wasm(wasm_bytes: &[u8]) -> Result<i64, SelfHostedCompileError> {
    let result = definy_core::wasm_emitter::execute_wasm(wasm_bytes)
        .map_err(|e| SelfHostedCompileError::WasmExecution(format!("{e:?}")))?;

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
}
