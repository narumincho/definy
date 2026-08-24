use std::collections::HashMap;

use definy_event::EventHashId;

use crate::app_state::{AppState, PathStep};
use crate::part_projection::{PartSnapshot, collect_part_snapshots, find_part_snapshot};

use super::types::{ConstructorValueShape, EditorTarget, ExpressionType, TypeDiagnostic};

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
    }
}

pub fn expected_type_for_target(state: &AppState, target: EditorTarget) -> Option<ExpressionType> {
    match target {
        EditorTarget::PartDefinition => state
            .part_definition_form
            .part_type_input
            .as_ref()
            .map(part_type_to_expression_type),
        EditorTarget::PartUpdate => {
            let hash = match &state.part_update_form.part_definition_event_hash {
                Some(hash) => hash,
                _ => return None,
            };
            find_part_snapshot(state, hash)
                .and_then(|snapshot| snapshot.part_type)
                .as_ref()
                .map(part_type_to_expression_type)
        }
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

fn push_type_mismatch_diagnostic(
    diagnostics: &mut Vec<TypeDiagnostic>,
    path: &[PathStep],
    expected_type: &ExpressionType,
    actual_type: &ExpressionType,
) {
    if actual_type == &ExpressionType::Unknown || expected_type == actual_type {
        return;
    }
    diagnostics.push(TypeDiagnostic {
        path: path.to_vec(),
        message: format!(
            "Type mismatch: expected {}, but found {}.",
            expected_type.text(),
            actual_type.text()
        ),
    });
}

fn check_expression_type(
    expression: &definy_event::event::Expression,
    path: &[PathStep],
    expected_type: Option<ExpressionType>,
    env: &HashMap<i64, ExpressionType>,
    part_type_map: &HashMap<EventHashId, ExpressionType>,
    part_snapshot_map: &HashMap<EventHashId, PartSnapshot>,
    diagnostics: &mut Vec<TypeDiagnostic>,
) -> ExpressionType {
    let actual_type = match expression {
        definy_event::event::Expression::Number(_) => ExpressionType::Number,
        definy_event::event::Expression::String(_) => ExpressionType::String,
        definy_event::event::Expression::TypeNumber
        | definy_event::event::Expression::TypeString
        | definy_event::event::Expression::TypeBoolean => ExpressionType::Type,
        definy_event::event::Expression::TypeList(type_list_expression) => {
            let mut item_type_path = path.to_vec();
            item_type_path.push(PathStep::TypeListItem);
            check_expression_type(
                type_list_expression.item_type.as_ref(),
                item_type_path.as_slice(),
                Some(ExpressionType::Type),
                env,
                part_type_map,
                part_snapshot_map,
                diagnostics,
            );
            ExpressionType::Type
        }
        definy_event::event::Expression::Boolean(_) => ExpressionType::Boolean,
        definy_event::event::Expression::ListLiteral(list_expression) => {
            let expected_item_type =
                if let Some(ExpressionType::List(item_type)) = expected_type.as_ref() {
                    Some(item_type.as_ref().clone())
                } else {
                    None
                };
            let mut inferred_item_type = expected_item_type.clone();
            for (index, item) in list_expression.items.iter().enumerate() {
                let mut item_path = path.to_vec();
                item_path.push(PathStep::ListItemValue(index));
                let item_type = check_expression_type(
                    item,
                    item_path.as_slice(),
                    expected_item_type.clone(),
                    env,
                    part_type_map,
                    part_snapshot_map,
                    diagnostics,
                );
                if inferred_item_type.is_none() && item_type != ExpressionType::Unknown {
                    inferred_item_type = Some(item_type);
                }
            }
            ExpressionType::List(Box::new(
                inferred_item_type.unwrap_or(ExpressionType::Unknown),
            ))
        }
        definy_event::event::Expression::Variable(variable_expression) => env
            .get(&variable_expression.variable_id)
            .cloned()
            .unwrap_or(ExpressionType::Unknown),
        definy_event::event::Expression::PartReference(part_reference_expression) => part_type_map
            .get(&part_reference_expression.part_definition_event_hash)
            .cloned()
            .unwrap_or(ExpressionType::Unknown),
        definy_event::event::Expression::TypeLiteral(record_expression) => {
            let item_expected_type = if expected_type == Some(ExpressionType::Type) {
                Some(ExpressionType::Type)
            } else {
                None
            };
            for (index, item) in record_expression.items.iter().enumerate() {
                let mut item_path = path.to_vec();
                item_path.push(PathStep::RecordItemValue(index));
                check_expression_type(
                    item.value.as_ref(),
                    item_path.as_slice(),
                    item_expected_type.clone(),
                    env,
                    part_type_map,
                    part_snapshot_map,
                    diagnostics,
                );
            }
            if expected_type == Some(ExpressionType::Type) {
                ExpressionType::Type
            } else {
                ExpressionType::Record
            }
        }
        definy_event::event::Expression::Add(add_expression) => {
            let mut left_path = path.to_vec();
            left_path.push(PathStep::Left);
            let left_type = check_expression_type(
                add_expression.left.as_ref(),
                left_path.as_slice(),
                Some(ExpressionType::Number),
                env,
                part_type_map,
                part_snapshot_map,
                diagnostics,
            );
            let mut right_path = path.to_vec();
            right_path.push(PathStep::Right);
            let right_type = check_expression_type(
                add_expression.right.as_ref(),
                right_path.as_slice(),
                Some(ExpressionType::Number),
                env,
                part_type_map,
                part_snapshot_map,
                diagnostics,
            );

            if left_type == ExpressionType::Number && right_type == ExpressionType::Number {
                ExpressionType::Number
            } else {
                ExpressionType::Unknown
            }
        }
        definy_event::event::Expression::Equal(equal_expression) => {
            let mut left_path = path.to_vec();
            left_path.push(PathStep::Left);
            let left_type = check_expression_type(
                equal_expression.left.as_ref(),
                left_path.as_slice(),
                None,
                env,
                part_type_map,
                part_snapshot_map,
                diagnostics,
            );
            let mut right_path = path.to_vec();
            right_path.push(PathStep::Right);
            let right_type = check_expression_type(
                equal_expression.right.as_ref(),
                right_path.as_slice(),
                None,
                env,
                part_type_map,
                part_snapshot_map,
                diagnostics,
            );
            if left_type != ExpressionType::Unknown
                && right_type != ExpressionType::Unknown
                && left_type != right_type
            {
                push_type_mismatch_diagnostic(
                    diagnostics,
                    right_path.as_slice(),
                    &left_type,
                    &right_type,
                );
            }
            ExpressionType::Boolean
        }
        definy_event::event::Expression::If(if_expression) => {
            let mut condition_path = path.to_vec();
            condition_path.push(PathStep::Condition);
            check_expression_type(
                if_expression.condition.as_ref(),
                condition_path.as_slice(),
                Some(ExpressionType::Boolean),
                env,
                part_type_map,
                part_snapshot_map,
                diagnostics,
            );
            let mut then_path = path.to_vec();
            then_path.push(PathStep::Then);
            let then_type = check_expression_type(
                if_expression.then_expr.as_ref(),
                then_path.as_slice(),
                expected_type.clone(),
                env,
                part_type_map,
                part_snapshot_map,
                diagnostics,
            );
            let mut else_path = path.to_vec();
            else_path.push(PathStep::Else);
            let else_type = check_expression_type(
                if_expression.else_expr.as_ref(),
                else_path.as_slice(),
                expected_type.clone(),
                env,
                part_type_map,
                part_snapshot_map,
                diagnostics,
            );

            if then_type != ExpressionType::Unknown
                && else_type != ExpressionType::Unknown
                && then_type != else_type
            {
                push_type_mismatch_diagnostic(
                    diagnostics,
                    else_path.as_slice(),
                    &then_type,
                    &else_type,
                );
                ExpressionType::Unknown
            } else if then_type != ExpressionType::Unknown {
                then_type
            } else {
                else_type
            }
        }
        definy_event::event::Expression::Let(let_expression) => {
            let mut value_path = path.to_vec();
            value_path.push(PathStep::LetValue);
            let value_type = check_expression_type(
                let_expression.value.as_ref(),
                value_path.as_slice(),
                None,
                env,
                part_type_map,
                part_snapshot_map,
                diagnostics,
            );
            let mut body_env = env.clone();
            body_env.insert(let_expression.variable_id, value_type);
            let mut body_path = path.to_vec();
            body_path.push(PathStep::LetBody);
            check_expression_type(
                let_expression.body.as_ref(),
                body_path.as_slice(),
                expected_type.clone(),
                &body_env,
                part_type_map,
                part_snapshot_map,
                diagnostics,
            )
        }
        definy_event::event::Expression::Constructor(constructor_expression) => {
            let inferred_shape = infer_constructor_shape_from_type_part(
                part_snapshot_map,
                &constructor_expression.type_part_definition_event_hash,
            );
            let mut value_path = path.to_vec();
            value_path.push(PathStep::ConstructorValue);
            let expected_value_type = expression_type_from_constructor_shape(&inferred_shape);
            if let ConstructorValueShape::Record(fields) = &inferred_shape {
                if let definy_event::event::Expression::TypeLiteral(record_expression) =
                    constructor_expression.value.as_ref()
                {
                    for (index, (field_name, field_shape)) in fields.iter().enumerate() {
                        if let Some(item) = record_expression.items.get(index) {
                            if item.key.as_ref() != field_name.as_str() {
                                diagnostics.push(TypeDiagnostic {
                                    path: value_path.clone(),
                                    message: format!(
                                        "Field name mismatch: expected {}, but found {}",
                                        field_name, item.key
                                    ),
                                });
                            }
                            let field_expected_type =
                                expression_type_from_constructor_shape(field_shape);
                            let mut field_path = value_path.clone();
                            field_path.push(PathStep::RecordItemValue(index));
                            check_expression_type(
                                item.value.as_ref(),
                                field_path.as_slice(),
                                Some(field_expected_type),
                                env,
                                part_type_map,
                                part_snapshot_map,
                                diagnostics,
                            );
                        } else {
                            diagnostics.push(TypeDiagnostic {
                                path: value_path.clone(),
                                message: format!("Missing field: {}", field_name),
                            });
                        }
                    }
                    if record_expression.items.len() > fields.len() {
                        diagnostics.push(TypeDiagnostic {
                            path: value_path.clone(),
                            message: "Extra fields in record".to_string(),
                        });
                    }
                } else {
                    push_type_mismatch_diagnostic(
                        diagnostics,
                        value_path.as_slice(),
                        &expected_value_type,
                        &check_expression_type(
                            constructor_expression.value.as_ref(),
                            value_path.as_slice(),
                            None,
                            env,
                            part_type_map,
                            part_snapshot_map,
                            &mut Vec::new(),
                        ),
                    );
                }
            } else {
                check_expression_type(
                    constructor_expression.value.as_ref(),
                    value_path.as_slice(),
                    Some(expected_value_type),
                    env,
                    part_type_map,
                    part_snapshot_map,
                    diagnostics,
                );
            }
            ExpressionType::TypePart(
                constructor_expression
                    .type_part_definition_event_hash
                    .clone(),
            )
        }
        definy_event::event::Expression::Compiler(_) => ExpressionType::Unknown,
    };

    if let Some(expected_type) = expected_type {
        push_type_mismatch_diagnostic(diagnostics, path, &expected_type, &actual_type);
    }

    actual_type
}

fn expression_type_from_constructor_shape(shape: &ConstructorValueShape) -> ExpressionType {
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

fn infer_constructor_shape_from_type_part_with_visited(
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
    let shape = infer_constructor_shape_from_type_expression(
        snapshot.expression.clone(),
        part_snapshot_map,
        visited,
    );
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
