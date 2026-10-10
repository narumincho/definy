use crate::ast_builder::{call_part, fn_expr, fn_type};
use definy_event::EventHashId;
use definy_event::event::{
    AddExpression, Description, EqualExpression, Expression, IfExpression,
    LessThanOrEqualExpression, ListAppendExpression, ListGetExpression, ListLengthExpression,
    ListLiteralExpression, MatchArm, MatchExpression, ModulePartEntry, NumberExpression, PartType,
    RecordFieldType, RecordGetExpression, TypeLiteralExpression, TypeLiteralItemExpression,
    VariableExpression, derive_module_part_id,
};

use super::helpers::{eval_sub, val_record, val_unit};

/// 動的レコード値からキーを検索して対応する値を返す関数パーツ
/// `core.record-field-lookup`: `(items: list<{ key: string, value: value }>, key: string, index: number) -> value`
pub fn create_record_field_lookup_part(core_module_id: &EventHashId) -> ModulePartEntry {
    let val_part_hash = derive_module_part_id(core_module_id, "value");
    let lookup_hash = derive_module_part_id(core_module_id, "record-field-lookup");

    let items = Expression::Variable(VariableExpression { variable_id: 0 });
    let key = Expression::Variable(VariableExpression { variable_id: 1 });
    let index = Expression::Variable(VariableExpression { variable_id: 2 });

    let at_end = Expression::LessThanOrEqual(LessThanOrEqualExpression {
        left: Box::new(Expression::ListLength(ListLengthExpression {
            value: Box::new(items.clone()),
        })),
        right: Box::new(index.clone()),
    });

    let current_item = Expression::ListGet(ListGetExpression {
        list: Box::new(items.clone()),
        index: Box::new(index.clone()),
    });
    let current_key = Expression::RecordGet(RecordGetExpression {
        record: Box::new(current_item.clone()),
        key: "key".into(),
    });
    let current_val = Expression::RecordGet(RecordGetExpression {
        record: Box::new(current_item),
        key: "value".into(),
    });

    let key_matches = Expression::Equal(EqualExpression {
        left: Box::new(current_key),
        right: Box::new(key.clone()),
    });

    let next_index = Expression::Add(AddExpression {
        left: Box::new(index),
        right: Box::new(Expression::Number(NumberExpression { value: 1 })),
    });

    let recurse = call_part(
        &lookup_hash,
        &[("items", items), ("key", key), ("index", next_index)],
    );

    let body = Expression::If(IfExpression {
        condition: Box::new(at_end),
        then_expr: Box::new(val_unit()),
        else_expr: Box::new(Expression::If(IfExpression {
            condition: Box::new(key_matches),
            then_expr: Box::new(current_val),
            else_expr: Box::new(recurse),
        })),
    });

    let item_type = PartType::Record(vec![
        RecordFieldType {
            key: "key".into(),
            value: Box::new(PartType::String),
        },
        RecordFieldType {
            key: "value".into(),
            value: Box::new(PartType::TypePart(val_part_hash.clone())),
        },
    ]);

    ModulePartEntry {
        name: "record-field-lookup".into(),
        part_type: Some(fn_type(
            &[
                ("items", PartType::List(Box::new(item_type))),
                ("key", PartType::String),
                ("index", PartType::Number),
            ],
            PartType::TypePart(val_part_hash),
        )),
        description: Description::localized(vec![
            (
                "en",
                "Looks up a field's value in a dynamic record value field list",
            ),
            (
                "ja",
                "動的レコード値のフィールド一覧からキーに対応する値を検索する関数",
            ),
        ]),
        content_hash: None,
        expression: Some(fn_expr(&[("items", 0), ("key", 1), ("index", 2)], body)),
    }
}

/// レコード式内の全フィールドの式を左から右へ動的評価して値一覧を構築する関数パーツ
/// `core.eval-record-fields`: `list<{ key: string, value: expression }> -> env -> number -> list<{ key: string, value: value }> -> list<{ key: string, value: value }>`
pub fn create_eval_record_fields_part(core_module_id: &EventHashId) -> ModulePartEntry {
    let val_part_hash = derive_module_part_id(core_module_id, "value");
    let env_part_hash = derive_module_part_id(core_module_id, "env");
    let expr_type_hash = derive_module_part_id(core_module_id, "expression");
    let eval_value_hash = derive_module_part_id(core_module_id, "eval-value");
    let eval_record_fields_hash = derive_module_part_id(core_module_id, "eval-record-fields");

    let fields = Expression::Variable(VariableExpression { variable_id: 0 });
    let env = Expression::Variable(VariableExpression { variable_id: 1 });
    let index = Expression::Variable(VariableExpression { variable_id: 2 });
    let accum = Expression::Variable(VariableExpression { variable_id: 3 });

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
    let current_val_expr = Expression::RecordGet(RecordGetExpression {
        record: Box::new(current_field),
        key: "value".into(),
    });

    let eval_val = eval_sub(&eval_value_hash, current_val_expr, env.clone());

    let new_entry = Expression::TypeLiteral(TypeLiteralExpression {
        items: vec![
            TypeLiteralItemExpression {
                key: "key".into(),
                value: Box::new(current_key),
            },
            TypeLiteralItemExpression {
                key: "value".into(),
                value: Box::new(eval_val),
            },
        ],
    });

    let next_accum = Expression::ListAppend(ListAppendExpression {
        list: Box::new(accum.clone()),
        item: Box::new(new_entry),
    });

    let next_index = Expression::Add(AddExpression {
        left: Box::new(index),
        right: Box::new(Expression::Number(NumberExpression { value: 1 })),
    });

    let recurse = call_part(
        &eval_record_fields_hash,
        &[
            ("fields", fields),
            ("env", env),
            ("index", next_index),
            ("accum", next_accum),
        ],
    );

    let body = Expression::If(IfExpression {
        condition: Box::new(at_end),
        then_expr: Box::new(accum),
        else_expr: Box::new(recurse),
    });

    let expr_field_type = PartType::Record(vec![
        RecordFieldType {
            key: "key".into(),
            value: Box::new(PartType::String),
        },
        RecordFieldType {
            key: "value".into(),
            value: Box::new(PartType::TypePart(expr_type_hash)),
        },
    ]);
    let val_field_type = PartType::Record(vec![
        RecordFieldType {
            key: "key".into(),
            value: Box::new(PartType::String),
        },
        RecordFieldType {
            key: "value".into(),
            value: Box::new(PartType::TypePart(val_part_hash)),
        },
    ]);

    ModulePartEntry {
        name: "eval-record-fields".into(),
        part_type: Some(fn_type(
            &[
                ("fields", PartType::List(Box::new(expr_field_type))),
                ("env", PartType::TypePart(env_part_hash)),
                ("index", PartType::Number),
                ("accum", PartType::List(Box::new(val_field_type.clone()))),
            ],
            PartType::List(Box::new(val_field_type)),
        )),
        description: Description::localized(vec![
            (
                "en",
                "Evaluates record expression fields sequentially into dynamic values",
            ),
            (
                "ja",
                "レコード式の各フィールドを再帰的に評価して動的値一覧を構築する関数",
            ),
        ]),
        content_hash: None,
        expression: Some(fn_expr(
            &[("fields", 0), ("env", 1), ("index", 2), ("accum", 3)],
            body,
        )),
    }
}

/// 動的値評価器 `core.eval-value` にレコードおよびフィールドアクセスの評価分岐を追加します。
pub fn create_record_eval_arms(
    core_module_id: &EventHashId,
    eval_value_hash: &EventHashId,
    arms: &mut Vec<MatchArm>,
) {
    let lookup_hash = derive_module_part_id(core_module_id, "record-field-lookup");
    let eval_record_fields_hash = derive_module_part_id(core_module_id, "eval-record-fields");

    // record_get: record_get({ record, key })
    {
        let rg_var_id = 70;
        let record_expr = Expression::RecordGet(RecordGetExpression {
            record: Box::new(Expression::Variable(VariableExpression {
                variable_id: rg_var_id,
            })),
            key: "record".into(),
        });
        let key_expr = Expression::RecordGet(RecordGetExpression {
            record: Box::new(Expression::Variable(VariableExpression {
                variable_id: rg_var_id,
            })),
            key: "key".into(),
        });

        let eval_rec = eval_sub(
            eval_value_hash,
            record_expr,
            Expression::Variable(VariableExpression { variable_id: 1 }),
        );

        let rec_val_id = 71;
        let lookup_call = call_part(
            &lookup_hash,
            &[
                (
                    "items",
                    Expression::Variable(VariableExpression {
                        variable_id: rec_val_id,
                    }),
                ),
                ("key", key_expr),
                ("index", Expression::Number(NumberExpression { value: 0 })),
            ],
        );

        let body = Expression::Match(MatchExpression {
            target: Box::new(eval_rec),
            arms: vec![
                MatchArm {
                    tag: "record".into(),
                    variable_id: Some(rec_val_id),
                    variable_name: Some("items".into()),
                    body: Box::new(lookup_call),
                },
                MatchArm {
                    tag: "_".into(),
                    variable_id: Some(99),
                    variable_name: Some("_".into()),
                    body: Box::new(val_unit()),
                },
            ],
            default: None,
        });

        arms.push(MatchArm {
            tag: "record_get".into(),
            variable_id: Some(rg_var_id),
            variable_name: Some("rg_e".into()),
            body: Box::new(body),
        });
    }

    // record: record(list<{ key, value }>)
    {
        let rec_var_id = 72;
        let empty_accum = Expression::ListLiteral(ListLiteralExpression { items: vec![] });

        let eval_fields = call_part(
            &eval_record_fields_hash,
            &[
                (
                    "fields",
                    Expression::Variable(VariableExpression {
                        variable_id: rec_var_id,
                    }),
                ),
                (
                    "env",
                    Expression::Variable(VariableExpression { variable_id: 1 }),
                ),
                ("index", Expression::Number(NumberExpression { value: 0 })),
                ("accum", empty_accum),
            ],
        );

        arms.push(MatchArm {
            tag: "record".into(),
            variable_id: Some(rec_var_id),
            variable_name: Some("fields".into()),
            body: Box::new(val_record(eval_fields)),
        });
    }
}
