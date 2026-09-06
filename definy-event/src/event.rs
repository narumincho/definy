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
#[strum_discriminants(derive(Serialize, Deserialize, strum_macros::Display, strum::VariantNames))]
pub enum EventContent {
    CreateAccount(CreateAccountEvent),
    ChangeProfile(ChangeProfileEvent),
    PartDefinition(PartDefinitionEvent),
    PartUpdate(PartUpdateEvent),
    ModuleDefinition(ModuleDefinitionEvent),
    ModuleUpdate(ModuleUpdateEvent),
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct LocalizedText {
    pub language: Box<str>,
    pub text: Box<str>,
}

impl LocalizedText {
    pub fn new(language: impl Into<Box<str>>, text: impl Into<Box<str>>) -> Self {
        Self {
            language: language.into(),
            text: text.into(),
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(untagged)]
pub enum Description {
    Plain(Box<str>),
    Localized(Vec<LocalizedText>),
}

impl Default for Description {
    fn default() -> Self {
        Description::Plain("".into())
    }
}

impl Description {
    pub fn localized(items: Vec<(impl Into<Box<str>>, impl Into<Box<str>>)>) -> Self {
        Description::Localized(
            items
                .into_iter()
                .map(|(lang, text)| LocalizedText::new(lang, text))
                .collect(),
        )
    }

    pub fn get(&self, lang_code: &str) -> Option<&str> {
        match self {
            Description::Plain(text) => {
                if text.is_empty() {
                    None
                } else {
                    Some(text.as_ref())
                }
            }
            Description::Localized(list) => {
                if let Some(item) = list.iter().find(|item| item.language.as_ref() == lang_code) {
                    return Some(item.text.as_ref());
                }
                if let Some(item) = list.iter().find(|item| item.language.as_ref() == "en") {
                    return Some(item.text.as_ref());
                }
                list.first().map(|item| item.text.as_ref())
            }
        }
    }

    pub fn to_display_string(&self, lang_code: &str) -> String {
        self.get(lang_code).unwrap_or("").to_string()
    }

    pub fn is_empty(&self) -> bool {
        match self {
            Description::Plain(text) => text.trim().is_empty(),
            Description::Localized(list) => {
                list.is_empty() || list.iter().all(|i| i.text.trim().is_empty())
            }
        }
    }
}

impl From<&str> for Description {
    fn from(s: &str) -> Self {
        Description::Plain(s.into())
    }
}

impl From<String> for Description {
    fn from(s: String) -> Self {
        Description::Plain(s.into())
    }
}

impl From<Box<str>> for Description {
    fn from(s: Box<str>) -> Self {
        Description::Plain(s)
    }
}

impl From<Vec<LocalizedText>> for Description {
    fn from(v: Vec<LocalizedText>) -> Self {
        Description::Localized(v)
    }
}

impl std::fmt::Display for Description {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.to_display_string(""))
    }
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct PartDefinitionEvent {
    pub part_name: Box<str>,
    #[serde(default)]
    pub part_type: Option<PartType>,
    #[serde(default)]
    pub description: Description,
    #[serde(default)]
    pub expression: Option<Expression>,
    pub module_definition_event_hash: EventHashId,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct PartUpdateEvent {
    pub part_name: Box<str>,
    pub part_description: Description,
    pub part_definition_event_hash: EventHashId,
    #[serde(default)]
    pub expression: Option<Expression>,
    pub module_definition_event_hash: EventHashId,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ModuleDefinitionEvent {
    pub module_name: Box<str>,
    #[serde(default)]
    pub description: Description,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ModuleUpdateEvent {
    pub module_name: Box<str>,
    pub module_description: Description,
    pub module_definition_event_hash: EventHashId,
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
    Subtract(SubtractExpression),
    Multiply(MultiplyExpression),
    Divide(DivideExpression),
    Remainder(RemainderExpression),
    LessThan(LessThanExpression),
    LessThanOrEqual(LessThanOrEqualExpression),
    GreaterThan(GreaterThanExpression),
    GreaterThanOrEqual(GreaterThanOrEqualExpression),
    NotEqual(NotEqualExpression),
    Not(NotExpression),
    And(AndExpression),
    Or(OrExpression),
    StringConcat(StringConcatExpression),
    StringLength(StringLengthExpression),
    StringSlice(StringSliceExpression),
    ListLength(ListLengthExpression),
    ListConcat(ListConcatExpression),
    ListGet(ListGetExpression),
    ListAppend(ListAppendExpression),
    PartReference(PartReferenceExpression),
    Boolean(BooleanExpression),
    If(IfExpression),
    Equal(EqualExpression),
    Let(LetExpression),
    Variable(VariableExpression),
    #[serde(alias = "RecordLiteral")]
    TypeLiteral(TypeLiteralExpression),
    Constructor(ConstructorExpression),
    Compiler(CompilerBuiltin),
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum CompilerBuiltin {
    Let,
    Plus,
    Minus,
    Multiply,
    Divide,
    Remainder,
    LessThan,
    LessThanOrEqual,
    GreaterThan,
    GreaterThanOrEqual,
    Equal,
    NotEqual,
    Not,
    And,
    Or,
    StringConcat,
    StringLength,
    StringSlice,
    ListLength,
    ListConcat,
    ListGet,
    ListAppend,
    NumberLiteral,
    If,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct AddExpression {
    pub left: Box<Expression>,
    pub right: Box<Expression>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct SubtractExpression {
    pub left: Box<Expression>,
    pub right: Box<Expression>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct MultiplyExpression {
    pub left: Box<Expression>,
    pub right: Box<Expression>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct DivideExpression {
    pub left: Box<Expression>,
    pub right: Box<Expression>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct RemainderExpression {
    pub left: Box<Expression>,
    pub right: Box<Expression>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct LessThanExpression {
    pub left: Box<Expression>,
    pub right: Box<Expression>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct LessThanOrEqualExpression {
    pub left: Box<Expression>,
    pub right: Box<Expression>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct GreaterThanExpression {
    pub left: Box<Expression>,
    pub right: Box<Expression>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct GreaterThanOrEqualExpression {
    pub left: Box<Expression>,
    pub right: Box<Expression>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct NotEqualExpression {
    pub left: Box<Expression>,
    pub right: Box<Expression>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct NotExpression {
    pub value: Box<Expression>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct AndExpression {
    pub left: Box<Expression>,
    pub right: Box<Expression>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct OrExpression {
    pub left: Box<Expression>,
    pub right: Box<Expression>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct StringConcatExpression {
    pub left: Box<Expression>,
    pub right: Box<Expression>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct StringLengthExpression {
    pub value: Box<Expression>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct StringSliceExpression {
    pub value: Box<Expression>,
    pub start: Box<Expression>,
    pub end: Box<Expression>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ListLengthExpression {
    pub value: Box<Expression>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ListConcatExpression {
    pub left: Box<Expression>,
    pub right: Box<Expression>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ListGetExpression {
    pub list: Box<Expression>,
    pub index: Box<Expression>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ListAppendExpression {
    pub list: Box<Expression>,
    pub item: Box<Expression>,
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
