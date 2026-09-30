use definy_event::event::{
    AccountId, Description, Event, EventContent, Expression, ModuleCommitEvent, ModulePartEntry,
    NumberExpression, TypeLiteralExpression, TypeLiteralItemExpression, VariantExpression,
    derive_module_id,
};
use definy_event::{EventHashId, VerifyAndDeserializeError};

pub fn get_dummy_core_id() -> EventHashId {
    EventHashId::from_bytes(&[1u8; 32])
}

pub fn get_test_account_and_mod_id() -> (AccountId, EventHashId) {
    let dummy_key = ed25519_dalek::VerifyingKey::from_bytes(&[0u8; 32]).unwrap();
    let dummy_account = AccountId(dummy_key);
    let mod_id = derive_module_id(&dummy_account, "core");
    (dummy_account, mod_id)
}

pub type TestEvents = Vec<(
    EventHashId,
    Result<(ed25519_dalek::Signature, Event), VerifyAndDeserializeError>,
)>;

pub fn create_test_module_events(
    account: AccountId,
    parts: Vec<ModulePartEntry>,
    commit_id_byte: u8,
) -> TestEvents {
    let event = Event {
        account_id: account,
        time: chrono::DateTime::UNIX_EPOCH,
        content: EventContent::ModuleCommit(ModuleCommitEvent {
            module_name: "core".into(),
            module_description: Description::Plain("".into()),
            parent_commit_hash: None,
            message: "Self-hosting test".into(),
            parts,
        }),
    };
    let dummy_sig = ed25519_dalek::Signature::from_bytes(&[0u8; 64]);
    let commit_hash = EventHashId::from_bytes(&[commit_id_byte; 32]);
    vec![(commit_hash, Ok((dummy_sig, event)))]
}

pub fn ast_num(val: i64, expr_type_hash: Option<EventHashId>) -> Expression {
    Expression::Variant(VariantExpression {
        tag: "number".into(),
        payload: Some(Box::new(Expression::Number(NumberExpression {
            value: val,
        }))),
        type_part_definition_event_hash: expr_type_hash,
    })
}

pub fn ast_add(
    left: Expression,
    right: Expression,
    expr_type_hash: Option<EventHashId>,
) -> Expression {
    Expression::Variant(VariantExpression {
        tag: "add".into(),
        payload: Some(Box::new(Expression::TypeLiteral(TypeLiteralExpression {
            items: vec![
                TypeLiteralItemExpression {
                    key: "left".into(),
                    value: Box::new(left),
                },
                TypeLiteralItemExpression {
                    key: "right".into(),
                    value: Box::new(right),
                },
            ],
        }))),
        type_part_definition_event_hash: expr_type_hash,
    })
}
