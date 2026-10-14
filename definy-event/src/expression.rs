use serde::{Deserialize, Serialize};

use crate::EventHashId;

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
    /// 未入力の式. エディタで式を消したときに入る. 評価・コンパイルはエラーになる
    Hole,
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
pub struct EqualExpression {
    pub left: Box<Expression>,
    pub right: Box<Expression>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[cfg_attr(feature = "schemars", derive(schemars::JsonSchema))]
pub struct LetBinding {
    pub variable_id: i64,
    pub variable_name: Box<str>,
    pub value: Box<Expression>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[cfg_attr(feature = "schemars", derive(schemars::JsonSchema))]
pub struct LetExpression {
    pub bindings: Vec<LetBinding>,
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

impl Expression {
    /// Bool を対象とする match 式 (`match condition { true => when_true, false => when_false }`) を作る。
    ///
    /// definy には if 式がなく、条件分岐は Bool に対する match で表す。
    pub fn match_boolean(
        condition: Expression,
        when_true: Expression,
        when_false: Expression,
    ) -> Self {
        Expression::Match(MatchExpression {
            target: Box::new(condition),
            arms: vec![
                MatchArm {
                    tag: "true".into(),
                    variable_id: None,
                    variable_name: None,
                    body: Box::new(when_true),
                },
                MatchArm {
                    tag: "false".into(),
                    variable_id: None,
                    variable_name: None,
                    body: Box::new(when_false),
                },
            ],
            default: None,
        })
    }
}
