use crate::ast_builder::{call_part, fn_expr, fn_type};
use definy_event::EventHashId;
use definy_event::event::{
    AddExpression, AndExpression, BooleanExpression, Description, EqualExpression, Expression,
    IfExpression, LessThanOrEqualExpression, ListGetExpression, ListLengthExpression, MatchArm,
    MatchExpression, ModulePartEntry, NumberExpression, PartType, RecordFieldType,
    RecordGetExpression, VariableExpression, derive_module_part_id,
};

/// レコードの幅のサブタイピング (Structural Width Subtyping for Records):
/// `expected_fields`（要求される全フィールド）が `actual_fields`（提供されたフィールド）に存在し、
/// 各フィールド型が `type-assignable` であるかを再帰的に検証します。
/// `core.type-assignable-record-fields`: `expected_fields -> actual_fields -> index -> boolean`
pub fn create_type_assignable_record_fields_part(core_module_id: &EventHashId) -> ModulePartEntry {
    let type_ast_hash = derive_module_part_id(core_module_id, "type-ast");
    let type_assignable_hash = derive_module_part_id(core_module_id, "type-assignable");
    let record_field_type_lookup_hash =
        derive_module_part_id(core_module_id, "record-field-type-lookup");
    let assignable_record_fields_hash =
        derive_module_part_id(core_module_id, "type-assignable-record-fields");

    let expected_fields = Expression::Variable(VariableExpression { variable_id: 0 });
    let actual_fields = Expression::Variable(VariableExpression { variable_id: 1 });
    let index = Expression::Variable(VariableExpression { variable_id: 2 });

    let expected_done = Expression::LessThanOrEqual(LessThanOrEqualExpression {
        left: Box::new(Expression::ListLength(ListLengthExpression {
            value: Box::new(expected_fields.clone()),
        })),
        right: Box::new(index.clone()),
    });

    let current_expected = Expression::ListGet(ListGetExpression {
        list: Box::new(expected_fields.clone()),
        index: Box::new(index.clone()),
    });
    let exp_key = Expression::RecordGet(RecordGetExpression {
        record: Box::new(current_expected.clone()),
        key: "key".into(),
    });
    let exp_field_type = Expression::RecordGet(RecordGetExpression {
        record: Box::new(current_expected),
        key: "field_type".into(),
    });

    // actual_fields から exp_key を名前で検索: record-field-type-lookup(actual_fields, exp_key, 0)
    let lookup_call = call_part(
        &record_field_type_lookup_hash,
        &[
            ("fields", actual_fields.clone()),
            ("key", exp_key),
            ("index", Expression::Number(NumberExpression { value: 0 })),
        ],
    );

    let next_index = Expression::Add(AddExpression {
        left: Box::new(index),
        right: Box::new(Expression::Number(NumberExpression { value: 1 })),
    });

    let recurse = call_part(
        &assignable_record_fields_hash,
        &[
            ("expected_fields", expected_fields),
            ("actual_fields", actual_fields),
            ("index", next_index),
        ],
    );

    let act_type_var = 10;
    // type-assignable(act_type, exp_field_type)
    let field_type_assignable = call_part(
        &type_assignable_hash,
        &[
            (
                "actual_type",
                Expression::Variable(VariableExpression {
                    variable_id: act_type_var,
                }),
            ),
            ("expected_type", exp_field_type),
        ],
    );

    let match_lookup = Expression::Match(MatchExpression {
        target: Box::new(lookup_call),
        arms: vec![
            MatchArm {
                tag: "ok".into(),
                variable_id: Some(act_type_var),
                variable_name: Some("act_type".into()),
                body: Box::new(Expression::If(IfExpression {
                    condition: Box::new(field_type_assignable),
                    then_expr: Box::new(recurse),
                    else_expr: Box::new(Expression::Boolean(BooleanExpression { value: false })),
                })),
            },
            MatchArm {
                tag: "error".into(),
                variable_id: Some(11),
                variable_name: Some("err".into()),
                body: Box::new(Expression::Boolean(BooleanExpression { value: false })),
            },
        ],
        default: Some(Box::new(Expression::Boolean(BooleanExpression {
            value: false,
        }))),
    });

    let body = Expression::If(IfExpression {
        condition: Box::new(expected_done),
        then_expr: Box::new(Expression::Boolean(BooleanExpression { value: true })),
        else_expr: Box::new(match_lookup),
    });

    let field_type = PartType::Record(vec![
        RecordFieldType {
            key: "key".into(),
            value: Box::new(PartType::String),
        },
        RecordFieldType {
            key: "field_type".into(),
            value: Box::new(PartType::TypePart(type_ast_hash)),
        },
    ]);

    ModulePartEntry {
        name: "type-assignable-record-fields".into(),
        part_type: Some(fn_type(
            &[
                (
                    "expected_fields",
                    PartType::List(Box::new(field_type.clone())),
                ),
                ("actual_fields", PartType::List(Box::new(field_type))),
                ("index", PartType::Number),
            ],
            PartType::Boolean,
        )),
        description: Description::localized(vec![
            (
                "en",
                "Check if actual record fields satisfy expected fields (structural width subtyping)",
            ),
            (
                "ja",
                "期待される全フィールドが実際のレコードに含まれているか検証（構造的幅サブタイピング）",
            ),
        ]),
        content_hash: None,
        expression: Some(fn_expr(
            &[("expected_fields", 0), ("actual_fields", 1), ("index", 2)],
            body,
        )),
    }
}

pub fn create_type_assignable_function_parameters_part(
    core_module_id: &EventHashId,
) -> ModulePartEntry {
    let type_ast_hash = derive_module_part_id(core_module_id, "type-ast");
    let type_assignable_hash = derive_module_part_id(core_module_id, "type-assignable");
    let assignable_fn_params_hash =
        derive_module_part_id(core_module_id, "type-assignable-function-parameters");

    let expected_params = Expression::Variable(VariableExpression { variable_id: 0 });
    let actual_params = Expression::Variable(VariableExpression { variable_id: 1 });
    let index = Expression::Variable(VariableExpression { variable_id: 2 });

    let expected_done = Expression::LessThanOrEqual(LessThanOrEqualExpression {
        left: Box::new(Expression::ListLength(ListLengthExpression {
            value: Box::new(expected_params.clone()),
        })),
        right: Box::new(index.clone()),
    });
    let actual_done = Expression::LessThanOrEqual(LessThanOrEqualExpression {
        left: Box::new(Expression::ListLength(ListLengthExpression {
            value: Box::new(actual_params.clone()),
        })),
        right: Box::new(index.clone()),
    });

    let current_expected = Expression::ListGet(ListGetExpression {
        list: Box::new(expected_params.clone()),
        index: Box::new(index.clone()),
    });
    let current_actual = Expression::ListGet(ListGetExpression {
        list: Box::new(actual_params.clone()),
        index: Box::new(index.clone()),
    });

    let exp_name = Expression::RecordGet(RecordGetExpression {
        record: Box::new(current_expected.clone()),
        key: "name".into(),
    });
    let act_name = Expression::RecordGet(RecordGetExpression {
        record: Box::new(current_actual.clone()),
        key: "name".into(),
    });
    let names_equal = Expression::Equal(EqualExpression {
        left: Box::new(exp_name),
        right: Box::new(act_name),
    });

    let exp_type = Expression::RecordGet(RecordGetExpression {
        record: Box::new(current_expected),
        key: "type".into(),
    });
    let act_type = Expression::RecordGet(RecordGetExpression {
        record: Box::new(current_actual),
        key: "type".into(),
    });

    // 引数は反変 (contravariant): expected_param_type が actual_param_type へ代入可能
    let param_assignable = call_part(
        &type_assignable_hash,
        &[("actual_type", exp_type), ("expected_type", act_type)],
    );

    let next_index = Expression::Add(AddExpression {
        left: Box::new(index),
        right: Box::new(Expression::Number(NumberExpression { value: 1 })),
    });

    let recurse = call_part(
        &assignable_fn_params_hash,
        &[
            ("expected_parameters", expected_params),
            ("actual_parameters", actual_params),
            ("index", next_index),
        ],
    );

    let current_params_ok = Expression::If(IfExpression {
        condition: Box::new(names_equal),
        then_expr: Box::new(Expression::If(IfExpression {
            condition: Box::new(param_assignable),
            then_expr: Box::new(recurse),
            else_expr: Box::new(Expression::Boolean(BooleanExpression { value: false })),
        })),
        else_expr: Box::new(Expression::Boolean(BooleanExpression { value: false })),
    });

    let body = Expression::If(IfExpression {
        condition: Box::new(expected_done),
        then_expr: Box::new(actual_done.clone()),
        else_expr: Box::new(Expression::If(IfExpression {
            condition: Box::new(actual_done),
            then_expr: Box::new(Expression::Boolean(BooleanExpression { value: false })),
            else_expr: Box::new(current_params_ok),
        })),
    });

    let param_type = PartType::Record(vec![
        RecordFieldType {
            key: "name".into(),
            value: Box::new(PartType::String),
        },
        RecordFieldType {
            key: "type".into(),
            value: Box::new(PartType::TypePart(type_ast_hash)),
        },
    ]);

    ModulePartEntry {
        name: "type-assignable-function-parameters".into(),
        part_type: Some(fn_type(
            &[
                (
                    "expected_parameters",
                    PartType::List(Box::new(param_type.clone())),
                ),
                ("actual_parameters", PartType::List(Box::new(param_type))),
                ("index", PartType::Number),
            ],
            PartType::Boolean,
        )),
        description: Description::localized(vec![
            (
                "en",
                "Check contravariant subtyping for ordered function parameters",
            ),
            ("ja", "関数パラメータの順序付き反変サブタイピング検証"),
        ]),
        content_hash: None,
        expression: Some(fn_expr(
            &[
                ("expected_parameters", 0),
                ("actual_parameters", 1),
                ("index", 2),
            ],
            body,
        )),
    }
}

/// 型代入可能性・適合性検証器: `core.type-assignable`: `(actual_type: type-ast, expected_type: type-ast) -> Boolean`
/// 実際の型が期待される型へ代入可能（サブタイプ）であるかを判定します。
/// レコードの余分なフィールドや並び順の違いを許容する幅のサブタイピングをサポートします。
pub fn create_type_assignable_part(core_module_id: &EventHashId) -> ModulePartEntry {
    let type_ast_hash = derive_module_part_id(core_module_id, "type-ast");
    let type_equals_hash = derive_module_part_id(core_module_id, "type-equals");
    let type_assignable_hash = derive_module_part_id(core_module_id, "type-assignable");
    let assignable_record_fields_hash =
        derive_module_part_id(core_module_id, "type-assignable-record-fields");
    let assignable_fn_params_hash =
        derive_module_part_id(core_module_id, "type-assignable-function-parameters");
    let assignable_union_variants_hash =
        derive_module_part_id(core_module_id, "type-assignable-union-variants");

    let actual_type = Expression::Variable(VariableExpression { variable_id: 0 });
    let expected_type = Expression::Variable(VariableExpression { variable_id: 1 });

    // 1. 同一型ならば常に代入可能: type-equals(actual_type, expected_type)
    let types_equal = call_part(
        &type_equals_hash,
        &[("t1", actual_type.clone()), ("t2", expected_type.clone())],
    );

    // 2. レコード型のサブタイピング照合
    let exp_fields_var = 20;
    let act_fields_var = 21;
    let check_record_subtyping = call_part(
        &assignable_record_fields_hash,
        &[
            (
                "expected_fields",
                Expression::Variable(VariableExpression {
                    variable_id: exp_fields_var,
                }),
            ),
            (
                "actual_fields",
                Expression::Variable(VariableExpression {
                    variable_id: act_fields_var,
                }),
            ),
            ("index", Expression::Number(NumberExpression { value: 0 })),
        ],
    );

    let match_actual_for_record = Expression::Match(MatchExpression {
        target: Box::new(actual_type.clone()),
        arms: vec![MatchArm {
            tag: "record".into(),
            variable_id: Some(act_fields_var),
            variable_name: Some("act_fields".into()),
            body: Box::new(check_record_subtyping),
        }],
        default: Some(Box::new(Expression::Boolean(BooleanExpression {
            value: false,
        }))),
    });

    // 3. 関数型のサブタイピング照合（引数は反変、戻り値は共変）
    let exp_fn_var = 30;
    let act_fn_var = 31;
    let exp_params = Expression::RecordGet(RecordGetExpression {
        record: Box::new(Expression::Variable(VariableExpression {
            variable_id: exp_fn_var,
        })),
        key: "parameters".into(),
    });
    let exp_ret = Expression::RecordGet(RecordGetExpression {
        record: Box::new(Expression::Variable(VariableExpression {
            variable_id: exp_fn_var,
        })),
        key: "return_type".into(),
    });
    let act_params = Expression::RecordGet(RecordGetExpression {
        record: Box::new(Expression::Variable(VariableExpression {
            variable_id: act_fn_var,
        })),
        key: "parameters".into(),
    });
    let act_ret = Expression::RecordGet(RecordGetExpression {
        record: Box::new(Expression::Variable(VariableExpression {
            variable_id: act_fn_var,
        })),
        key: "return_type".into(),
    });

    // 引数は反変 (contravariant): type-assignable-function-parameters(exp_params, act_params, 0)
    let param_subtyping = call_part(
        &assignable_fn_params_hash,
        &[
            ("expected_parameters", exp_params),
            ("actual_parameters", act_params),
            ("index", Expression::Number(NumberExpression { value: 0 })),
        ],
    );
    // 戻り値は共変 (covariant): type-assignable(act_ret, exp_ret)
    let ret_subtyping = call_part(
        &type_assignable_hash,
        &[("actual_type", act_ret), ("expected_type", exp_ret)],
    );

    let fn_subtyping = Expression::And(AndExpression {
        left: Box::new(param_subtyping),
        right: Box::new(ret_subtyping),
    });

    let match_actual_for_fn = Expression::Match(MatchExpression {
        target: Box::new(actual_type.clone()),
        arms: vec![MatchArm {
            tag: "function".into(),
            variable_id: Some(act_fn_var),
            variable_name: Some("act_fn".into()),
            body: Box::new(fn_subtyping),
        }],
        default: Some(Box::new(Expression::Boolean(BooleanExpression {
            value: false,
        }))),
    });

    // 4. 直和型（Union）のサブタイピング照合
    // 実際のバリアント群が期待されるバリアント群の部分集合であることを検証
    let exp_union_var = 24;
    let act_union_var = 25;
    let check_union_subtyping = call_part(
        &assignable_union_variants_hash,
        &[
            (
                "actual_variants",
                Expression::Variable(VariableExpression {
                    variable_id: act_union_var,
                }),
            ),
            (
                "expected_variants",
                Expression::Variable(VariableExpression {
                    variable_id: exp_union_var,
                }),
            ),
            ("index", Expression::Number(NumberExpression { value: 0 })),
        ],
    );

    let match_actual_for_union = Expression::Match(MatchExpression {
        target: Box::new(actual_type.clone()),
        arms: vec![MatchArm {
            tag: "union".into(),
            variable_id: Some(act_union_var),
            variable_name: Some("act_variants".into()),
            body: Box::new(check_union_subtyping),
        }],
        default: Some(Box::new(Expression::Boolean(BooleanExpression {
            value: false,
        }))),
    });

    // 5. リスト型（List）の共変サブタイピング照合
    // 実際の要素型が期待される要素型へ代入適合することを検証
    let exp_list_var = 26;
    let act_list_var = 27;
    let exp_item_type = Expression::RecordGet(RecordGetExpression {
        record: Box::new(Expression::Variable(VariableExpression {
            variable_id: exp_list_var,
        })),
        key: "item_type".into(),
    });
    let act_item_type = Expression::RecordGet(RecordGetExpression {
        record: Box::new(Expression::Variable(VariableExpression {
            variable_id: act_list_var,
        })),
        key: "item_type".into(),
    });
    let check_list_subtyping = call_part(
        &type_assignable_hash,
        &[
            ("actual_type", act_item_type),
            ("expected_type", exp_item_type),
        ],
    );

    let match_actual_for_list = Expression::Match(MatchExpression {
        target: Box::new(actual_type),
        arms: vec![MatchArm {
            tag: "list".into(),
            variable_id: Some(act_list_var),
            variable_name: Some("act_list".into()),
            body: Box::new(check_list_subtyping),
        }],
        default: Some(Box::new(Expression::Boolean(BooleanExpression {
            value: false,
        }))),
    });

    let match_expected = Expression::Match(MatchExpression {
        target: Box::new(expected_type),
        arms: vec![
            MatchArm {
                tag: "record".into(),
                variable_id: Some(exp_fields_var),
                variable_name: Some("exp_fields".into()),
                body: Box::new(match_actual_for_record),
            },
            MatchArm {
                tag: "function".into(),
                variable_id: Some(exp_fn_var),
                variable_name: Some("exp_fn".into()),
                body: Box::new(match_actual_for_fn),
            },
            MatchArm {
                tag: "union".into(),
                variable_id: Some(exp_union_var),
                variable_name: Some("exp_variants".into()),
                body: Box::new(match_actual_for_union),
            },
            MatchArm {
                tag: "list".into(),
                variable_id: Some(exp_list_var),
                variable_name: Some("exp_list".into()),
                body: Box::new(match_actual_for_list),
            },
        ],
        default: Some(Box::new(Expression::Boolean(BooleanExpression {
            value: false,
        }))),
    });

    let body = Expression::If(IfExpression {
        condition: Box::new(types_equal),
        then_expr: Box::new(Expression::Boolean(BooleanExpression { value: true })),
        else_expr: Box::new(match_expected),
    });

    ModulePartEntry {
        name: "type-assignable".into(),
        part_type: Some(fn_type(
            &[
                ("actual_type", PartType::TypePart(type_ast_hash.clone())),
                ("expected_type", PartType::TypePart(type_ast_hash)),
            ],
            PartType::Boolean,
        )),
        description: Description::localized(vec![
            (
                "en",
                "Check if actual type is assignable to expected type with width subtyping",
            ),
            (
                "ja",
                "実際の型が期待される型へ代入可能か判定（幅のサブタイピング対応）",
            ),
        ]),
        content_hash: None,
        expression: Some(fn_expr(&[("actual_type", 0), ("expected_type", 1)], body)),
    }
}
