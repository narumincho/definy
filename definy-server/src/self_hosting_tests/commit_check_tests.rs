//! サーバーがモジュールのコミットを受け付けるかの検査 (`check_module_commit_parts`) のテスト.
//! UI の変更ページもコミット前に同じ関数で検査する.

use definy_core::self_hosted_type_check::{
    SelfHostedCoreParts, SelfHostedTypeCheckOutcome, check_module_commit_parts,
};
use definy_event::event::{
    AccountId, CallArgument, CallExpression, Event, EventContent, Expression, ListLengthExpression,
    ListLiteralExpression, ModuleCommitEvent, ModulePartEntry, NumberExpression,
    PartReferenceExpression, PartType, StringExpression, derive_module_id, derive_module_part_id,
};

use crate::seed::{builtin_seed_events, builtin_system_account_id};

fn user_account() -> AccountId {
    AccountId(ed25519_dalek::SigningKey::from_bytes(&[7u8; 32]).verifying_key())
}

fn core_parts() -> SelfHostedCoreParts {
    SelfHostedCoreParts::from_core_module_id(&derive_module_id(
        &builtin_system_account_id(),
        "core",
    ))
}

fn part(name: &str, part_type: PartType, expression: Expression) -> ModulePartEntry {
    ModulePartEntry {
        name: name.into(),
        part_type: Some(part_type),
        description: Default::default(),
        content_hash: None,
        expression: Some(expression),
    }
}

fn commit(parts: Vec<ModulePartEntry>) -> ModuleCommitEvent {
    ModuleCommitEvent {
        module_name: "app".into(),
        module_description: Default::default(),
        parent_commit_hash: None,
        message: "test".into(),
        parts,
    }
}

fn number(value: i64) -> Expression {
    Expression::Number(NumberExpression { value })
}

fn string(value: &str) -> Expression {
    Expression::String(StringExpression {
        value: value.into(),
    })
}

fn argument(name: &str, value: Expression) -> CallArgument {
    CallArgument {
        name: name.into(),
        value: Box::new(value),
    }
}

/// ユーザーのモジュール `app` のコミットを, ビルトインモジュールと `previous` のコミットを
/// 取得済みのイベントとして検査する
fn check(
    previous: Option<ModuleCommitEvent>,
    candidate: ModuleCommitEvent,
) -> Vec<(String, SelfHostedTypeCheckOutcome)> {
    let mut events = builtin_seed_events(&builtin_system_account_id(), None);
    if let Some(previous) = previous {
        let event = Event {
            account_id: user_account(),
            time: chrono::DateTime::from_timestamp(1_700_000_000, 0).unwrap(),
            content: EventContent::ModuleCommit(previous),
        };
        events.push((
            definy_event::EventHashId::from_bytes(b"definy:test:app-previous"),
            Ok((ed25519_dalek::Signature::from_bytes(&[0u8; 64]), event)),
        ));
    }
    check_module_commit_parts(
        &candidate,
        &derive_module_id(&user_account(), "app"),
        &events,
        &core_parts(),
        false,
    )
}

fn error_tag(outcome: &SelfHostedTypeCheckOutcome) -> Option<&str> {
    match outcome {
        SelfHostedTypeCheckOutcome::TypeError(error) => Some(&error.tag),
        _ => None,
    }
}

/// UI が list-length の既定の引数として入れる空リスト `[]` は, 要素の型を推論できないので拒否される
#[test]
fn empty_list_without_expected_type_is_rejected() {
    let outcomes = check(
        None,
        commit(vec![part(
            "size",
            PartType::Number,
            Expression::ListLength(ListLengthExpression {
                value: Box::new(Expression::ListLiteral(ListLiteralExpression {
                    items: Vec::new(),
                })),
            }),
        )]),
    );
    assert_eq!(outcomes.len(), 1);
    assert_eq!(error_tag(&outcomes[0].1), Some("cannot_infer_empty_list"));
}

/// ユーザーのモジュールから別のモジュール (core) のパーツを呼び出すとき, 引数の型を検査する
#[test]
fn call_to_part_in_other_module_checks_argument_types() {
    let contains = |target: Expression| {
        Expression::Call(CallExpression {
            function: Box::new(Expression::PartReference(PartReferenceExpression::new(
                derive_module_part_id(
                    &derive_module_id(&builtin_system_account_id(), "core"),
                    "list-contains-string",
                ),
            ))),
            arguments: vec![
                argument(
                    "list",
                    Expression::ListLiteral(ListLiteralExpression {
                        items: vec![string("a")],
                    }),
                ),
                argument("target", target),
                argument("index", number(0)),
            ],
        })
    };
    let outcomes = check(
        None,
        commit(vec![
            part("has-a", PartType::Boolean, contains(string("a"))),
            part("has-one", PartType::Boolean, contains(number(1))),
        ]),
    );
    assert_eq!(
        outcomes[0],
        ("has-a".into(), SelfHostedTypeCheckOutcome::Ok)
    );
    assert_eq!(outcomes[1].0, "has-one");
    assert_eq!(error_tag(&outcomes[1].1), Some("type_mismatch"));
}

/// パーツの型を変えると, 式を変えていない同じモジュールのパーツも検査し直して, 壊れたものを見つける.
/// パーツ詳細の検査 (コミット済みの型環境で編集中のパーツだけを見る) では見つからない
#[test]
fn changing_part_type_rechecks_parts_that_reference_it() {
    let reference_to_value = Expression::PartReference(PartReferenceExpression::new(
        derive_module_part_id(&derive_module_id(&user_account(), "app"), "value"),
    ));
    let previous = commit(vec![
        part("value", PartType::Number, number(1)),
        part("twice", PartType::Number, reference_to_value.clone()),
    ]);
    let candidate = commit(vec![
        part("value", PartType::String, string("one")),
        part("twice", PartType::Number, reference_to_value),
    ]);
    let outcomes = check(Some(previous), candidate);
    assert_eq!(
        outcomes[0],
        ("value".into(), SelfHostedTypeCheckOutcome::Ok)
    );
    assert_eq!(outcomes[1].0, "twice");
    assert_eq!(error_tag(&outcomes[1].1), Some("type_mismatch"));
}

/// 式を変えていないパーツは, 型が 1 つも変わっていなければ検査しない
#[test]
fn unchanged_parts_are_not_rechecked() {
    let previous = commit(vec![
        part("a", PartType::Number, number(1)),
        part("b", PartType::Number, number(2)),
    ]);
    let candidate = commit(vec![
        part("a", PartType::Number, number(3)),
        part("b", PartType::Number, number(2)),
    ]);
    let outcomes = check(Some(previous), candidate);
    assert_eq!(outcomes, vec![("a".into(), SelfHostedTypeCheckOutcome::Ok)]);
}
