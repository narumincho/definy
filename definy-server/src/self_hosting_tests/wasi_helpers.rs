//! WASI 能力（Capability）のモック・型を構築するテスト用ヘルパー。
//!
//! 以前は `builtin_wasi.rs` にあった。パーツ定義の正本が `seeds/*.json` になったため、テスト専用に移動した。
#![allow(dead_code, unused_imports)]

use crate::ast_builder::{call_expr, fn_expr, fn_type};
use definy_event::EventHashId;
use definy_event::event::{
    Description, Expression, GreaterThanOrEqualExpression, ModulePartEntry, NumberExpression,
    PartType, RecordFieldType, RecordGetExpression, TypeLiteralExpression,
    TypeLiteralItemExpression, VariableExpression,
};

pub fn expr_record(items: Vec<(&str, Expression)>) -> Expression {
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

/// `WASI-WallClock` の型定義ヘルパー
/// `{ now: () -> { seconds: number, nanoseconds: number } }`
pub fn wasi_wall_clock_type() -> PartType {
    PartType::Record(vec![RecordFieldType {
        key: "now".into(),
        value: Box::new(fn_type(&[], wasi_datetime_type())),
    }])
}

/// `WASI-MonotonicClock` の型定義ヘルパー
/// `{ now: () -> number }`
pub fn wasi_monotonic_clock_type() -> PartType {
    PartType::Record(vec![RecordFieldType {
        key: "now".into(),
        value: Box::new(fn_type(&[], PartType::Number)),
    }])
}

/// `WASI-Random` の型定義ヘルパー
/// `{ get_random_u64: () -> number }`
pub fn wasi_random_type() -> PartType {
    PartType::Record(vec![RecordFieldType {
        key: "get_random_u64".into(),
        value: Box::new(fn_type(&[], PartType::Number)),
    }])
}

/// WASI 0.3 World 環境レコード型
/// `{ wall_clock: wasi.wall-clock, monotonic_clock: wasi.monotonic-clock, random: wasi.random }`
pub fn wasi_env_type() -> PartType {
    PartType::Record(vec![
        RecordFieldType {
            key: "wall_clock".into(),
            value: Box::new(wasi_wall_clock_type()),
        },
        RecordFieldType {
            key: "monotonic_clock".into(),
            value: Box::new(wasi_monotonic_clock_type()),
        },
        RecordFieldType {
            key: "random".into(),
            value: Box::new(wasi_random_type()),
        },
    ])
}

/// テスト用のモック WASI Wall Clock レコード式を生成します。
/// `clock = { now: () => { seconds: $seconds, nanoseconds: $nanoseconds } }`
pub fn create_mock_clock_capability(seconds: i64, nanoseconds: i64) -> Expression {
    expr_record(vec![(
        "now",
        fn_expr(
            &[],
            expr_record(vec![
                (
                    "nanoseconds",
                    Expression::Number(NumberExpression { value: nanoseconds }),
                ),
                (
                    "seconds",
                    Expression::Number(NumberExpression { value: seconds }),
                ),
            ]),
        ),
    )])
}

/// テスト用のモック WASI Monotonic Clock レコード式を生成します。
/// `clock = { now: () => $nanoseconds }`
pub fn create_mock_monotonic_clock_capability(nanoseconds: i64) -> Expression {
    expr_record(vec![(
        "now",
        fn_expr(
            &[],
            Expression::Number(NumberExpression { value: nanoseconds }),
        ),
    )])
}

/// テスト用のモック WASI Random レコード式を生成します。
/// `random = { get_random_u64: () => $val }`
pub fn create_mock_random_capability(val: i64) -> Expression {
    expr_record(vec![(
        "get_random_u64",
        fn_expr(&[], Expression::Number(NumberExpression { value: val })),
    )])
}

/// テスト用の完全なモック WASI 0.3 環境レコード式を生成します。
pub fn create_mock_wasi_env(
    wall_sec: i64,
    wall_nano: i64,
    monotonic_nanos: i64,
    random_val: i64,
) -> Expression {
    expr_record(vec![
        (
            "wall_clock",
            create_mock_clock_capability(wall_sec, wall_nano),
        ),
        (
            "monotonic_clock",
            create_mock_monotonic_clock_capability(monotonic_nanos),
        ),
        ("random", create_mock_random_capability(random_val)),
    ])
}

/// 実行時点のシステム実時間（`std::time::SystemTime`）を返す WASI Wall Clock レコード式を生成します。
pub fn create_system_clock_capability() -> Expression {
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default();
    create_mock_clock_capability(now.as_secs() as i64, now.subsec_nanos() as i64)
}

/// ホスト環境の `SystemTime`, `Instant`, 乱数を組み合わせた完全な WASI 0.3 環境レコード式を生成します。
pub fn create_system_wasi_env() -> Expression {
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default();

    // 擬似乱数生成（セキュアハッシュシードベース）
    let rand_seed = (now.as_nanos() ^ 0x5DEECE66D_u128) as i64;
    let random_val = (rand_seed.wrapping_mul(6364136223846793005).wrapping_add(1)) & 0x7FFFFFFF;

    create_mock_wasi_env(
        now.as_secs() as i64,
        now.subsec_nanos() as i64,
        now.as_nanos() as i64,
        random_val,
    )
}
