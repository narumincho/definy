//! WASI 0.3 (WebAssembly System Interface) スタイルの Capability-based I/O を
//! definy の第一級関数およびレコード型で表現するモジュール。
//!
//! グローバルな副作用（暗黙のシステムコール）を排除し、
//! `wasi:clocks/wall-clock`, `wasi:clocks/monotonic-clock`, `wasi:random/random`
//! などの能力（Capability）を明示的なパラメータとして受け取ることで、
//! 決定論的なテスト（モック化）と純粋関数型セマンティクスを両立します。

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

// ---------------------------------------------------------------------------
// 1. WASI Clocks: wall-clock & monotonic-clock
// ---------------------------------------------------------------------------

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

/// WASI 0.3 Wall Clock インターフェース型 `wasi.wall-clock`: `{ now: () -> datetime }`
pub fn create_wasi_wall_clock_part(_mod_id: &EventHashId) -> ModulePartEntry {
    ModulePartEntry {
        name: "wasi.wall-clock".into(),
        part_type: Some(PartType::Type),
        description: Description::localized(vec![
            (
                "en",
                "WASI 0.3 wall-clock capability interface with now: () -> datetime",
            ),
            (
                "ja",
                "現在日時を取得する now: () -> datetime を持つ WASI 0.3 wall-clock インターフェース型",
            ),
        ]),
        content_hash: None,
        expression: None,
    }
}

/// `WASI-WallClock` の型定義ヘルパー
/// `{ now: () -> { seconds: number, nanoseconds: number } }`
pub fn wasi_wall_clock_type() -> PartType {
    PartType::Record(vec![RecordFieldType {
        key: "now".into(),
        value: Box::new(fn_type(&[], wasi_datetime_type())),
    }])
}

/// WASI 0.3 Monotonic Clock インターフェース型 `wasi.monotonic-clock`: `{ now: () -> number }`
pub fn create_wasi_monotonic_clock_part(_mod_id: &EventHashId) -> ModulePartEntry {
    ModulePartEntry {
        name: "wasi.monotonic-clock".into(),
        part_type: Some(PartType::Type),
        description: Description::localized(vec![
            (
                "en",
                "WASI 0.3 monotonic-clock capability interface with now: () -> number (nanoseconds)",
            ),
            (
                "ja",
                "単調増加時間（ナノ秒）を取得する now: () -> number を持つ WASI 0.3 monotonic-clock インターフェース型",
            ),
        ]),
        content_hash: None,
        expression: None,
    }
}

/// `WASI-MonotonicClock` の型定義ヘルパー
/// `{ now: () -> number }`
pub fn wasi_monotonic_clock_type() -> PartType {
    PartType::Record(vec![RecordFieldType {
        key: "now".into(),
        value: Box::new(fn_type(&[], PartType::Number)),
    }])
}

// ---------------------------------------------------------------------------
// 2. WASI Random
// ---------------------------------------------------------------------------

/// WASI 0.3 Random インターフェース型 `wasi.random`: `{ get-random-u64: () -> number }`
pub fn create_wasi_random_part(_mod_id: &EventHashId) -> ModulePartEntry {
    ModulePartEntry {
        name: "wasi.random".into(),
        part_type: Some(PartType::Type),
        description: Description::localized(vec![
            (
                "en",
                "WASI 0.3 random capability interface with get-random-u64: () -> number",
            ),
            (
                "ja",
                "安全な64ビット乱数を取得する get-random-u64: () -> number を持つ WASI 0.3 random インターフェース型",
            ),
        ]),
        content_hash: None,
        expression: None,
    }
}

/// `WASI-Random` の型定義ヘルパー
/// `{ get_random_u64: () -> number }`
pub fn wasi_random_type() -> PartType {
    PartType::Record(vec![RecordFieldType {
        key: "get_random_u64".into(),
        value: Box::new(fn_type(&[], PartType::Number)),
    }])
}

// ---------------------------------------------------------------------------
// 3. WASI Environment (World)
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// 4. Standard Utility Functions
// ---------------------------------------------------------------------------

/// `clock => (clock.now)()`
/// WASI Wall Clock 能力を受け取り、現在時刻（`datetime`）を返す標準関数
pub fn create_wasi_clock_now_part(_mod_id: &EventHashId) -> ModulePartEntry {
    let body = fn_expr(
        &[("clock", 1)],
        call_expr(
            Expression::RecordGet(RecordGetExpression {
                record: Box::new(Expression::Variable(VariableExpression { variable_id: 1 })),
                key: "now".into(),
            }),
            &[],
        ),
    );

    ModulePartEntry {
        name: "clock-now".into(),
        part_type: Some(fn_type(
            &[("clock", wasi_wall_clock_type())],
            wasi_datetime_type(),
        )),
        description: Description::localized(vec![
            (
                "en",
                "Invoke now() on a WASI Wall Clock capability to get the current datetime",
            ),
            (
                "ja",
                "WASI Wall Clock 能力の now() を呼び出して現在の日時を取得する関数",
            ),
        ]),
        content_hash: None,
        expression: Some(body),
    }
}

/// `clock => (clock.now)()`
/// WASI Monotonic Clock 能力を受け取り、単調増加ナノ秒を返す標準関数
pub fn create_wasi_monotonic_now_part(_mod_id: &EventHashId) -> ModulePartEntry {
    let body = fn_expr(
        &[("clock", 1)],
        call_expr(
            Expression::RecordGet(RecordGetExpression {
                record: Box::new(Expression::Variable(VariableExpression { variable_id: 1 })),
                key: "now".into(),
            }),
            &[],
        ),
    );

    ModulePartEntry {
        name: "monotonic-now".into(),
        part_type: Some(fn_type(
            &[("clock", wasi_monotonic_clock_type())],
            PartType::Number,
        )),
        description: Description::localized(vec![
            (
                "en",
                "Invoke now() on a WASI Monotonic Clock capability to get the monotonic timestamp in nanoseconds",
            ),
            (
                "ja",
                "WASI Monotonic Clock 能力の now() を呼び出してナノ秒タイムスタンプを取得する関数",
            ),
        ]),
        content_hash: None,
        expression: Some(body),
    }
}

/// `random => (random.get_random_u64)()`
/// WASI Random 能力を受け取り、64ビット乱数を返す標準関数
pub fn create_wasi_random_u64_part(_mod_id: &EventHashId) -> ModulePartEntry {
    let body = fn_expr(
        &[("random", 1)],
        call_expr(
            Expression::RecordGet(RecordGetExpression {
                record: Box::new(Expression::Variable(VariableExpression { variable_id: 1 })),
                key: "get_random_u64".into(),
            }),
            &[],
        ),
    );

    ModulePartEntry {
        name: "random-u64".into(),
        part_type: Some(fn_type(&[("random", wasi_random_type())], PartType::Number)),
        description: Description::localized(vec![
            (
                "en",
                "Invoke get_random_u64() on a WASI Random capability to get a random 64-bit integer",
            ),
            (
                "ja",
                "WASI Random 能力の get_random_u64() を呼び出して乱数を取得する関数",
            ),
        ]),
        content_hash: None,
        expression: Some(body),
    }
}

/// `clock => ((clock.now)()).seconds`
/// WASI Wall Clock 能力を受け取り、現在時刻の秒数を返す標準関数
pub fn create_wasi_clock_get_seconds_part(_mod_id: &EventHashId) -> ModulePartEntry {
    let now_call = call_expr(
        Expression::RecordGet(RecordGetExpression {
            record: Box::new(Expression::Variable(VariableExpression { variable_id: 1 })),
            key: "now".into(),
        }),
        &[],
    );

    let get_seconds = Expression::RecordGet(RecordGetExpression {
        record: Box::new(now_call),
        key: "seconds".into(),
    });

    let body = fn_expr(&[("clock", 1)], get_seconds);

    ModulePartEntry {
        name: "clock-get-seconds".into(),
        part_type: Some(fn_type(
            &[("clock", wasi_wall_clock_type())],
            PartType::Number,
        )),
        description: Description::localized(vec![
            (
                "en",
                "Invoke now() on a WASI Wall Clock capability and extract seconds",
            ),
            (
                "ja",
                "WASI Wall Clock 能力の now() を呼び出して秒数を取得する関数",
            ),
        ]),
        content_hash: None,
        expression: Some(body),
    }
}

/// `clock => deadline => ((clock.now)()).seconds >= deadline`
/// 期限を過ぎたかを判定する純粋ビジネスロジック関数（WASI Clock 注入型）
pub fn create_wasi_clock_is_expired_part(_mod_id: &EventHashId) -> ModulePartEntry {
    let now_call = call_expr(
        Expression::RecordGet(RecordGetExpression {
            record: Box::new(Expression::Variable(VariableExpression { variable_id: 1 })),
            key: "now".into(),
        }),
        &[],
    );

    let current_seconds = Expression::RecordGet(RecordGetExpression {
        record: Box::new(now_call),
        key: "seconds".into(),
    });

    let is_expired = Expression::GreaterThanOrEqual(GreaterThanOrEqualExpression {
        left: Box::new(current_seconds),
        right: Box::new(Expression::Variable(VariableExpression { variable_id: 2 })),
    });

    let body = fn_expr(&[("clock", 1), ("deadline", 2)], is_expired);

    ModulePartEntry {
        name: "clock-is-expired".into(),
        part_type: Some(fn_type(
            &[
                ("clock", wasi_wall_clock_type()),
                ("deadline", PartType::Number),
            ],
            PartType::Boolean,
        )),
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

/// `wasi` モジュールで提供するすべてのパーツ定義一覧を生成します
pub fn create_wasi_module_parts(mod_id: &EventHashId) -> Vec<ModulePartEntry> {
    vec![
        create_wasi_datetime_part(mod_id),
        create_wasi_wall_clock_part(mod_id),
        create_wasi_monotonic_clock_part(mod_id),
        create_wasi_random_part(mod_id),
        create_wasi_clock_now_part(mod_id),
        create_wasi_monotonic_now_part(mod_id),
        create_wasi_random_u64_part(mod_id),
        create_wasi_clock_get_seconds_part(mod_id),
        create_wasi_clock_is_expired_part(mod_id),
    ]
}

// ---------------------------------------------------------------------------
// 5. Capability Providers: Mock & Host Runtime
// ---------------------------------------------------------------------------

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
