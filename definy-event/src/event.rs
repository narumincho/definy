use serde::{Deserialize, Serialize};

use crate::EventHashId;

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
    PartDefinition(PartDefinitionEvent),
    PartUpdate(PartUpdateEvent),
    ModuleDefinition(ModuleDefinitionEvent),
    ModuleUpdate(ModuleUpdateEvent),
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct PartDefinitionEvent {
    pub part_name: Box<str>,
    #[serde(default)]
    pub part_type: Option<PartType>,
    #[serde(default)]
    pub description: Box<str>,
    pub expression: Expression,
    #[serde(default)]
    pub module_definition_event_hash: Option<EventHashId>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct PartUpdateEvent {
    pub part_name: Box<str>,
    pub part_description: Box<str>,
    pub part_definition_event_hash: EventHashId,
    #[serde(default = "default_expression")]
    pub expression: Expression,
    #[serde(default)]
    pub module_definition_event_hash: Option<EventHashId>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ModuleDefinitionEvent {
    pub module_name: Box<str>,
    #[serde(default)]
    pub description: Box<str>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ModuleUpdateEvent {
    pub module_name: Box<str>,
    pub module_description: Box<str>,
    pub module_definition_event_hash: EventHashId,
}

fn default_expression() -> Expression {
    Expression::Number(NumberExpression { value: 0 })
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum PartType {
    Number,
    String,
    Boolean,
    Type,
    TypePart(EventHashId),
    List(Box<PartType>),
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub enum Expression {
    Number(NumberExpression),
    String(StringExpression),
    TypeNumber,
    TypeString,
    TypeBoolean,
    TypeList(TypeListExpression),
    ListLiteral(ListLiteralExpression),
    Add(AddExpression),
    PartReference(PartReferenceExpression),
    Boolean(BooleanExpression),
    If(IfExpression),
    Equal(EqualExpression),
    Let(LetExpression),
    Variable(VariableExpression),
    #[serde(alias = "RecordLiteral")]
    TypeLiteral(TypeLiteralExpression),
    Constructor(ConstructorExpression),
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct AddExpression {
    pub left: Box<Expression>,
    pub right: Box<Expression>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct NumberExpression {
    pub value: i64,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct StringExpression {
    pub value: Box<str>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ListLiteralExpression {
    pub items: Vec<Expression>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct TypeListExpression {
    pub item_type: Box<Expression>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct PartReferenceExpression {
    pub part_definition_event_hash: EventHashId,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct BooleanExpression {
    pub value: bool,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct IfExpression {
    pub condition: Box<Expression>,
    pub then_expr: Box<Expression>,
    pub else_expr: Box<Expression>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct EqualExpression {
    pub left: Box<Expression>,
    pub right: Box<Expression>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct LetExpression {
    pub variable_id: i64,
    pub variable_name: Box<str>,
    pub value: Box<Expression>,
    pub body: Box<Expression>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct VariableExpression {
    pub variable_id: i64,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct TypeLiteralExpression {
    pub items: Vec<TypeLiteralItemExpression>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct TypeLiteralItemExpression {
    pub key: Box<str>,
    pub value: Box<Expression>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ConstructorExpression {
    pub type_part_definition_event_hash: EventHashId,
    pub value: Box<Expression>,
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
pub struct AccountId(pub ed25519_dalek::VerifyingKey);

impl std::fmt::Display for AccountId {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str(&base64::Engine::encode(
            &base64::engine::general_purpose::URL_SAFE_NO_PAD,
            self.0.as_bytes(),
        ))
    }
}

impl std::str::FromStr for AccountId {
    type Err = AccountIdFromStrError;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        let bytes = base64::Engine::decode(&base64::engine::general_purpose::URL_SAFE_NO_PAD, s)
            .map_err(AccountIdFromStrError::DecodeError)?;

        let bytes: [u8; 32] = bytes
            .try_into()
            .map_err(AccountIdFromStrError::InvalidByteSize)?;
        Ok(AccountId(
            ed25519_dalek::VerifyingKey::from_bytes(&bytes)
                .map_err(AccountIdFromStrError::InvalidBytes)?,
        ))
    }
}

#[derive(Debug)]
pub enum AccountIdFromStrError {
    DecodeError(base64::DecodeError),
    InvalidBytes(ed25519_dalek::SignatureError),
    InvalidByteSize(<[u8; 32] as TryFrom<Vec<u8>>>::Error),
}
