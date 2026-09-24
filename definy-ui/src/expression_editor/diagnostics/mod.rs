pub mod constructor;
#[cfg(test)]
mod tests;
pub mod type_check;
pub mod type_check_binary;

use std::collections::HashMap;

use definy_event::EventHashId;

use crate::app_state::AppState;
use crate::part_projection::{PartSnapshot, collect_part_snapshots};

use super::types::{ExpressionType, TypeDiagnostic};

pub use constructor::*;
pub(crate) use type_check::*;

pub fn part_type_to_expression_type(part_type: &definy_event::event::PartType) -> ExpressionType {
    match part_type {
        definy_event::event::PartType::Number => ExpressionType::Number,
        definy_event::event::PartType::String => ExpressionType::String,
        definy_event::event::PartType::Boolean => ExpressionType::Boolean,
        definy_event::event::PartType::Type => ExpressionType::Type,
        definy_event::event::PartType::TypePart(hash) => ExpressionType::TypePart(hash.clone()),
        definy_event::event::PartType::List(item_type) => {
            ExpressionType::List(Box::new(part_type_to_expression_type(item_type.as_ref())))
        }
        definy_event::event::PartType::Function {
            parameter,
            return_type,
        } => ExpressionType::Function {
            parameter: Box::new(part_type_to_expression_type(parameter.as_ref())),
            return_type: Box::new(part_type_to_expression_type(return_type.as_ref())),
        },
        definy_event::event::PartType::Record(_) => ExpressionType::Record,
        definy_event::event::PartType::Union(_) => ExpressionType::Union,
    }
}

#[derive(Clone, Debug, Default)]
pub struct TypeAnalysis {
    pub diagnostics: Vec<TypeDiagnostic>,
    pub expected_types: HashMap<Vec<crate::app_state::PathStep>, ExpressionType>,
    pub variable_types: HashMap<i64, ExpressionType>,
}

pub fn analyze_expression_types(
    state: &AppState,
    expression: &definy_event::event::Expression,
    expected_type: Option<ExpressionType>,
) -> TypeAnalysis {
    let snapshots = collect_part_snapshots(state);
    let part_type_map = snapshots
        .iter()
        .filter_map(|snapshot| {
            snapshot.part_type.as_ref().map(|part_type| {
                (
                    snapshot.definition_event_hash.clone(),
                    part_type_to_expression_type(part_type),
                )
            })
        })
        .collect::<HashMap<EventHashId, ExpressionType>>();
    let part_snapshot_map = snapshots
        .into_iter()
        .map(|snapshot| (snapshot.definition_event_hash.clone(), snapshot))
        .collect::<HashMap<EventHashId, PartSnapshot>>();

    let mut diagnostics = Vec::new();
    let mut expected_types = HashMap::new();
    let mut variable_types = HashMap::new();
    let env = HashMap::new();
    let mut ctx = TypeCheckContext::new(
        &env,
        &part_type_map,
        &part_snapshot_map,
        &mut diagnostics,
        &mut expected_types,
        &mut variable_types,
    );
    ctx.check(expression, &Vec::new(), expected_type);
    TypeAnalysis {
        diagnostics,
        expected_types,
        variable_types,
    }
}

pub fn collect_type_diagnostics(
    state: &AppState,
    expression: &definy_event::event::Expression,
    expected_type: Option<ExpressionType>,
) -> Vec<TypeDiagnostic> {
    analyze_expression_types(state, expression, expected_type).diagnostics
}
