//! WASI 0.3 (WebAssembly System Interface) スタイルの Capability-based I/O を
//! definy の第一級関数およびレコード型で表現するモジュール。
//!
//! グローバルな副作用（暗黙のシステムコール）を排除し、
//! `WASI-Clock` や `WASI-Console` などの能力（Capability）を明示的なパラメータとして受け取ることで、
//! 決定論的なテスト（モック化）と純粋関数型セマンティクスを両立します。

use definy_event::EventHashId;
use definy_event::event::{
    CallExpression, Description, Expression, FunctionExpression, GreaterThanOrEqualExpression,
    ModulePartEntry, NumberExpression, PartType, RecordFieldType, RecordGetExpression,
    TypeLiteralExpression, TypeLiteralItemExpression, VariableExpression,
};

fn expr_record(items: Vec<(&str, Expression)>) -> Expression {
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

/// WASI 0.3 Clocks の日時レコード型 `wasi.datetime`: `{ seconds: number, nanoseconds: number }`
pub fn create_wasi_datetime_part(_mod_id: &EventHashId) -> ModulePartEntry {
    ModulePartEntry {
        name: "wasi.datetime".into(),
        part_type: Some(PartType::Type),
        description: Description::localized(vec![
            (
                "en",
                "WASI 0.3 datetime record type with seconds and nanoseconds",
            ),
            ("ja", "秒数とナノ秒数を持つ WASI 0.3 datetime レコード型"),
        ]),
        content_hash: None,
        expression: None,
    }
}

/// WASI 0.3 Clocks インターフェース型 `wasi.clock`: `{ now: {} -> datetime }`
pub fn create_wasi_clock_part(_mod_id: &EventHashId) -> ModulePartEntry {
    ModulePartEntry {
        name: "wasi.clock".into(),
        part_type: Some(PartType::Type),
        description: Description::localized(vec![
            (
                "en",
                "WASI 0.3 clock capability interface with now: () -> datetime",
            ),
            (
                "ja",
                "現在時刻を取得する now: () -> datetime を持つ WASI 0.3 clock インターフェース型",
            ),
        ]),
        content_hash: None,
        expression: None,
    }
}

/// `datetime` の型定義ヘルパー
pub fn wasi_datetime_type() -> PartType {
    PartType::Record(vec![
        RecordFieldType {
            key: "seconds".into(),
            value: Box::new(PartType::Number),
        },
        RecordFieldType {
            key: "nanoseconds".into(),
            value: Box::new(PartType::Number),
        },
    ])
}

/// `WASI-Clock` の型定義ヘルパー
/// `{ now: {} -> { seconds: number, nanoseconds: number } }`
pub fn wasi_clock_type() -> PartType {
    PartType::Record(vec![RecordFieldType {
        key: "now".into(),
        value: Box::new(PartType::Function {
            parameter: Box::new(PartType::Record(vec![])),
            return_type: Box::new(wasi_datetime_type()),
        }),
    }])
}

/// `clock => (clock.now)({})`
/// WASI Clock 能力を受け取り、現在時刻（`datetime`）を返す標準関数
pub fn create_wasi_clock_now_part(_mod_id: &EventHashId) -> ModulePartEntry {
    let unit_arg = expr_record(vec![]);

    // clock = variable(1)
    // now_fn = record_get(clock, "now")
    // call(now_fn, unit_arg)
    let body = Expression::Function(FunctionExpression {
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

    ModulePartEntry {
        name: "clock-now".into(),
        part_type: Some(PartType::Function {
            parameter: Box::new(wasi_clock_type()),
            return_type: Box::new(wasi_datetime_type()),
        }),
        description: Description::localized(vec![
            (
                "en",
                "Invoke now() on a WASI Clock capability to get the current datetime",
            ),
            (
                "ja",
                "WASI Clock 能力の now() を呼び出して現在の日時を取得する関数",
            ),
        ]),
        content_hash: None,
        expression: Some(body),
    }
}

/// `clock => ((clock.now)({})).seconds`
/// WASI Clock 能力を受け取り、現在時刻の秒数を返す標準関数
pub fn create_wasi_clock_get_seconds_part(_mod_id: &EventHashId) -> ModulePartEntry {
    let unit_arg = expr_record(vec![]);

    let now_call = Expression::Call(CallExpression {
        function: Box::new(Expression::RecordGet(RecordGetExpression {
            record: Box::new(Expression::Variable(VariableExpression { variable_id: 1 })),
            key: "now".into(),
        })),
        argument: Box::new(unit_arg),
    });

    let get_seconds = Expression::RecordGet(RecordGetExpression {
        record: Box::new(now_call),
        key: "seconds".into(),
    });

    let body = Expression::Function(FunctionExpression {
        parameter_id: 1,
        parameter_name: "clock".into(),
        body: Box::new(get_seconds),
    });

    ModulePartEntry {
        name: "clock-get-seconds".into(),
        part_type: Some(PartType::Function {
            parameter: Box::new(wasi_clock_type()),
            return_type: Box::new(PartType::Number),
        }),
        description: Description::localized(vec![
            (
                "en",
                "Invoke now() on a WASI Clock capability and extract seconds",
            ),
            (
                "ja",
                "WASI Clock 能力の now() を呼び出して秒数を取得する関数",
            ),
        ]),
        content_hash: None,
        expression: Some(body),
    }
}

/// `clock => deadline => ((clock.now)({})).seconds >= deadline`
/// 期限を過ぎたかを判定する純粋ビジネスロジック関数（WASI Clock 注入型）
pub fn create_wasi_clock_is_expired_part(_mod_id: &EventHashId) -> ModulePartEntry {
    let unit_arg = expr_record(vec![]);

    let now_call = Expression::Call(CallExpression {
        function: Box::new(Expression::RecordGet(RecordGetExpression {
            record: Box::new(Expression::Variable(VariableExpression { variable_id: 1 })),
            key: "now".into(),
        })),
        argument: Box::new(unit_arg),
    });

    let current_seconds = Expression::RecordGet(RecordGetExpression {
        record: Box::new(now_call),
        key: "seconds".into(),
    });

    let is_expired = Expression::GreaterThanOrEqual(GreaterThanOrEqualExpression {
        left: Box::new(current_seconds),
        right: Box::new(Expression::Variable(VariableExpression { variable_id: 2 })),
    });

    let body = Expression::Function(FunctionExpression {
        parameter_id: 1,
        parameter_name: "clock".into(),
        body: Box::new(Expression::Function(FunctionExpression {
            parameter_id: 2,
            parameter_name: "deadline".into(),
            body: Box::new(is_expired),
        })),
    });

    ModulePartEntry {
        name: "clock-is-expired".into(),
        part_type: Some(PartType::Function {
            parameter: Box::new(wasi_clock_type()),
            return_type: Box::new(PartType::Function {
                parameter: Box::new(PartType::Number),
                return_type: Box::new(PartType::Boolean),
            }),
        }),
        description: Description::localized(vec![
            (
                "en",
                "Check if the current WASI Clock time has reached or passed a deadline",
            ),
            (
                "ja",
                "WASI Clock 能力から取得した現在時刻が期限に達しているかを判定する関数",
            ),
        ]),
        content_hash: None,
        expression: Some(body),
    }
}

/// テスト用のモック WASI Clock レコード式を生成します。
/// `clock = { now: () => { seconds: $seconds, nanoseconds: $nanoseconds } }`
pub fn create_mock_clock_capability(seconds: i64, nanoseconds: i64) -> Expression {
    expr_record(vec![(
        "now",
        Expression::Function(FunctionExpression {
            parameter_id: 10,
            parameter_name: "_unit".into(),
            body: Box::new(expr_record(vec![
                (
                    "nanoseconds",
                    Expression::Number(NumberExpression { value: nanoseconds }),
                ),
                (
                    "seconds",
                    Expression::Number(NumberExpression { value: seconds }),
                ),
            ])),
        }),
    )])
}

/// 実行時点のシステム実時間（`std::time::SystemTime`）を返す WASI Clock レコード式を生成します。
pub fn create_system_clock_capability() -> Expression {
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default();
    create_mock_clock_capability(now.as_secs() as i64, now.subsec_nanos() as i64)
}
