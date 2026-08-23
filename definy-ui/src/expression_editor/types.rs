use definy_event::EventHashId;

use crate::app_state::PathStep;
use crate::language::Language;

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum EditorTarget {
    PartDefinition,
    PartUpdate,
}

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
pub enum ExpressionType {
    Number,
    String,
    Boolean,
    Type,
    TypePart(EventHashId),
    List(Box<ExpressionType>),
    Record,
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
            ExpressionType::Record => "Record".to_string(),
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

pub struct ExpressionEditorContext<'a> {
    pub path: Vec<PathStep>,
    pub target: EditorTarget,
    pub scope_variables: Vec<ScopeVariable>,
    pub diagnostics: &'a [TypeDiagnostic],
    pub structure_locked: bool,
    pub allow_kind_change: bool,
    pub language: Language,
}

impl<'a> ExpressionEditorContext<'a> {
    pub fn child(
        &self,
        path: Vec<PathStep>,
        scope_variables: Vec<ScopeVariable>,
        structure_locked: bool,
        allow_kind_change: bool,
    ) -> ExpressionEditorContext<'a> {
        ExpressionEditorContext {
            path,
            target: self.target,
            scope_variables,
            diagnostics: self.diagnostics,
            structure_locked,
            allow_kind_change,
            language: self.language,
        }
    }
}
