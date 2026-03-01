use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Event {
    pub account_id: AccountId,
    #[serde(with = "crate::cbor_datetime_tag1")]
    pub time: chrono::DateTime<chrono::Utc>,
    pub content: EventContent,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, strum::EnumDiscriminants)]
#[strum_discriminants(name(EventType))]
#[strum_discriminants(serde(rename_all = "snake_case"))]
#[strum_discriminants(strum(serialize_all = "snake_case"))]
#[strum_discriminants(derive(
    Serialize,
    Deserialize,
    strum_macros::Display,
    strum::VariantNames,
    sqlx::Type
))]
#[strum_discriminants(sqlx(type_name = "event_type", rename_all = "snake_case"))]
pub enum EventContent {
    CreateAccount(CreateAccountEvent),
    ChangeProfile(ChangeProfileEvent),
    Message(MessageEvent),
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct MessageEvent {
    pub expression: Expression,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub enum Expression {
    Add(AddExpression),
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct AddExpression {
    pub left: i64,
    pub right: i64,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct CreateAccountEvent {
    pub account_name: Box<str>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ChangeProfileEvent {
    pub account_name: Box<str>,
}

#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct AccountId(pub Box<[u8; 32]>);
