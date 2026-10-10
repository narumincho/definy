use std::collections::HashMap;

use definy_event::EventHashId;

use crate::part_projection::PartSnapshot;

use super::super::types::{ExpressionType, FunctionParameterTypeInfo};

pub(crate) fn resolve_record_fields(
    expr_type: &ExpressionType,
    part_snapshot_map: &HashMap<EventHashId, PartSnapshot>,
) -> Option<Vec<(String, ExpressionType)>> {
    let mut visited = Vec::new();
    resolve_record_fields_with_visited(expr_type, part_snapshot_map, &mut visited)
}

fn resolve_record_fields_with_visited(
    expr_type: &ExpressionType,
    part_snapshot_map: &HashMap<EventHashId, PartSnapshot>,
    visited: &mut Vec<EventHashId>,
) -> Option<Vec<(String, ExpressionType)>> {
    match expr_type {
        ExpressionType::Record(fields) => Some(fields.clone()),
        ExpressionType::TypePart(hash) => {
            if visited.contains(hash) {
                return None;
            }
            visited.push(hash.clone());
            let snapshot = part_snapshot_map.get(hash)?;
            if let Some(definy_event::event::Expression::TypeLiteral(record)) = &snapshot.expression
            {
                let fields = record
                    .items
                    .iter()
                    .map(|item| {
                        (
                            item.key.to_string(),
                            type_expression_to_expression_type(item.value.as_ref()),
                        )
                    })
                    .collect();
                return Some(fields);
            }
            if let Some(definy_event::event::PartType::Record(fields)) = &snapshot.part_type {
                let res = fields
                    .iter()
                    .map(|f| {
                        (
                            f.key.to_string(),
                            super::part_type_to_expression_type(&f.value),
                        )
                    })
                    .collect();
                return Some(res);
            }
            if let Some(definy_event::event::Expression::PartReference(target)) =
                &snapshot.expression
            {
                return resolve_record_fields_with_visited(
                    &ExpressionType::TypePart(target.part_definition_event_hash.clone()),
                    part_snapshot_map,
                    visited,
                );
            }
            None
        }
        _ => None,
    }
}

pub(crate) fn is_type_assignable(
    actual: &ExpressionType,
    expected: &ExpressionType,
    part_snapshot_map: &HashMap<EventHashId, PartSnapshot>,
) -> bool {
    if actual == expected
        || actual == &ExpressionType::Unknown
        || expected == &ExpressionType::Unknown
    {
        return true;
    }

    // 1. レコードの構造的幅サブタイピング (Structural Width Subtyping for Records)
    // 期待されるレコード型の全フィールドが実際の型に存在し代入可能であれば、
    // 実際の型に余分なフィールドが存在していても代入可能とする。
    if let (Some(actual_fields), Some(expected_fields)) = (
        resolve_record_fields(actual, part_snapshot_map),
        resolve_record_fields(expected, part_snapshot_map),
    ) {
        return expected_fields.iter().all(|(exp_key, exp_type)| {
            if let Some((_, act_type)) =
                actual_fields.iter().find(|(act_key, _)| act_key == exp_key)
            {
                is_type_assignable(act_type, exp_type, part_snapshot_map)
            } else {
                false
            }
        });
    }

    // 2. 関数型の適合性 (引数は反変、戻り値は共変)
    if let (
        ExpressionType::Function {
            parameters: act_params,
            return_type: act_r,
        },
        ExpressionType::Function {
            parameters: exp_params,
            return_type: exp_r,
        },
    ) = (actual, expected)
    {
        if act_params.len() != exp_params.len() {
            return false;
        }
        let params_match = exp_params
            .iter()
            .zip(act_params.iter())
            .all(|(exp_p, act_p)| {
                exp_p.name == act_p.name
                    && is_type_assignable(&exp_p.r#type, &act_p.r#type, part_snapshot_map)
            });
        return params_match && is_type_assignable(act_r, exp_r, part_snapshot_map);
    }

    // 3. リスト型の適合性
    if let (ExpressionType::List(act_item), ExpressionType::List(exp_item)) = (actual, expected) {
        return is_type_assignable(act_item, exp_item, part_snapshot_map);
    }

    false
}

pub(crate) fn type_expression_to_expression_type(
    expr: &definy_event::event::Expression,
) -> ExpressionType {
    match expr {
        definy_event::event::Expression::TypeNumber => ExpressionType::Number,
        definy_event::event::Expression::TypeString => ExpressionType::String,
        definy_event::event::Expression::TypeBoolean => ExpressionType::Boolean,
        definy_event::event::Expression::TypeList(list) => ExpressionType::List(Box::new(
            type_expression_to_expression_type(list.item_type.as_ref()),
        )),
        definy_event::event::Expression::TypeLiteral(record) => {
            let fields = record
                .items
                .iter()
                .map(|item| {
                    (
                        item.key.to_string(),
                        type_expression_to_expression_type(item.value.as_ref()),
                    )
                })
                .collect();
            ExpressionType::Record(fields)
        }
        definy_event::event::Expression::PartReference(part_ref) => {
            ExpressionType::TypePart(part_ref.part_definition_event_hash.clone())
        }
        definy_event::event::Expression::TypeFunction(func) => ExpressionType::Function {
            parameters: func
                .parameters
                .iter()
                .map(|p| FunctionParameterTypeInfo {
                    name: p.name.to_string(),
                    r#type: type_expression_to_expression_type(p.r#type.as_ref()),
                })
                .collect(),
            return_type: Box::new(type_expression_to_expression_type(
                func.return_type.as_ref(),
            )),
        },
        definy_event::event::Expression::TypeUnion(_) => ExpressionType::Union,
        _ => ExpressionType::Unknown,
    }
}

pub(crate) fn find_union_variant_payload_type(
    part_snapshot_map: &HashMap<EventHashId, PartSnapshot>,
    type_part_hash: &EventHashId,
    tag: &str,
) -> Option<Option<ExpressionType>> {
    let snapshot = part_snapshot_map.get(type_part_hash)?;
    if let Some(definy_event::event::Expression::TypeUnion(union_expr)) = &snapshot.expression {
        for variant in &union_expr.variants {
            if variant.tag.as_ref() == tag {
                return Some(
                    variant
                        .payload_type
                        .as_ref()
                        .map(|p| type_expression_to_expression_type(p.as_ref())),
                );
            }
        }
    }
    if let Some(definy_event::event::PartType::Union(variants)) = &snapshot.part_type {
        for variant in variants {
            if variant.tag.as_ref() == tag {
                return Some(
                    variant
                        .payload
                        .as_ref()
                        .map(|p| super::part_type_to_expression_type(p.as_ref())),
                );
            }
        }
    }
    None
}

pub(crate) fn find_record_field_type(
    part_snapshot_map: &HashMap<EventHashId, PartSnapshot>,
    type_part_hash: &EventHashId,
    field_name: &str,
) -> Option<ExpressionType> {
    let snapshot = part_snapshot_map.get(type_part_hash)?;
    if let Some(definy_event::event::Expression::TypeLiteral(record)) = &snapshot.expression {
        for item in &record.items {
            if item.key.as_ref() == field_name {
                return Some(type_expression_to_expression_type(item.value.as_ref()));
            }
        }
    }
    if let Some(definy_event::event::PartType::Record(fields)) = &snapshot.part_type {
        for field in fields {
            if field.key.as_ref() == field_name {
                return Some(super::part_type_to_expression_type(field.value.as_ref()));
            }
        }
    }
    None
}
