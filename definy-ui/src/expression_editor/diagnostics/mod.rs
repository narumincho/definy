pub mod constructor;
pub mod type_check;

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
        definy_event::event::PartType::Union(_) => ExpressionType::Union,
    }
}

pub fn collect_type_diagnostics(
    state: &AppState,
    expression: &definy_event::event::Expression,
    expected_type: Option<ExpressionType>,
) -> Vec<TypeDiagnostic> {
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
    let env = HashMap::new();
    check_expression_type(
        expression,
        &Vec::new(),
        expected_type,
        &env,
        &part_type_map,
        &part_snapshot_map,
        &mut diagnostics,
    );
    diagnostics
}
