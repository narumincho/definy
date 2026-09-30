//! WASI 0.3 スタイルの Capability-based I/O とテスト容易性の検証テスト。
//!
//! グローバルな副作用を持たず、環境能力（WASI-Clock など）を引数として受け取る構造により、
//! テスト時にモック能力を注入して決定論的に検証できることを実証します。

use definy_core::Value;
use definy_event::event::{
    CallExpression, Expression, FunctionExpression, ModulePartEntry, PartReferenceExpression,
    PartType, RecordGetExpression, TypeLiteralExpression, VariableExpression,
    derive_module_part_id,
};

use super::helpers::{create_test_module_events, get_test_account_and_mod_id};
use crate::builtin_wasi::{
    create_mock_clock_capability, create_system_clock_capability,
    create_wasi_clock_get_seconds_part, create_wasi_clock_is_expired_part,
    create_wasi_clock_now_part, wasi_clock_type, wasi_datetime_type,
};

#[test]
fn test_wasi_clock_now_with_mock() {
    let (account, mod_id) = get_test_account_and_mod_id();

    let clock_now_part = create_wasi_clock_now_part(&mod_id);
    let now_hash = derive_module_part_id(&mod_id, "clock-now");

    let events = create_test_module_events(account, vec![clock_now_part], 211);

    // テスト用のモック Clock 能力: 1774900000秒, 123456ナノ秒
    let mock_clock = create_mock_clock_capability(1774900000, 123456);

    // clock-now(mock_clock)
    let call_expr = definy_event::event::Expression::Call(CallExpression {
        function: Box::new(definy_event::event::Expression::PartReference(
            definy_event::event::PartReferenceExpression::new(now_hash),
        )),
        argument: Box::new(mock_clock),
    });

    let result = definy_core::evaluate_expression(&call_expr, &events)
        .expect("Failed to evaluate clock-now with mock clock");

    assert_eq!(
        result,
        Value::Record(vec![
            ("nanoseconds".into(), Value::Number(123456)),
            ("seconds".into(), Value::Number(1774900000)),
        ])
    );
}

#[test]
fn test_wasi_clock_get_seconds_with_mock() {
    let (account, mod_id) = get_test_account_and_mod_id();

    let clock_get_seconds_part = create_wasi_clock_get_seconds_part(&mod_id);
    let get_sec_hash = derive_module_part_id(&mod_id, "clock-get-seconds");

    let events = create_test_module_events(account, vec![clock_get_seconds_part], 212);

    // テスト用のモック Clock 能力
    let mock_clock = create_mock_clock_capability(1800000000, 999);

    let call_expr = definy_event::event::Expression::Call(CallExpression {
        function: Box::new(definy_event::event::Expression::PartReference(
            definy_event::event::PartReferenceExpression::new(get_sec_hash),
        )),
        argument: Box::new(mock_clock),
    });

    let result = definy_core::evaluate_expression(&call_expr, &events)
        .expect("Failed to evaluate clock-get-seconds with mock clock");

    assert_eq!(result, Value::Number(1800000000));
}

#[test]
fn test_wasi_clock_is_expired_business_logic_deterministic_testing() {
    let (account, mod_id) = get_test_account_and_mod_id();

    let is_expired_part = create_wasi_clock_is_expired_part(&mod_id);
    let is_expired_hash = derive_module_part_id(&mod_id, "clock-is-expired");

    let events = create_test_module_events(account, vec![is_expired_part], 213);

    let deadline_seconds = 1500;

    // Case 1: 現在時刻 1000秒 (deadline: 1500秒) -> まだ期限内 (false)
    {
        let mock_clock_before = create_mock_clock_capability(1000, 0);
        let call_before = definy_event::event::Expression::Call(CallExpression {
            function: Box::new(definy_event::event::Expression::Call(CallExpression {
                function: Box::new(definy_event::event::Expression::PartReference(
                    definy_event::event::PartReferenceExpression::new(is_expired_hash.clone()),
                )),
                argument: Box::new(mock_clock_before),
            })),
            argument: Box::new(definy_event::event::Expression::Number(
                definy_event::event::NumberExpression {
                    value: deadline_seconds,
                },
            )),
        });

        let res_before = definy_core::evaluate_expression(&call_before, &events)
            .expect("Failed to evaluate before deadline");
        assert_eq!(res_before, Value::Bool(false));
    }

    // Case 2: 現在時刻 2000秒 (deadline: 1500秒) -> 期限超過 (true)
    {
        let mock_clock_after = create_mock_clock_capability(2000, 0);
        let call_after = definy_event::event::Expression::Call(CallExpression {
            function: Box::new(definy_event::event::Expression::Call(CallExpression {
                function: Box::new(definy_event::event::Expression::PartReference(
                    definy_event::event::PartReferenceExpression::new(is_expired_hash),
                )),
                argument: Box::new(mock_clock_after),
            })),
            argument: Box::new(definy_event::event::Expression::Number(
                definy_event::event::NumberExpression {
                    value: deadline_seconds,
                },
            )),
        });

        let res_after = definy_core::evaluate_expression(&call_after, &events)
            .expect("Failed to evaluate after deadline");
        assert_eq!(res_after, Value::Bool(true));
    }
}

#[test]
fn test_wasi_clock_with_system_time_injection() {
    let (account, mod_id) = get_test_account_and_mod_id();

    let clock_get_seconds_part = create_wasi_clock_get_seconds_part(&mod_id);
    let get_sec_hash = derive_module_part_id(&mod_id, "clock-get-seconds");

    let events = create_test_module_events(account, vec![clock_get_seconds_part], 214);

    // ホストの実時間（SystemTime）を注入した Clock 能力
    let system_clock = create_system_clock_capability();

    let call_expr = definy_event::event::Expression::Call(CallExpression {
        function: Box::new(definy_event::event::Expression::PartReference(
            definy_event::event::PartReferenceExpression::new(get_sec_hash),
        )),
        argument: Box::new(system_clock),
    });

    let result = definy_core::evaluate_expression(&call_expr, &events)
        .expect("Failed to evaluate with system clock");

    if let Value::Number(sec) = result {
        // 2024年以降の有効なタイムスタンプであることを検証
        assert!(sec > 1700000000, "Timestamp should be reasonable: {}", sec);
    } else {
        panic!("Expected Number, got {:?}", result);
    }
}

/// ユーザー指定パターン:
/// ```definy
/// main: WASI-Clock -> IO DateTime
/// main { now } = now()
/// ```
#[test]
fn test_wasi_clock_user_main_pattern() {
    let (account, mod_id) = get_test_account_and_mod_id();

    // main = clock => {
    //   let now_fn = clock.now;
    //   now_fn({})
    // }
    let unit_arg = Expression::TypeLiteral(TypeLiteralExpression { items: vec![] });
    let main_fn = Expression::Function(FunctionExpression {
        parameter_id: 1,
        parameter_name: "clock".into(),
        body: Box::new(Expression::Call(CallExpression {
            function: Box::new(Expression::RecordGet(RecordGetExpression {
                record: Box::new(Expression::Variable(VariableExpression { variable_id: 1 })),
                key: "now".into(),
            })),
            argument: Box::new(unit_arg),
        })),
    });

    let main_part = ModulePartEntry {
        name: "main".into(),
        part_type: Some(PartType::Function {
            parameter: Box::new(wasi_clock_type()),
            return_type: Box::new(wasi_datetime_type()),
        }),
        description: "main: WASI-Clock -> DateTime".into(),
        content_hash: None,
        expression: Some(main_fn),
    };
    let main_hash = derive_module_part_id(&mod_id, "main");
    let events = create_test_module_events(account, vec![main_part], 215);

    // テスト時にモック時刻（1700000000秒, 42ナノ秒）を渡す
    let mock_clock = create_mock_clock_capability(1700000000, 42);
    let call_main = Expression::Call(CallExpression {
        function: Box::new(Expression::PartReference(PartReferenceExpression::new(
            main_hash,
        ))),
        argument: Box::new(mock_clock),
    });

    let res = definy_core::evaluate_expression(&call_main, &events)
        .expect("Failed to evaluate user main pattern with mock clock");

    assert_eq!(
        res,
        Value::Record(vec![
            ("nanoseconds".into(), Value::Number(42)),
            ("seconds".into(), Value::Number(1700000000)),
        ])
    );
}
