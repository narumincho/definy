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

    /// `lang_code` の言語の説明を `text` にした説明を返す. 他の言語の説明は残す.
    ///
    /// UI は表示中の言語の説明だけを編集するため, 保存のときに他の言語の説明を消さないよう
    /// これを使う. `text` が今表示している説明と同じなら (表示が別の言語へのフォールバックでも) 何も変えない
    pub fn with_text(&self, lang_code: &str, text: &str) -> Description {
        if self.to_display_string(lang_code) == text {
            return self.clone();
        }
        match self {
            Description::Plain(_) => Description::Plain(text.into()),
            Description::Localized(list) => {
                let mut list = list.clone();
                match list
                    .iter_mut()
                    .find(|item| item.language.as_ref() == lang_code)
                {
                    Some(item) => item.text = text.into(),
                    None => list.push(LocalizedText::new(lang_code, text)),
                }
                Description::Localized(list)
            }
        }
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
        write!(f, "{}", self.to_string_with_type_part_names(&|_| None))
    }
}

impl PartType {
    /// 型を文字列にする. 型パーツの参照は `type_part_name` が名前を返せばその名前,
    /// 返さなければ `type-part(ハッシュ)` と書く
    #[must_use]
    pub fn to_string_with_type_part_names(
        &self,
        type_part_name: &dyn Fn(&EventHashId) -> Option<String>,
    ) -> String {
        let text = |t: &PartType| t.to_string_with_type_part_names(type_part_name);
        match self {
            PartType::Number => "number".to_string(),
            PartType::String => "string".to_string(),
            PartType::Boolean => "boolean".to_string(),
            PartType::Type => "type".to_string(),
            PartType::TypePart(hash) => {
                type_part_name(hash).unwrap_or_else(|| format!("type-part({hash})"))
            }
            PartType::List(item) => format!("list<{}>", text(item)),
            PartType::Function {
                parameters,
                return_type,
            } => {
                let params_text = parameters
                    .iter()
                    .map(|p| format!("{}: {}", p.name, text(&p.r#type)))
                    .collect::<Vec<_>>()
                    .join(", ");
                format!("({params_text}) -> {}", text(return_type))
            }
            PartType::Record(fields) => {
                let field_texts = fields
                    .iter()
                    .map(|f| format!("{}: {}", f.key, text(&f.value)))
                    .collect::<Vec<_>>()
                    .join(", ");
                format!("{{{field_texts}}}")
            }
            PartType::Union(variants) => {
                let var_texts = variants
                    .iter()
                    .map(|v| match &v.payload {
                        Some(p) => format!("{}({})", v.tag, text(p)),
                        None => v.tag.to_string(),
                    })
                    .collect::<Vec<_>>()
                    .join(" | ");
                format!("union<{var_texts}>")
            }
        }
    }

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

pub use crate::expression::*;

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
