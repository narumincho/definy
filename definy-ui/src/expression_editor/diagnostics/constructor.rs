use std::collections::HashMap;

use definy_event::EventHashId;

use crate::app_state::AppState;
use crate::part_projection::{PartSnapshot, collect_part_snapshots};

use super::super::types::{ConstructorValueShape, ExpressionType};

pub(crate) fn expression_type_from_constructor_shape(
    shape: &ConstructorValueShape,
) -> ExpressionType {
    match shape {
        ConstructorValueShape::Number => ExpressionType::Number,
        ConstructorValueShape::String => ExpressionType::String,
        ConstructorValueShape::Boolean => ExpressionType::Boolean,
        ConstructorValueShape::List(item_shape) => ExpressionType::List(Box::new(
            expression_type_from_constructor_shape(item_shape.as_ref()),
        )),
        ConstructorValueShape::Record(_) => ExpressionType::Record,
        ConstructorValueShape::Unknown => ExpressionType::Unknown,
    }
}

pub fn infer_constructor_shape_from_type_part(
    part_snapshot_map: &HashMap<EventHashId, PartSnapshot>,
    type_part_definition_event_hash: &EventHashId,
) -> ConstructorValueShape {
    let mut visited = Vec::new();
    infer_constructor_shape_from_type_part_with_visited(
        part_snapshot_map,
        type_part_definition_event_hash,
        &mut visited,
    )
}

pub(crate) fn infer_constructor_shape_from_type_part_with_visited(
    part_snapshot_map: &HashMap<EventHashId, PartSnapshot>,
    type_part_definition_event_hash: &EventHashId,
    visited: &mut Vec<EventHashId>,
) -> ConstructorValueShape {
    if visited.contains(type_part_definition_event_hash) {
        return ConstructorValueShape::Unknown;
    }
    let Some(snapshot) = part_snapshot_map.get(type_part_definition_event_hash) else {
        return ConstructorValueShape::Unknown;
    };
    visited.push(type_part_definition_event_hash.clone());
    let Some(expression) = snapshot.expression.clone() else {
        visited.pop();
        return ConstructorValueShape::Unknown;
    };
    let shape =
        infer_constructor_shape_from_type_expression(expression, part_snapshot_map, visited);
    visited.pop();
    shape
}

fn infer_constructor_shape_from_type_expression(
    expression: definy_event::event::Expression,
    part_snapshot_map: &HashMap<EventHashId, PartSnapshot>,
    visited: &mut Vec<EventHashId>,
) -> ConstructorValueShape {
    match expression {
        definy_event::event::Expression::Number(_) => ConstructorValueShape::Number,
        definy_event::event::Expression::String(_) => ConstructorValueShape::String,
        definy_event::event::Expression::TypeNumber => ConstructorValueShape::Number,
        definy_event::event::Expression::TypeString => ConstructorValueShape::String,
        definy_event::event::Expression::TypeBoolean => ConstructorValueShape::Boolean,
        definy_event::event::Expression::TypeList(type_list_expression) => {
            ConstructorValueShape::List(Box::new(infer_constructor_shape_from_type_expression(
                type_list_expression.item_type.as_ref().clone(),
                part_snapshot_map,
                visited,
            )))
        }
        definy_event::event::Expression::Boolean(_) => ConstructorValueShape::Boolean,
        definy_event::event::Expression::ListLiteral(list_expression) => {
            if let Some(first) = list_expression.items.first() {
                ConstructorValueShape::List(Box::new(infer_constructor_shape_from_type_expression(
                    first.clone(),
                    part_snapshot_map,
                    visited,
                )))
            } else {
                ConstructorValueShape::List(Box::new(ConstructorValueShape::Unknown))
            }
        }
        definy_event::event::Expression::TypeLiteral(record_expression) => {
            ConstructorValueShape::Record(
                record_expression
                    .items
                    .iter()
                    .map(|item| {
                        (
                            item.key.to_string(),
                            infer_constructor_shape_from_type_expression(
                                item.value.as_ref().clone(),
                                part_snapshot_map,
                                visited,
                            ),
                        )
                    })
                    .collect(),
            )
        }
        definy_event::event::Expression::PartReference(part_reference_expression) => {
            infer_constructor_shape_from_type_part_with_visited(
                part_snapshot_map,
                &part_reference_expression.part_definition_event_hash,
                visited,
            )
        }
        _ => ConstructorValueShape::Unknown,
    }
}

pub fn default_expression_from_constructor_shape(
    shape: &ConstructorValueShape,
) -> definy_event::event::Expression {
    match shape {
        ConstructorValueShape::Number => {
            definy_event::event::Expression::Number(definy_event::event::NumberExpression {
                value: 0,
            })
        }
        ConstructorValueShape::String => {
            definy_event::event::Expression::String(definy_event::event::StringExpression {
                value: "".into(),
            })
        }
        ConstructorValueShape::Boolean => {
            definy_event::event::Expression::Boolean(definy_event::event::BooleanExpression {
                value: false,
            })
        }
        ConstructorValueShape::List(item_shape) => definy_event::event::Expression::ListLiteral(
            definy_event::event::ListLiteralExpression {
                items: vec![default_expression_from_constructor_shape(
                    item_shape.as_ref(),
                )],
            },
        ),
        ConstructorValueShape::Record(items) => definy_event::event::Expression::TypeLiteral(
            definy_event::event::TypeLiteralExpression {
                items: items
                    .iter()
                    .map(
                        |(key, item_shape)| definy_event::event::TypeLiteralItemExpression {
                            key: key.clone().into(),
                            value: Box::new(default_expression_from_constructor_shape(item_shape)),
                        },
                    )
                    .collect(),
            },
        ),
        ConstructorValueShape::Unknown => {
            definy_event::event::Expression::Number(definy_event::event::NumberExpression {
                value: 0,
            })
        }
    }
}

pub fn constructor_default_value_from_type_part(
    state: &AppState,
    type_part_definition_event_hash: &EventHashId,
) -> definy_event::event::Expression {
    let part_snapshot_map = collect_part_snapshots(state)
        .into_iter()
        .map(|snapshot| (snapshot.definition_event_hash.clone(), snapshot))
        .collect::<HashMap<EventHashId, PartSnapshot>>();
    let shape =
        infer_constructor_shape_from_type_part(&part_snapshot_map, type_part_definition_event_hash);
    default_expression_from_constructor_shape(&shape)
}
