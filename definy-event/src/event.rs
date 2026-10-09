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
    strum_macros::EnumString,
    strum::VariantNames
))]
#[cfg_attr(feature = "utoipa", strum_discriminants(derive(utoipa::ToSchema)))]
pub enum EventContent {
    CreateAccount(CreateAccountEvent),
    ChangeProfile(ChangeProfileEvent),
    ModuleCommit(ModuleCommitEvent),
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[cfg_attr(feature = "schemars", derive(schemars::JsonSchema))]
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
#[cfg_attr(feature = "schemars", derive(schemars::JsonSchema))]
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

/// モジュールのコミット（スナップショット）イベント。
/// 初回コミット (`parent_commit_hash == None`) ではモジュールの作成を兼ね、そのコミットハッシュがモジュールIDとなります。
/// 2回目以降のコミット (`parent_commit_hash == Some(...)`) では、モジュールの更新を表します。
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[cfg_attr(feature = "schemars", derive(schemars::JsonSchema))]
pub struct ModuleCommitEvent {
    pub module_name: Box<str>,
    #[serde(default)]
    pub module_description: Description,
    #[serde(default)]
    pub parent_commit_hash: Option<EventHashId>,
    #[serde(default)]
    pub message: Box<str>,
    pub parts: Vec<ModulePartEntry>,
}

/// Seed データファイル（JSON / YAML）用のモジュール表現。
/// バージョン管理・ブートストラップ用の静的定義データ。
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[cfg_attr(feature = "schemars", derive(schemars::JsonSchema))]
pub struct ModuleSeed {
    #[serde(default, rename = "$schema", skip_serializing_if = "Option::is_none")]
    pub schema: Option<String>,
    pub module_name: Box<str>,
    #[serde(default)]
    pub module_description: Description,
    #[serde(default)]
    pub message: Box<str>,
    pub parts: Vec<ModulePartEntry>,
}

impl ModuleSeed {
    pub fn new(
        module_name: impl Into<Box<str>>,
        module_description: Description,
        message: impl Into<Box<str>>,
        parts: Vec<ModulePartEntry>,
    ) -> Self {
        Self {
            schema: Some("./schemas/module-seed.schema.json".to_string()),
            module_name: module_name.into(),
            module_description,
            message: message.into(),
            parts,
        }
    }

    pub fn to_module_commit_event(&self) -> ModuleCommitEvent {
        ModuleCommitEvent {
            module_name: self.module_name.clone(),
            module_description: self.module_description.clone(),
            parent_commit_hash: None,
            message: self.message.clone(),
            parts: self.parts.clone(),
        }
    }
}

impl ModuleCommitEvent {
    /// このコミット内のパーツが参照しているコンテンツハッシュ一覧を返します。
    pub fn referenced_content_hashes(&self) -> Vec<crate::content_hash::ContentHash> {
        self.parts
            .iter()
            .filter_map(|p| p.resolve_content_hash())
            .collect()
    }
}

/// アカウントとモジュール名から決定論的な Module ID を導出します。
pub fn derive_module_id(account_id: &AccountId, module_name: &str) -> EventHashId {
    use sha2::Digest;
    let mut hasher = sha2::Sha256::new();
    hasher.update(b"definy:module:");
    hasher.update(account_id.0.as_bytes());
    hasher.update(b":");
    hasher.update(module_name.as_bytes());
    EventHashId::from_bytes(&hasher.finalize())
}

/// モジュール内の各パーツの決定論的パーツ ID を導出します。
/// 同一モジュール内において、パーツ名から一意かつ不変な ID を生成します。
pub fn derive_module_part_id(module_id: &EventHashId, part_name: &str) -> EventHashId {
    use sha2::Digest;
    let mut hasher = sha2::Sha256::new();
    hasher.update(module_id.as_bytes());
    hasher.update(b":part:");
    hasher.update(part_name.as_bytes());
    EventHashId::from_bytes(&hasher.finalize())
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[cfg_attr(feature = "schemars", derive(schemars::JsonSchema))]
pub struct ModulePartEntry {
    pub name: Box<str>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub part_type: Option<PartType>,
    #[serde(default, skip_serializing_if = "Description::is_empty")]
    pub description: Description,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub content_hash: Option<crate::content_hash::ContentHash>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub expression: Option<Expression>,
}

impl ModulePartEntry {
    /// 既存の content_hash または式から計算した content_hash を取得します。
    pub fn resolve_content_hash(&self) -> Option<crate::content_hash::ContentHash> {
        self.content_hash.clone().or_else(|| {
            self.expression
                .as_ref()
                .and_then(|e| crate::content_hash::ContentHash::from_expression(e).ok())
        })
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[cfg_attr(feature = "schemars", derive(schemars::JsonSchema))]
#[serde(rename_all = "snake_case")]
pub enum PartType {
    Number,
    String,
    Boolean,
    Type,
    TypePart(EventHashId),
    List(Box<PartType>),
    Function {
        parameters: Vec<FunctionParameterType>,
        return_type: Box<PartType>,
    },
    Record(Vec<RecordFieldType>),
    Union(Vec<UnionVariantType>),
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[cfg_attr(feature = "schemars", derive(schemars::JsonSchema))]
pub struct FunctionParameterType {
    pub name: Box<str>,
    pub r#type: Box<PartType>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[cfg_attr(feature = "schemars", derive(schemars::JsonSchema))]
pub struct RecordFieldType {
    pub key: Box<str>,
    pub value: Box<PartType>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[cfg_attr(feature = "schemars", derive(schemars::JsonSchema))]
pub struct UnionVariantType {
    pub tag: Box<str>,
    pub payload: Option<Box<PartType>>,
}

impl std::fmt::Display for PartType {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            PartType::Number => write!(f, "number"),
            PartType::String => write!(f, "string"),
            PartType::Boolean => write!(f, "boolean"),
            PartType::Type => write!(f, "type"),
            PartType::TypePart(hash) => write!(f, "type-part({hash})"),
            PartType::List(item) => write!(f, "list<{item}>"),
            PartType::Function {
                parameters,
                return_type,
            } => {
                let params_text = parameters
                    .iter()
                    .map(|p| format!("{}: {}", p.name, p.r#type))
                    .collect::<Vec<_>>()
                    .join(", ");
                write!(f, "({params_text}) -> {return_type}")
            }
            PartType::Record(fields) => {
                let field_texts = fields
                    .iter()
                    .map(|f| format!("{}: {}", f.key, f.value))
                    .collect::<Vec<_>>()
                    .join(", ");
                write!(f, "{{{field_texts}}}")
            }
            PartType::Union(variants) => {
                let var_texts = variants
                    .iter()
                    .map(|v| match &v.payload {
                        Some(p) => format!("{}({p})", v.tag),
                        None => v.tag.to_string(),
                    })
                    .collect::<Vec<_>>()
                    .join(" | ");
                write!(f, "union<{var_texts}>")
            }
        }
    }
}

impl PartType {
    #[must_use]
    pub fn optional_to_string(opt: &Option<Self>) -> String {
        opt.as_ref()
            .map(|t| t.to_string())
            .unwrap_or_else(|| "none".to_string())
    }

    pub fn to_expression(&self) -> Expression {
        match self {
            PartType::Number => Expression::TypeNumber,
            PartType::String => Expression::TypeString,
            PartType::Boolean => Expression::TypeBoolean,
            PartType::Type => Expression::TypeNumber,
            PartType::TypePart(hash) => Expression::PartReference(PartReferenceExpression {
                part_definition_event_hash: hash.clone(),
                content_hash: None,
            }),
            PartType::List(item) => Expression::TypeList(TypeListExpression {
                item_type: Box::new(item.to_expression()),
            }),
            PartType::Function {
                parameters,
                return_type,
            } => Expression::TypeFunction(TypeFunctionExpression {
                parameters: parameters
                    .iter()
                    .map(|p| TypeFunctionParameter {
                        name: p.name.clone(),
                        r#type: Box::new(p.r#type.to_expression()),
                    })
                    .collect(),
                return_type: Box::new(return_type.to_expression()),
            }),
            PartType::Record(fields) => Expression::TypeLiteral(TypeLiteralExpression {
                items: fields
                    .iter()
                    .map(|f| TypeLiteralItemExpression {
                        key: f.key.clone(),
                        value: Box::new(f.value.to_expression()),
                    })
                    .collect(),
            }),
            PartType::Union(variants) => Expression::TypeUnion(TypeUnionExpression {
                variants: variants
                    .iter()
                    .map(|v| TypeUnionVariant {
                        tag: v.tag.clone(),
                        payload_type: v.payload.as_ref().map(|p| Box::new(p.to_expression())),
                    })
                    .collect(),
            }),
        }
    }

    pub fn from_expression(expr: &Expression) -> Option<PartType> {
        match expr {
            Expression::TypeNumber => Some(PartType::Number),
            Expression::TypeString => Some(PartType::String),
            Expression::TypeBoolean => Some(PartType::Boolean),
            Expression::TypeList(list_expr) => {
                let item = Self::from_expression(&list_expr.item_type)?;
                Some(PartType::List(Box::new(item)))
            }
            Expression::TypeFunction(func_expr) => {
                let mut parameters = Vec::with_capacity(func_expr.parameters.len());
                for p in &func_expr.parameters {
                    let param_type = Self::from_expression(&p.r#type)?;
                    parameters.push(FunctionParameterType {
                        name: p.name.clone(),
                        r#type: Box::new(param_type),
                    });
                }
                let return_type = Self::from_expression(&func_expr.return_type)?;
                Some(PartType::Function {
                    parameters,
                    return_type: Box::new(return_type),
                })
            }
            Expression::TypeLiteral(record_expr) => {
                let mut fields = Vec::with_capacity(record_expr.items.len());
                for item in &record_expr.items {
                    let val_type = Self::from_expression(&item.value)?;
                    fields.push(RecordFieldType {
                        key: item.key.clone(),
                        value: Box::new(val_type),
                    });
                }
                Some(PartType::Record(fields))
            }
            Expression::TypeUnion(union_expr) => {
                let mut variants = Vec::with_capacity(union_expr.variants.len());
                for v in &union_expr.variants {
                    let payload = match &v.payload_type {
                        Some(p) => Some(Box::new(Self::from_expression(p)?)),
                        None => None,
                    };
                    variants.push(UnionVariantType {
                        tag: v.tag.clone(),
                        payload,
                    });
                }
                Some(PartType::Union(variants))
            }
            Expression::PartReference(part_ref) => Some(PartType::TypePart(
                part_ref.part_definition_event_hash.clone(),
            )),
            _ => None,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[cfg_attr(feature = "schemars", derive(schemars::JsonSchema))]
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
    BitAnd(BitAndExpression),
    BitOr(BitOrExpression),
    BitXor(BitXorExpression),
    ShiftLeft(ShiftLeftExpression),
    ShiftRight(ShiftRightExpression),
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
    StringToBytes(StringToBytesExpression),
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
    RecordGet(RecordGetExpression),
    Constructor(ConstructorExpression),
    Function(FunctionExpression),
    Call(CallExpression),
    TypeFunction(TypeFunctionExpression),
    TypeUnion(TypeUnionExpression),
    Variant(VariantExpression),
    Match(MatchExpression),
    Compiler(CompilerBuiltin),
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[cfg_attr(feature = "schemars", derive(schemars::JsonSchema))]
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
    StringToBytes,
    ListLength,
    ListConcat,
    ListGet,
    ListAppend,
    NumberLiteral,
    If,
    Function,
    Call,
    BitAnd,
    BitOr,
    BitXor,
    ShiftLeft,
    ShiftRight,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[cfg_attr(feature = "schemars", derive(schemars::JsonSchema))]
pub struct AddExpression {
    pub left: Box<Expression>,
    pub right: Box<Expression>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[cfg_attr(feature = "schemars", derive(schemars::JsonSchema))]
pub struct SubtractExpression {
    pub left: Box<Expression>,
    pub right: Box<Expression>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[cfg_attr(feature = "schemars", derive(schemars::JsonSchema))]
pub struct MultiplyExpression {
    pub left: Box<Expression>,
    pub right: Box<Expression>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[cfg_attr(feature = "schemars", derive(schemars::JsonSchema))]
pub struct DivideExpression {
    pub left: Box<Expression>,
    pub right: Box<Expression>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[cfg_attr(feature = "schemars", derive(schemars::JsonSchema))]
pub struct RemainderExpression {
    pub left: Box<Expression>,
    pub right: Box<Expression>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[cfg_attr(feature = "schemars", derive(schemars::JsonSchema))]
pub struct BitAndExpression {
    pub left: Box<Expression>,
    pub right: Box<Expression>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[cfg_attr(feature = "schemars", derive(schemars::JsonSchema))]
pub struct BitOrExpression {
    pub left: Box<Expression>,
    pub right: Box<Expression>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[cfg_attr(feature = "schemars", derive(schemars::JsonSchema))]
pub struct BitXorExpression {
    pub left: Box<Expression>,
    pub right: Box<Expression>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[cfg_attr(feature = "schemars", derive(schemars::JsonSchema))]
pub struct ShiftLeftExpression {
    pub left: Box<Expression>,
    pub right: Box<Expression>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[cfg_attr(feature = "schemars", derive(schemars::JsonSchema))]
pub struct ShiftRightExpression {
    pub left: Box<Expression>,
    pub right: Box<Expression>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[cfg_attr(feature = "schemars", derive(schemars::JsonSchema))]
pub struct LessThanExpression {
    pub left: Box<Expression>,
    pub right: Box<Expression>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[cfg_attr(feature = "schemars", derive(schemars::JsonSchema))]
pub struct LessThanOrEqualExpression {
    pub left: Box<Expression>,
    pub right: Box<Expression>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[cfg_attr(feature = "schemars", derive(schemars::JsonSchema))]
pub struct GreaterThanExpression {
    pub left: Box<Expression>,
    pub right: Box<Expression>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[cfg_attr(feature = "schemars", derive(schemars::JsonSchema))]
pub struct GreaterThanOrEqualExpression {
    pub left: Box<Expression>,
    pub right: Box<Expression>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[cfg_attr(feature = "schemars", derive(schemars::JsonSchema))]
pub struct NotEqualExpression {
    pub left: Box<Expression>,
    pub right: Box<Expression>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[cfg_attr(feature = "schemars", derive(schemars::JsonSchema))]
pub struct NotExpression {
    pub value: Box<Expression>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[cfg_attr(feature = "schemars", derive(schemars::JsonSchema))]
pub struct AndExpression {
    pub left: Box<Expression>,
    pub right: Box<Expression>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[cfg_attr(feature = "schemars", derive(schemars::JsonSchema))]
pub struct OrExpression {
    pub left: Box<Expression>,
    pub right: Box<Expression>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[cfg_attr(feature = "schemars", derive(schemars::JsonSchema))]
pub struct StringConcatExpression {
    pub left: Box<Expression>,
    pub right: Box<Expression>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[cfg_attr(feature = "schemars", derive(schemars::JsonSchema))]
pub struct StringLengthExpression {
    pub value: Box<Expression>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[cfg_attr(feature = "schemars", derive(schemars::JsonSchema))]
pub struct StringSliceExpression {
    pub value: Box<Expression>,
    pub start: Box<Expression>,
    pub end: Box<Expression>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[cfg_attr(feature = "schemars", derive(schemars::JsonSchema))]
pub struct StringToBytesExpression {
    pub value: Box<Expression>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[cfg_attr(feature = "schemars", derive(schemars::JsonSchema))]
pub struct ListLengthExpression {
    pub value: Box<Expression>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[cfg_attr(feature = "schemars", derive(schemars::JsonSchema))]
pub struct ListConcatExpression {
    pub left: Box<Expression>,
    pub right: Box<Expression>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[cfg_attr(feature = "schemars", derive(schemars::JsonSchema))]
pub struct ListGetExpression {
    pub list: Box<Expression>,
    pub index: Box<Expression>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[cfg_attr(feature = "schemars", derive(schemars::JsonSchema))]
pub struct ListAppendExpression {
    pub list: Box<Expression>,
    pub item: Box<Expression>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[cfg_attr(feature = "schemars", derive(schemars::JsonSchema))]
pub struct NumberExpression {
    pub value: i64,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[cfg_attr(feature = "schemars", derive(schemars::JsonSchema))]
pub struct StringExpression {
    pub value: Box<str>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[cfg_attr(feature = "schemars", derive(schemars::JsonSchema))]
pub struct ListLiteralExpression {
    pub items: Vec<Expression>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[cfg_attr(feature = "schemars", derive(schemars::JsonSchema))]
pub struct TypeListExpression {
    pub item_type: Box<Expression>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[cfg_attr(feature = "schemars", derive(schemars::JsonSchema))]
pub struct PartReferenceExpression {
    pub part_definition_event_hash: EventHashId,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub content_hash: Option<crate::ContentHash>,
}

impl PartReferenceExpression {
    pub fn new(part_definition_event_hash: EventHashId) -> Self {
        Self {
            part_definition_event_hash,
            content_hash: None,
        }
    }

    pub fn with_content_hash(
        part_definition_event_hash: EventHashId,
        content_hash: crate::ContentHash,
    ) -> Self {
        Self {
            part_definition_event_hash,
            content_hash: Some(content_hash),
        }
    }
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[cfg_attr(feature = "schemars", derive(schemars::JsonSchema))]
pub struct BooleanExpression {
    pub value: bool,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[cfg_attr(feature = "schemars", derive(schemars::JsonSchema))]
pub struct IfExpression {
    pub condition: Box<Expression>,
    pub then_expr: Box<Expression>,
    pub else_expr: Box<Expression>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[cfg_attr(feature = "schemars", derive(schemars::JsonSchema))]
pub struct EqualExpression {
    pub left: Box<Expression>,
    pub right: Box<Expression>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[cfg_attr(feature = "schemars", derive(schemars::JsonSchema))]
pub struct LetExpression {
    pub variable_id: i64,
    pub variable_name: Box<str>,
    pub value: Box<Expression>,
    pub body: Box<Expression>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[cfg_attr(feature = "schemars", derive(schemars::JsonSchema))]
pub struct VariableExpression {
    pub variable_id: i64,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[cfg_attr(feature = "schemars", derive(schemars::JsonSchema))]
pub struct TypeLiteralExpression {
    pub items: Vec<TypeLiteralItemExpression>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[cfg_attr(feature = "schemars", derive(schemars::JsonSchema))]
pub struct TypeLiteralItemExpression {
    pub key: Box<str>,
    pub value: Box<Expression>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[cfg_attr(feature = "schemars", derive(schemars::JsonSchema))]
pub struct RecordGetExpression {
    pub record: Box<Expression>,
    #[serde(alias = "field_name")]
    pub key: Box<str>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[cfg_attr(feature = "schemars", derive(schemars::JsonSchema))]
pub struct ConstructorExpression {
    pub type_part_definition_event_hash: EventHashId,
    pub value: Box<Expression>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[cfg_attr(feature = "schemars", derive(schemars::JsonSchema))]
pub struct FunctionParameter {
    pub parameter_id: i64,
    pub parameter_name: Box<str>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[cfg_attr(feature = "schemars", derive(schemars::JsonSchema))]
pub struct FunctionExpression {
    pub parameters: Vec<FunctionParameter>,
    pub body: Box<Expression>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[cfg_attr(feature = "schemars", derive(schemars::JsonSchema))]
pub struct CallArgument {
    pub name: Box<str>,
    pub value: Box<Expression>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[cfg_attr(feature = "schemars", derive(schemars::JsonSchema))]
pub struct CallExpression {
    pub function: Box<Expression>,
    pub arguments: Vec<CallArgument>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[cfg_attr(feature = "schemars", derive(schemars::JsonSchema))]
pub struct TypeFunctionParameter {
    pub name: Box<str>,
    pub r#type: Box<Expression>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[cfg_attr(feature = "schemars", derive(schemars::JsonSchema))]
pub struct TypeFunctionExpression {
    pub parameters: Vec<TypeFunctionParameter>,
    pub return_type: Box<Expression>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[cfg_attr(feature = "schemars", derive(schemars::JsonSchema))]
pub struct TypeUnionExpression {
    pub variants: Vec<TypeUnionVariant>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[cfg_attr(feature = "schemars", derive(schemars::JsonSchema))]
pub struct TypeUnionVariant {
    pub tag: Box<str>,
    pub payload_type: Option<Box<Expression>>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[cfg_attr(feature = "schemars", derive(schemars::JsonSchema))]
pub struct VariantExpression {
    pub tag: Box<str>,
    pub payload: Option<Box<Expression>>,
    #[serde(default)]
    pub type_part_definition_event_hash: Option<EventHashId>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[cfg_attr(feature = "schemars", derive(schemars::JsonSchema))]
pub struct MatchExpression {
    pub target: Box<Expression>,
    pub arms: Vec<MatchArm>,
    #[serde(default)]
    pub default: Option<Box<Expression>>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[cfg_attr(feature = "schemars", derive(schemars::JsonSchema))]
pub struct MatchArm {
    pub tag: Box<str>,
    #[serde(default)]
    pub variable_id: Option<i64>,
    #[serde(default)]
    pub variable_name: Option<Box<str>>,
    pub body: Box<Expression>,
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

#[cfg(test)]
mod tests;
