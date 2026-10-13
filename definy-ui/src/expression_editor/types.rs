use definy_event::EventHashId;

use crate::app_state::PathStep;

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct ScopeVariable {
    pub id: i64,
    pub name: String,
}

impl ScopeVariable {
    pub fn new(id: i64, name: String) -> Self {
        Self { id, name }
    }
}

#[derive(Clone, PartialEq, Eq, Debug)]
pub struct FunctionParameterTypeInfo {
    pub name: String,
    pub r#type: ExpressionType,
}

#[derive(Clone, PartialEq, Eq, Debug)]
pub enum ExpressionType {
    Number,
    String,
    Boolean,
    Type,
    TypePart(EventHashId),
    List(Box<ExpressionType>),
    Record(Vec<(String, ExpressionType)>),
    Union,
    Function {
        parameters: Vec<FunctionParameterTypeInfo>,
        return_type: Box<ExpressionType>,
    },
    Unknown,
}

impl ExpressionType {
    pub fn text(&self) -> String {
        match self {
            ExpressionType::Number => "Number".to_string(),
            ExpressionType::String => "String".to_string(),
            ExpressionType::Boolean => "Boolean".to_string(),
            ExpressionType::Type => "Type".to_string(),
            ExpressionType::TypePart(hash) => format!("TypePart({})", hash),
            ExpressionType::List(item) => format!("list<{}>", item.text()),
            ExpressionType::Record(fields) => {
                if fields.is_empty() {
                    "{}".to_string()
                } else {
                    let inner = fields
                        .iter()
                        .map(|(k, v)| format!("{}: {}", k, v.text()))
                        .collect::<Vec<_>>()
                        .join(", ");
                    format!("{{{}}}", inner)
                }
            }
            ExpressionType::Union => "Union".to_string(),
            ExpressionType::Function {
                parameters,
                return_type,
            } => {
                let params_str = parameters
                    .iter()
                    .map(|p| format!("{}: {}", p.name, p.r#type.text()))
                    .collect::<Vec<_>>()
                    .join(", ");
                format!("({}) -> {}", params_str, return_type.text())
            }
            ExpressionType::Unknown => "Unknown".to_string(),
        }
    }
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub enum ConstructorValueShape {
    Number,
    String,
    Boolean,
    List(Box<ConstructorValueShape>),
    Record(Vec<(String, ConstructorValueShape)>),
    Unknown,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct TypeDiagnostic {
    pub path: Vec<PathStep>,
    pub message: String,
}
