use std::collections::HashMap;

use definy_event::EventHashId;

use crate::app_state::PathStep;
use crate::part_projection::PartSnapshot;

use super::super::types::{ConstructorValueShape, ExpressionType, TypeDiagnostic};
use super::constructor::{
    expression_type_from_constructor_shape, infer_constructor_shape_from_type_part,
};
use super::type_check_binary::{
    check_binary_arithmetic, check_binary_boolean, check_binary_comparison_numbers,
    check_binary_equality,
};

pub(crate) struct TypeCheckContext<'a> {
    pub env: &'a HashMap<i64, ExpressionType>,
    pub part_type_map: &'a HashMap<EventHashId, ExpressionType>,
    pub part_snapshot_map: &'a HashMap<EventHashId, PartSnapshot>,
    pub diagnostics: &'a mut Vec<TypeDiagnostic>,
    pub expected_types: &'a mut HashMap<Vec<PathStep>, ExpressionType>,
    pub variable_types: &'a mut HashMap<i64, ExpressionType>,
}

impl<'a> TypeCheckContext<'a> {
    pub fn new(
        env: &'a HashMap<i64, ExpressionType>,
        part_type_map: &'a HashMap<EventHashId, ExpressionType>,
        part_snapshot_map: &'a HashMap<EventHashId, PartSnapshot>,
        diagnostics: &'a mut Vec<TypeDiagnostic>,
        expected_types: &'a mut HashMap<Vec<PathStep>, ExpressionType>,
        variable_types: &'a mut HashMap<i64, ExpressionType>,
    ) -> Self {
        Self {
            env,
            part_type_map,
            part_snapshot_map,
            diagnostics,
            expected_types,
            variable_types,
        }
    }

    pub fn push_mismatch(
        &mut self,
        path: &[PathStep],
        expected_type: &ExpressionType,
        actual_type: &ExpressionType,
    ) {
        push_type_mismatch_diagnostic(self.diagnostics, path, expected_type, actual_type);
    }

    pub fn check(
        &mut self,
        expression: &definy_event::event::Expression,
        path: &[PathStep],
        expected_type: Option<ExpressionType>,
    ) -> ExpressionType {
        check_expression_type_with_context(expression, path, expected_type, self)
    }
}

pub(crate) fn push_type_mismatch_diagnostic(
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

fn check_expression_type_with_context(
    expression: &definy_event::event::Expression,
    path: &[PathStep],
    expected_type: Option<ExpressionType>,
    ctx: &mut TypeCheckContext<'_>,
) -> ExpressionType {
    if let Some(expected) = &expected_type {
        ctx.expected_types.insert(path.to_vec(), expected.clone());
    }
    let actual_type = match expression {
        definy_event::event::Expression::Number(_) => ExpressionType::Number,
        definy_event::event::Expression::String(_) => ExpressionType::String,
        definy_event::event::Expression::TypeNumber
        | definy_event::event::Expression::TypeString
        | definy_event::event::Expression::TypeBoolean => ExpressionType::Type,
        definy_event::event::Expression::TypeList(type_list_expression) => {
            let mut item_type_path = path.to_vec();
            item_type_path.push(PathStep::TypeListItem);
            ctx.check(
                type_list_expression.item_type.as_ref(),
                &item_type_path,
                Some(ExpressionType::Type),
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
                let item_type = ctx.check(item, &item_path, expected_item_type.clone());
                if inferred_item_type.is_none() && item_type != ExpressionType::Unknown {
                    inferred_item_type = Some(item_type);
                }
            }
            ExpressionType::List(Box::new(
                inferred_item_type.unwrap_or(ExpressionType::Unknown),
            ))
        }
        definy_event::event::Expression::Variable(variable_expression) => ctx
            .env
            .get(&variable_expression.variable_id)
            .cloned()
            .unwrap_or(ExpressionType::Unknown),
        definy_event::event::Expression::PartReference(part_reference_expression) => ctx
            .part_type_map
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
                ctx.check(item.value.as_ref(), &item_path, item_expected_type.clone());
            }
            if expected_type == Some(ExpressionType::Type) {
                ExpressionType::Type
            } else {
                ExpressionType::Record
            }
        }
        definy_event::event::Expression::Add(add_expression) => {
            check_binary_arithmetic(&add_expression.left, &add_expression.right, path, ctx)
        }
        definy_event::event::Expression::Subtract(sub_expression) => {
            check_binary_arithmetic(&sub_expression.left, &sub_expression.right, path, ctx)
        }
        definy_event::event::Expression::Multiply(mul_expression) => {
            check_binary_arithmetic(&mul_expression.left, &mul_expression.right, path, ctx)
        }
        definy_event::event::Expression::Divide(div_expression) => {
            check_binary_arithmetic(&div_expression.left, &div_expression.right, path, ctx)
        }
        definy_event::event::Expression::Remainder(rem_expression) => {
            check_binary_arithmetic(&rem_expression.left, &rem_expression.right, path, ctx)
        }
        definy_event::event::Expression::LessThan(lt_expression) => {
            check_binary_comparison_numbers(&lt_expression.left, &lt_expression.right, path, ctx)
        }
        definy_event::event::Expression::LessThanOrEqual(le_expression) => {
            check_binary_comparison_numbers(&le_expression.left, &le_expression.right, path, ctx)
        }
        definy_event::event::Expression::GreaterThan(gt_expression) => {
            check_binary_comparison_numbers(&gt_expression.left, &gt_expression.right, path, ctx)
        }
        definy_event::event::Expression::GreaterThanOrEqual(ge_expression) => {
            check_binary_comparison_numbers(&ge_expression.left, &ge_expression.right, path, ctx)
        }
        definy_event::event::Expression::Not(not_expression) => {
            let mut value_path = path.to_vec();
            value_path.push(PathStep::Condition);
            ctx.check(
                not_expression.value.as_ref(),
                &value_path,
                Some(ExpressionType::Boolean),
            );
            ExpressionType::Boolean
        }
        definy_event::event::Expression::And(and_expression) => {
            check_binary_boolean(&and_expression.left, &and_expression.right, path, ctx)
        }
        definy_event::event::Expression::Or(or_expression) => {
            check_binary_boolean(&or_expression.left, &or_expression.right, path, ctx)
        }
        definy_event::event::Expression::Equal(equal_expression) => {
            check_binary_equality(&equal_expression.left, &equal_expression.right, path, ctx)
        }
        definy_event::event::Expression::NotEqual(ne_expression) => {
            check_binary_equality(&ne_expression.left, &ne_expression.right, path, ctx)
        }
        definy_event::event::Expression::StringConcat(concat_expr) => {
            let mut left_path = path.to_vec();
            left_path.push(PathStep::Left);
            ctx.check(
                concat_expr.left.as_ref(),
                &left_path,
                Some(ExpressionType::String),
            );
            let mut right_path = path.to_vec();
            right_path.push(PathStep::Right);
            ctx.check(
                concat_expr.right.as_ref(),
                &right_path,
                Some(ExpressionType::String),
            );
            ExpressionType::String
        }
        definy_event::event::Expression::StringLength(len_expr) => {
            let mut val_path = path.to_vec();
            val_path.push(PathStep::Condition);
            ctx.check(
                len_expr.value.as_ref(),
                &val_path,
                Some(ExpressionType::String),
            );
            ExpressionType::Number
        }
        definy_event::event::Expression::StringSlice(slice_expr) => {
            let mut val_path = path.to_vec();
            val_path.push(PathStep::Condition);
            ctx.check(
                slice_expr.value.as_ref(),
                &val_path,
                Some(ExpressionType::String),
            );
            let mut start_path = path.to_vec();
            start_path.push(PathStep::Start);
            ctx.check(
                slice_expr.start.as_ref(),
                &start_path,
                Some(ExpressionType::Number),
            );
            let mut end_path = path.to_vec();
            end_path.push(PathStep::End);
            ctx.check(
                slice_expr.end.as_ref(),
                &end_path,
                Some(ExpressionType::Number),
            );
            ExpressionType::String
        }
        definy_event::event::Expression::ListLength(len_expr) => {
            let mut val_path = path.to_vec();
            val_path.push(PathStep::Condition);
            ctx.check(
                len_expr.value.as_ref(),
                &val_path,
                Some(ExpressionType::List(Box::new(ExpressionType::Unknown))),
            );
            ExpressionType::Number
        }
        definy_event::event::Expression::ListConcat(concat_expr) => {
            let item_expected = match expected_type.as_ref() {
                Some(ExpressionType::List(item)) => Some(ExpressionType::List(item.clone())),
                _ => None,
            };
            let mut left_path = path.to_vec();
            left_path.push(PathStep::Left);
            let left_type = ctx.check(concat_expr.left.as_ref(), &left_path, item_expected.clone());
            let mut right_path = path.to_vec();
            right_path.push(PathStep::Right);
            let right_type = ctx.check(concat_expr.right.as_ref(), &right_path, item_expected);
            match (left_type, right_type) {
                (ExpressionType::List(left_item), ExpressionType::List(right_item)) => {
                    if *left_item != ExpressionType::Unknown {
                        ExpressionType::List(left_item)
                    } else {
                        ExpressionType::List(right_item)
                    }
                }
                (ExpressionType::List(item), _) => ExpressionType::List(item),
                (_, ExpressionType::List(item)) => ExpressionType::List(item),
                _ => ExpressionType::List(Box::new(ExpressionType::Unknown)),
            }
        }
        definy_event::event::Expression::ListGet(get_expr) => {
            let mut list_path = path.to_vec();
            list_path.push(PathStep::Left);
            let expected_list = expected_type
                .as_ref()
                .map(|t| ExpressionType::List(Box::new(t.clone())));
            let list_type = ctx.check(get_expr.list.as_ref(), &list_path, expected_list);
            let mut idx_path = path.to_vec();
            idx_path.push(PathStep::Index);
            ctx.check(
                get_expr.index.as_ref(),
                &idx_path,
                Some(ExpressionType::Number),
            );
            match list_type {
                ExpressionType::List(item_type) => *item_type,
                _ => ExpressionType::Unknown,
            }
        }
        definy_event::event::Expression::ListAppend(append_expr) => {
            let item_expected = match expected_type.as_ref() {
                Some(ExpressionType::List(item)) => Some(*item.clone()),
                _ => None,
            };
            let mut list_path = path.to_vec();
            list_path.push(PathStep::Left);
            let list_type = ctx.check(
                append_expr.list.as_ref(),
                &list_path,
                item_expected
                    .as_ref()
                    .map(|t| ExpressionType::List(Box::new(t.clone()))),
            );
            let inferred_item = match list_type {
                ExpressionType::List(item) if *item != ExpressionType::Unknown => Some(*item),
                _ => item_expected,
            };
            let mut item_path = path.to_vec();
            item_path.push(PathStep::Item);
            let item_type = ctx.check(append_expr.item.as_ref(), &item_path, inferred_item.clone());
            let final_item = inferred_item.unwrap_or(item_type);
            ExpressionType::List(Box::new(final_item))
        }
        definy_event::event::Expression::If(if_expression) => {
            let mut condition_path = path.to_vec();
            condition_path.push(PathStep::Condition);
            ctx.check(
                if_expression.condition.as_ref(),
                &condition_path,
                Some(ExpressionType::Boolean),
            );
            let mut then_path = path.to_vec();
            then_path.push(PathStep::Then);
            let then_type = ctx.check(
                if_expression.then_expr.as_ref(),
                &then_path,
                expected_type.clone(),
            );
            let mut else_path = path.to_vec();
            else_path.push(PathStep::Else);
            let else_type = ctx.check(
                if_expression.else_expr.as_ref(),
                &else_path,
                expected_type.clone(),
            );

            if then_type != ExpressionType::Unknown
                && else_type != ExpressionType::Unknown
                && then_type != else_type
            {
                ctx.push_mismatch(&else_path, &then_type, &else_type);
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
            let value_type = ctx.check(let_expression.value.as_ref(), &value_path, None);

            let mut body_env = ctx.env.clone();
            body_env.insert(let_expression.variable_id, value_type.clone());
            ctx.variable_types
                .insert(let_expression.variable_id, value_type);
            let mut body_path = path.to_vec();
            body_path.push(PathStep::LetBody);

            let mut child_ctx = TypeCheckContext {
                env: &body_env,
                part_type_map: ctx.part_type_map,
                part_snapshot_map: ctx.part_snapshot_map,
                diagnostics: ctx.diagnostics,
                expected_types: ctx.expected_types,
                variable_types: ctx.variable_types,
            };
            child_ctx.check(
                let_expression.body.as_ref(),
                &body_path,
                expected_type.clone(),
            )
        }
        definy_event::event::Expression::Constructor(constructor_expression) => {
            let inferred_shape = infer_constructor_shape_from_type_part(
                ctx.part_snapshot_map,
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
                                ctx.diagnostics.push(TypeDiagnostic {
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
                            ctx.check(item.value.as_ref(), &field_path, Some(field_expected_type));
                        } else {
                            ctx.diagnostics.push(TypeDiagnostic {
                                path: value_path.clone(),
                                message: format!("Missing field: {}", field_name),
                            });
                        }
                    }
                    if record_expression.items.len() > fields.len() {
                        ctx.diagnostics.push(TypeDiagnostic {
                            path: value_path.clone(),
                            message: "Extra fields in record".to_string(),
                        });
                    }
                } else {
                    let mut dummy_diag = Vec::new();
                    let mut dummy_expected = HashMap::new();
                    let mut dummy_vars = HashMap::new();
                    let actual_value_type = {
                        let mut sub_ctx = TypeCheckContext {
                            env: ctx.env,
                            part_type_map: ctx.part_type_map,
                            part_snapshot_map: ctx.part_snapshot_map,
                            diagnostics: &mut dummy_diag,
                            expected_types: &mut dummy_expected,
                            variable_types: &mut dummy_vars,
                        };
                        sub_ctx.check(constructor_expression.value.as_ref(), &value_path, None)
                    };
                    ctx.push_mismatch(&value_path, &expected_value_type, &actual_value_type);
                }
            } else {
                ctx.check(
                    constructor_expression.value.as_ref(),
                    &value_path,
                    Some(expected_value_type),
                );
            }
            ExpressionType::TypePart(
                constructor_expression
                    .type_part_definition_event_hash
                    .clone(),
            )
        }
        definy_event::event::Expression::Function(func_expression) => {
            let (param_type, expected_body_type) = match &expected_type {
                Some(ExpressionType::Function {
                    parameter,
                    return_type,
                }) => ((**parameter).clone(), Some((**return_type).clone())),
                _ => (ExpressionType::Unknown, None),
            };

            let mut body_env = ctx.env.clone();
            body_env.insert(func_expression.parameter_id, param_type.clone());
            ctx.variable_types
                .insert(func_expression.parameter_id, param_type.clone());

            let mut body_path = path.to_vec();
            body_path.push(PathStep::FunctionBody);

            let body_type = {
                let mut child_ctx = TypeCheckContext {
                    env: &body_env,
                    part_type_map: ctx.part_type_map,
                    part_snapshot_map: ctx.part_snapshot_map,
                    diagnostics: ctx.diagnostics,
                    expected_types: ctx.expected_types,
                    variable_types: ctx.variable_types,
                };
                child_ctx.check(
                    func_expression.body.as_ref(),
                    &body_path,
                    expected_body_type,
                )
            };

            ExpressionType::Function {
                parameter: Box::new(param_type),
                return_type: Box::new(body_type),
            }
        }
        definy_event::event::Expression::Call(call_expression) => {
            let mut func_path = path.to_vec();
            func_path.push(PathStep::CallFunction);

            let func_type = ctx.check(call_expression.function.as_ref(), &func_path, None);

            let mut arg_path = path.to_vec();
            arg_path.push(PathStep::CallArgument);

            match func_type {
                ExpressionType::Function {
                    parameter,
                    return_type,
                } => {
                    ctx.check(
                        call_expression.argument.as_ref(),
                        &arg_path,
                        Some(*parameter),
                    );
                    *return_type
                }
                _ => {
                    ctx.check(call_expression.argument.as_ref(), &arg_path, None);
                    ExpressionType::Unknown
                }
            }
        }
        definy_event::event::Expression::TypeFunction(type_func_expression) => {
            let mut param_path = path.to_vec();
            param_path.push(PathStep::TypeFunctionParameter);
            ctx.check(
                type_func_expression.parameter.as_ref(),
                &param_path,
                Some(ExpressionType::Type),
            );

            let mut ret_path = path.to_vec();
            ret_path.push(PathStep::TypeFunctionReturn);
            ctx.check(
                type_func_expression.return_type.as_ref(),
                &ret_path,
                Some(ExpressionType::Type),
            );
            ExpressionType::Type
        }
        definy_event::event::Expression::TypeUnion(type_union_expression) => {
            for (idx, variant) in type_union_expression.variants.iter().enumerate() {
                if let Some(payload_type) = &variant.payload_type {
                    let mut variant_path = path.to_vec();
                    variant_path.push(PathStep::TypeUnionVariant(idx));
                    ctx.check(
                        payload_type.as_ref(),
                        &variant_path,
                        Some(ExpressionType::Type),
                    );
                }
            }
            ExpressionType::Type
        }
        definy_event::event::Expression::Variant(variant_expression) => {
            if let Some(payload) = &variant_expression.payload {
                let mut payload_path = path.to_vec();
                payload_path.push(PathStep::VariantPayload);
                ctx.check(payload.as_ref(), &payload_path, None);
            }
            ExpressionType::Union
        }
        definy_event::event::Expression::Match(match_expression) => {
            let mut target_path = path.to_vec();
            target_path.push(PathStep::MatchTarget);
            ctx.check(
                match_expression.target.as_ref(),
                &target_path,
                Some(ExpressionType::Union),
            );

            let mut result_type = ExpressionType::Unknown;
            for (idx, arm) in match_expression.arms.iter().enumerate() {
                let mut arm_env = ctx.env.clone();
                if let Some(var_id) = arm.variable_id {
                    arm_env.insert(var_id, ExpressionType::Unknown);
                    ctx.variable_types.insert(var_id, ExpressionType::Unknown);
                }
                let mut arm_path = path.to_vec();
                arm_path.push(PathStep::MatchArmBody(idx));
                let arm_type = {
                    let mut child_ctx = TypeCheckContext {
                        env: &arm_env,
                        part_type_map: ctx.part_type_map,
                        part_snapshot_map: ctx.part_snapshot_map,
                        diagnostics: ctx.diagnostics,
                        expected_types: ctx.expected_types,
                        variable_types: ctx.variable_types,
                    };
                    child_ctx.check(arm.body.as_ref(), &arm_path, None)
                };
                if result_type == ExpressionType::Unknown {
                    result_type = arm_type;
                }
            }
            if let Some(default_expr) = &match_expression.default {
                let mut default_path = path.to_vec();
                default_path.push(PathStep::MatchDefault);
                let default_type = ctx.check(default_expr.as_ref(), &default_path, None);
                if result_type == ExpressionType::Unknown {
                    result_type = default_type;
                }
            }
            result_type
        }
        definy_event::event::Expression::Compiler(_) => ExpressionType::Unknown,
    };

    if let Some(expected_type) = expected_type {
        ctx.push_mismatch(path, &expected_type, &actual_type);
    }

    actual_type
}
