use crate::ast_builder::{call_part, fn_expr, fn_type};
use definy_event::EventHashId;
use definy_event::event::{
    AddExpression, BooleanExpression, Description, EqualExpression, Expression, IfExpression,
    LessThanExpression, LessThanOrEqualExpression, ListAppendExpression, ListGetExpression,
    ListLengthExpression, MatchArm, MatchExpression, ModulePartEntry, NumberExpression, PartType,
    RecordFieldType, RecordGetExpression, StringExpression, SubtractExpression, VariableExpression,
    derive_module_part_id,
};

use super::helpers::{
    error_invalid_type_declaration, error_unknown, error_value, ok_type, type_type,
};

/// 文字列リストに指定の文字列が含まれるかを後方探索するパーツ
/// `core.list-contains-string`: `(list: List String, target: String, index: Number) -> Boolean`
pub fn create_list_contains_string_part(core_module_id: &EventHashId) -> ModulePartEntry {
    let list_contains_string_hash = derive_module_part_id(core_module_id, "list-contains-string");

    let list = Expression::Variable(VariableExpression { variable_id: 0 });
    let target = Expression::Variable(VariableExpression { variable_id: 1 });
    let index = Expression::Variable(VariableExpression { variable_id: 2 });

    let is_negative = Expression::LessThan(LessThanExpression {
        left: Box::new(index.clone()),
        right: Box::new(Expression::Number(NumberExpression { value: 0 })),
    });

    let current_item = Expression::ListGet(ListGetExpression {
        list: Box::new(list.clone()),
        index: Box::new(index.clone()),
    });
    let is_equal = Expression::Equal(EqualExpression {
        left: Box::new(current_item),
        right: Box::new(target.clone()),
    });

    let next_index = Expression::Subtract(SubtractExpression {
        left: Box::new(index),
        right: Box::new(Expression::Number(NumberExpression { value: 1 })),
    });

    let recurse = call_part(
        &list_contains_string_hash,
        &[("list", list), ("target", target), ("index", next_index)],
    );

    let body = Expression::If(IfExpression {
        condition: Box::new(is_negative),
        then_expr: Box::new(Expression::Boolean(BooleanExpression { value: false })),
        else_expr: Box::new(Expression::If(IfExpression {
            condition: Box::new(is_equal),
            then_expr: Box::new(Expression::Boolean(BooleanExpression { value: true })),
            else_expr: Box::new(recurse),
        })),
    });

    ModulePartEntry {
        name: "list-contains-string".into(),
        part_type: Some(fn_type(
            &[
                ("list", PartType::List(Box::new(PartType::String))),
                ("target", PartType::String),
                ("index", PartType::Number),
            ],
            PartType::Boolean,
        )),
        description: Description::localized(vec![
            (
                "en",
                "Checks if a string list contains a target string searching backward from index",
            ),
            (
                "ja",
                "文字列リストに指定文字列が含まれるかインデックスから後方に走査して判定",
            ),
        ]),
        content_hash: None,
        expression: Some(fn_expr(&[("list", 0), ("target", 1), ("index", 2)], body)),
    }
}

/// レコード型宣言の各フィールドの型式を再帰検査し、重複キーを検出するパーツ
/// `core.type-check-type-record-fields`: `(fields: List Field, env: type-env, index: Number, seen_keys: List String) -> type-result`
pub fn create_type_check_type_record_fields_part(core_module_id: &EventHashId) -> ModulePartEntry {
    let expr_hash = derive_module_part_id(core_module_id, "expression");
    let type_env_hash = derive_module_part_id(core_module_id, "type-env");
    let type_result_hash = derive_module_part_id(core_module_id, "type-result");
    let type_check_against_hash = derive_module_part_id(core_module_id, "type-check-against");
    let list_contains_string_hash = derive_module_part_id(core_module_id, "list-contains-string");
    let check_type_record_fields_hash =
        derive_module_part_id(core_module_id, "type-check-type-record-fields");

    let fields = Expression::Variable(VariableExpression { variable_id: 0 });
    let env = Expression::Variable(VariableExpression { variable_id: 1 });
    let index = Expression::Variable(VariableExpression { variable_id: 2 });
    let seen_keys = Expression::Variable(VariableExpression { variable_id: 3 });

    let at_end = Expression::LessThanOrEqual(LessThanOrEqualExpression {
        left: Box::new(Expression::ListLength(ListLengthExpression {
            value: Box::new(fields.clone()),
        })),
        right: Box::new(index.clone()),
    });

    let current_field = Expression::ListGet(ListGetExpression {
        list: Box::new(fields.clone()),
        index: Box::new(index.clone()),
    });
    let current_key = Expression::RecordGet(RecordGetExpression {
        record: Box::new(current_field.clone()),
        key: "key".into(),
    });
    let current_value = Expression::RecordGet(RecordGetExpression {
        record: Box::new(current_field),
        key: "value".into(),
    });

    let seen_keys_len_minus_1 = Expression::Subtract(SubtractExpression {
        left: Box::new(Expression::ListLength(ListLengthExpression {
            value: Box::new(seen_keys.clone()),
        })),
        right: Box::new(Expression::Number(NumberExpression { value: 1 })),
    });

    let already_seen = call_part(
        &list_contains_string_hash,
        &[
            ("list", seen_keys.clone()),
            ("target", current_key.clone()),
            ("index", seen_keys_len_minus_1),
        ],
    );

    let next_index = Expression::Add(AddExpression {
        left: Box::new(index),
        right: Box::new(Expression::Number(NumberExpression { value: 1 })),
    });
    let next_seen = Expression::ListAppend(ListAppendExpression {
        list: Box::new(seen_keys),
        item: Box::new(current_key),
    });

    let recurse = call_part(
        &check_type_record_fields_hash,
        &[
            ("fields", fields),
            ("env", env.clone()),
            ("index", next_index),
            ("seen_keys", next_seen),
        ],
    );

    let check_val = call_part(
        &type_check_against_hash,
        &[
            ("expr", current_value),
            ("env", env),
            ("expected_type", type_type()),
        ],
    );

    let check_val_match = Expression::Match(MatchExpression {
        target: Box::new(check_val),
        arms: vec![
            MatchArm {
                tag: "ok".into(),
                variable_id: Some(10),
                variable_name: Some("ok_type".into()),
                body: Box::new(recurse),
            },
            MatchArm {
                tag: "error".into(),
                variable_id: Some(11),
                variable_name: Some("err".into()),
                body: Box::new(error_value(Expression::Variable(VariableExpression {
                    variable_id: 11,
                }))),
            },
        ],
        default: Some(Box::new(error_unknown())),
    });

    let body = Expression::If(IfExpression {
        condition: Box::new(at_end),
        then_expr: Box::new(ok_type(type_type())),
        else_expr: Box::new(Expression::If(IfExpression {
            condition: Box::new(already_seen),
            then_expr: Box::new(error_invalid_type_declaration(Expression::String(
                StringExpression {
                    value: "duplicate field key in record type".into(),
                },
            ))),
            else_expr: Box::new(check_val_match),
        })),
    });

    let field_type = PartType::Record(vec![
        RecordFieldType {
            key: "key".into(),
            value: Box::new(PartType::String),
        },
        RecordFieldType {
            key: "value".into(),
            value: Box::new(PartType::TypePart(expr_hash)),
        },
    ]);

    ModulePartEntry {
        name: "type-check-type-record-fields".into(),
        part_type: Some(fn_type(
            &[
                ("fields", PartType::List(Box::new(field_type))),
                ("env", PartType::TypePart(type_env_hash)),
                ("index", PartType::Number),
                ("seen_keys", PartType::List(Box::new(PartType::String))),
            ],
            PartType::TypePart(type_result_hash),
        )),
        description: Description::localized(vec![
            (
                "en",
                "Recursively checks field type expressions in a record type declaration and detects duplicates",
            ),
            (
                "ja",
                "レコード型宣言の各フィールド型式を再帰検査し、重複キーを検出",
            ),
        ]),
        content_hash: None,
        expression: Some(fn_expr(
            &[("fields", 0), ("env", 1), ("index", 2), ("seen_keys", 3)],
            body,
        )),
    }
}

/// ユニオン型宣言の各バリアントのペイロード型式を再帰検査し、空ユニオンや重複タグを検出するパーツ
/// `core.type-check-type-union-variants`: `(variants: List Variant, env: type-env, index: Number, seen_tags: List String) -> type-result`
pub fn create_type_check_type_union_variants_part(core_module_id: &EventHashId) -> ModulePartEntry {
    let expr_hash = derive_module_part_id(core_module_id, "expression");
    let type_env_hash = derive_module_part_id(core_module_id, "type-env");
    let type_result_hash = derive_module_part_id(core_module_id, "type-result");
    let type_check_against_hash = derive_module_part_id(core_module_id, "type-check-against");
    let list_contains_string_hash = derive_module_part_id(core_module_id, "list-contains-string");
    let check_type_union_variants_hash =
        derive_module_part_id(core_module_id, "type-check-type-union-variants");

    let variants = Expression::Variable(VariableExpression { variable_id: 0 });
    let env = Expression::Variable(VariableExpression { variable_id: 1 });
    let index = Expression::Variable(VariableExpression { variable_id: 2 });
    let seen_tags = Expression::Variable(VariableExpression { variable_id: 3 });

    let at_end = Expression::LessThanOrEqual(LessThanOrEqualExpression {
        left: Box::new(Expression::ListLength(ListLengthExpression {
            value: Box::new(variants.clone()),
        })),
        right: Box::new(index.clone()),
    });

    let current_variant = Expression::ListGet(ListGetExpression {
        list: Box::new(variants.clone()),
        index: Box::new(index.clone()),
    });
    let current_tag = Expression::RecordGet(RecordGetExpression {
        record: Box::new(current_variant.clone()),
        key: "tag".into(),
    });
    let current_payload_type = Expression::RecordGet(RecordGetExpression {
        record: Box::new(current_variant),
        key: "payload_type".into(),
    });

    let seen_tags_len_minus_1 = Expression::Subtract(SubtractExpression {
        left: Box::new(Expression::ListLength(ListLengthExpression {
            value: Box::new(seen_tags.clone()),
        })),
        right: Box::new(Expression::Number(NumberExpression { value: 1 })),
    });

    let already_seen = call_part(
        &list_contains_string_hash,
        &[
            ("list", seen_tags.clone()),
            ("target", current_tag.clone()),
            ("index", seen_tags_len_minus_1),
        ],
    );

    let next_index = Expression::Add(AddExpression {
        left: Box::new(index),
        right: Box::new(Expression::Number(NumberExpression { value: 1 })),
    });
    let next_seen = Expression::ListAppend(ListAppendExpression {
        list: Box::new(seen_tags),
        item: Box::new(current_tag),
    });

    let recurse = call_part(
        &check_type_union_variants_hash,
        &[
            ("variants", variants),
            ("env", env.clone()),
            ("index", next_index),
            ("seen_tags", next_seen),
        ],
    );

    let p_expr = Expression::Variable(VariableExpression { variable_id: 20 });
    let check_payload = call_part(
        &type_check_against_hash,
        &[
            ("expr", p_expr),
            ("env", env),
            ("expected_type", type_type()),
        ],
    );
    let check_payload_match = Expression::Match(MatchExpression {
        target: Box::new(check_payload),
        arms: vec![
            MatchArm {
                tag: "ok".into(),
                variable_id: Some(21),
                variable_name: Some("ok_type".into()),
                body: Box::new(recurse.clone()),
            },
            MatchArm {
                tag: "error".into(),
                variable_id: Some(22),
                variable_name: Some("err".into()),
                body: Box::new(error_value(Expression::Variable(VariableExpression {
                    variable_id: 22,
                }))),
            },
        ],
        default: Some(Box::new(error_unknown())),
    });

    let payload_match = Expression::Match(MatchExpression {
        target: Box::new(current_payload_type),
        arms: vec![
            MatchArm {
                tag: "none".into(),
                variable_id: None,
                variable_name: None,
                body: Box::new(recurse),
            },
            MatchArm {
                tag: "some".into(),
                variable_id: Some(20),
                variable_name: Some("payload_expr".into()),
                body: Box::new(check_payload_match),
            },
        ],
        default: Some(Box::new(error_unknown())),
    });

    let body = Expression::If(IfExpression {
        condition: Box::new(at_end),
        then_expr: Box::new(ok_type(type_type())),
        else_expr: Box::new(Expression::If(IfExpression {
            condition: Box::new(already_seen),
            then_expr: Box::new(error_invalid_type_declaration(Expression::String(
                StringExpression {
                    value: "duplicate variant tag in union type".into(),
                },
            ))),
            else_expr: Box::new(payload_match),
        })),
    });

    let payload_union = PartType::Union(vec![
        definy_event::event::UnionVariantType {
            tag: "none".into(),
            payload: None,
        },
        definy_event::event::UnionVariantType {
            tag: "some".into(),
            payload: Some(Box::new(PartType::TypePart(expr_hash))),
        },
    ]);

    let variant_type = PartType::Record(vec![
        RecordFieldType {
            key: "tag".into(),
            value: Box::new(PartType::String),
        },
        RecordFieldType {
            key: "payload_type".into(),
            value: Box::new(payload_union),
        },
    ]);

    ModulePartEntry {
        name: "type-check-type-union-variants".into(),
        part_type: Some(fn_type(
            &[
                ("variants", PartType::List(Box::new(variant_type))),
                ("env", PartType::TypePart(type_env_hash)),
                ("index", PartType::Number),
                ("seen_tags", PartType::List(Box::new(PartType::String))),
            ],
            PartType::TypePart(type_result_hash),
        )),
        description: Description::localized(vec![
            (
                "en",
                "Recursively checks payload type expressions in a union type declaration and detects duplicates",
            ),
            (
                "ja",
                "ユニオン型宣言の各バリアント型式を再帰検査し、重複タグを検出",
            ),
        ]),
        content_hash: None,
        expression: Some(fn_expr(
            &[("variants", 0), ("env", 1), ("index", 2), ("seen_tags", 3)],
            body,
        )),
    }
}

/// 関数型宣言の各パラメータの型式を再帰検査し、重複名を検出するパーツ
/// `core.type-check-type-function-parameters`: `(parameters: List Param, env: type-env, index: Number, seen_names: List String) -> type-result`
pub fn create_type_check_type_function_parameters_part(
    core_module_id: &EventHashId,
) -> ModulePartEntry {
    let expr_hash = derive_module_part_id(core_module_id, "expression");
    let type_env_hash = derive_module_part_id(core_module_id, "type-env");
    let type_result_hash = derive_module_part_id(core_module_id, "type-result");
    let type_check_against_hash = derive_module_part_id(core_module_id, "type-check-against");
    let list_contains_string_hash = derive_module_part_id(core_module_id, "list-contains-string");
    let check_type_function_params_hash =
        derive_module_part_id(core_module_id, "type-check-type-function-parameters");

    let parameters = Expression::Variable(VariableExpression { variable_id: 0 });
    let env = Expression::Variable(VariableExpression { variable_id: 1 });
    let index = Expression::Variable(VariableExpression { variable_id: 2 });
    let seen_names = Expression::Variable(VariableExpression { variable_id: 3 });

    let at_end = Expression::LessThanOrEqual(LessThanOrEqualExpression {
        left: Box::new(Expression::ListLength(ListLengthExpression {
            value: Box::new(parameters.clone()),
        })),
        right: Box::new(index.clone()),
    });

    let current_param = Expression::ListGet(ListGetExpression {
        list: Box::new(parameters.clone()),
        index: Box::new(index.clone()),
    });
    let current_name = Expression::RecordGet(RecordGetExpression {
        record: Box::new(current_param.clone()),
        key: "name".into(),
    });
    let current_type = Expression::RecordGet(RecordGetExpression {
        record: Box::new(current_param),
        key: "type".into(),
    });

    let seen_names_len_minus_1 = Expression::Subtract(SubtractExpression {
        left: Box::new(Expression::ListLength(ListLengthExpression {
            value: Box::new(seen_names.clone()),
        })),
        right: Box::new(Expression::Number(NumberExpression { value: 1 })),
    });

    let already_seen = call_part(
        &list_contains_string_hash,
        &[
            ("list", seen_names.clone()),
            ("target", current_name.clone()),
            ("index", seen_names_len_minus_1),
        ],
    );

    let next_index = Expression::Add(AddExpression {
        left: Box::new(index),
        right: Box::new(Expression::Number(NumberExpression { value: 1 })),
    });
    let next_seen = Expression::ListAppend(ListAppendExpression {
        list: Box::new(seen_names),
        item: Box::new(current_name),
    });

    let recurse = call_part(
        &check_type_function_params_hash,
        &[
            ("parameters", parameters),
            ("env", env.clone()),
            ("index", next_index),
            ("seen_names", next_seen),
        ],
    );

    let check_val = call_part(
        &type_check_against_hash,
        &[
            ("expr", current_type),
            ("env", env),
            ("expected_type", type_type()),
        ],
    );

    let check_val_match = Expression::Match(MatchExpression {
        target: Box::new(check_val),
        arms: vec![
            MatchArm {
                tag: "ok".into(),
                variable_id: Some(10),
                variable_name: Some("ok_type".into()),
                body: Box::new(recurse),
            },
            MatchArm {
                tag: "error".into(),
                variable_id: Some(11),
                variable_name: Some("err".into()),
                body: Box::new(error_value(Expression::Variable(VariableExpression {
                    variable_id: 11,
                }))),
            },
        ],
        default: Some(Box::new(error_unknown())),
    });

    let body = Expression::If(IfExpression {
        condition: Box::new(at_end),
        then_expr: Box::new(ok_type(type_type())),
        else_expr: Box::new(Expression::If(IfExpression {
            condition: Box::new(already_seen),
            then_expr: Box::new(error_invalid_type_declaration(Expression::String(
                StringExpression {
                    value: "duplicate parameter name in function type".into(),
                },
            ))),
            else_expr: Box::new(check_val_match),
        })),
    });

    let param_field_type = PartType::Record(vec![
        RecordFieldType {
            key: "name".into(),
            value: Box::new(PartType::String),
        },
        RecordFieldType {
            key: "type".into(),
            value: Box::new(PartType::TypePart(expr_hash)),
        },
    ]);

    ModulePartEntry {
        name: "type-check-type-function-parameters".into(),
        part_type: Some(fn_type(
            &[
                ("parameters", PartType::List(Box::new(param_field_type))),
                ("env", PartType::TypePart(type_env_hash)),
                ("index", PartType::Number),
                ("seen_names", PartType::List(Box::new(PartType::String))),
            ],
            PartType::TypePart(type_result_hash),
        )),
        description: Description::localized(vec![
            (
                "en",
                "Recursively checks parameter type expressions in a function type declaration and detects duplicates",
            ),
            (
                "ja",
                "関数型宣言の各引数型式を再帰検査し、重複パラメータ名を検出",
            ),
        ]),
        content_hash: None,
        expression: Some(fn_expr(
            &[
                ("parameters", 0),
                ("env", 1),
                ("index", 2),
                ("seen_names", 3),
            ],
            body,
        )),
    }
}
