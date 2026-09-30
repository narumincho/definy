use definy_event::EventHashId;
use definy_event::event::{
    AddExpression, AndExpression, BooleanExpression, CallExpression, Description, Expression,
    FunctionExpression, IfExpression, LessThanOrEqualExpression, ListGetExpression,
    ListLengthExpression, MatchArm, MatchExpression, ModulePartEntry, NumberExpression,
    PartReferenceExpression, PartType, RecordFieldType, RecordGetExpression, VariableExpression,
    derive_module_part_id,
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
    let lookup_call = Expression::Call(CallExpression {
        function: Box::new(Expression::Call(CallExpression {
            function: Box::new(Expression::Call(CallExpression {
                function: Box::new(Expression::PartReference(PartReferenceExpression::new(
                    record_field_type_lookup_hash,
                ))),
                argument: Box::new(actual_fields.clone()),
            })),
            argument: Box::new(exp_key),
        })),
        argument: Box::new(Expression::Number(NumberExpression { value: 0 })),
    });

    let next_index = Expression::Add(AddExpression {
        left: Box::new(index),
        right: Box::new(Expression::Number(NumberExpression { value: 1 })),
    });

    let recurse = Expression::Call(CallExpression {
        function: Box::new(Expression::Call(CallExpression {
            function: Box::new(Expression::Call(CallExpression {
                function: Box::new(Expression::PartReference(PartReferenceExpression::new(
                    assignable_record_fields_hash,
                ))),
                argument: Box::new(expected_fields),
            })),
            argument: Box::new(actual_fields),
        })),
        argument: Box::new(next_index),
    });

    let act_type_var = 10;
    // type-assignable(act_type, exp_field_type)
    let field_type_assignable = Expression::Call(CallExpression {
        function: Box::new(Expression::Call(CallExpression {
            function: Box::new(Expression::PartReference(PartReferenceExpression::new(
                type_assignable_hash,
            ))),
            argument: Box::new(Expression::Variable(VariableExpression {
                variable_id: act_type_var,
            })),
        })),
        argument: Box::new(exp_field_type),
    });

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
        part_type: Some(PartType::Function {
            parameter: Box::new(PartType::List(Box::new(field_type.clone()))),
            return_type: Box::new(PartType::Function {
                parameter: Box::new(PartType::List(Box::new(field_type))),
                return_type: Box::new(PartType::Function {
                    parameter: Box::new(PartType::Number),
                    return_type: Box::new(PartType::Boolean),
                }),
            }),
        }),
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
        expression: Some(Expression::Function(FunctionExpression {
            parameter_id: 0,
            parameter_name: "expected_fields".into(),
            body: Box::new(Expression::Function(FunctionExpression {
                parameter_id: 1,
                parameter_name: "actual_fields".into(),
                body: Box::new(Expression::Function(FunctionExpression {
                    parameter_id: 2,
                    parameter_name: "index".into(),
                    body: Box::new(body),
                })),
            })),
        })),
    }
}

/// 型代入可能性・適合性検証器: `core.type-assignable`: `actual_type -> expected_type -> boolean`
/// 実際の型が期待される型へ代入可能（サブタイプ）であるかを判定します。
/// レコードの余分なフィールドや並び順の違いを許容する幅のサブタイピングをサポートします。
pub fn create_type_assignable_part(core_module_id: &EventHashId) -> ModulePartEntry {
    let type_ast_hash = derive_module_part_id(core_module_id, "type-ast");
    let type_equals_hash = derive_module_part_id(core_module_id, "type-equals");
    let type_assignable_hash = derive_module_part_id(core_module_id, "type-assignable");
    let assignable_record_fields_hash =
        derive_module_part_id(core_module_id, "type-assignable-record-fields");

    let actual_type = Expression::Variable(VariableExpression { variable_id: 0 });
    let expected_type = Expression::Variable(VariableExpression { variable_id: 1 });

    // 1. 同一型ならば常に代入可能: type-equals(actual_type, expected_type)
    let types_equal = Expression::Call(CallExpression {
        function: Box::new(Expression::Call(CallExpression {
            function: Box::new(Expression::PartReference(PartReferenceExpression::new(
                type_equals_hash,
            ))),
            argument: Box::new(actual_type.clone()),
        })),
        argument: Box::new(expected_type.clone()),
    });

    // 2. レコード型のサブタイピング照合
    let exp_fields_var = 20;
    let act_fields_var = 21;
    let check_record_subtyping = Expression::Call(CallExpression {
        function: Box::new(Expression::Call(CallExpression {
            function: Box::new(Expression::Call(CallExpression {
                function: Box::new(Expression::PartReference(PartReferenceExpression::new(
                    assignable_record_fields_hash,
                ))),
                argument: Box::new(Expression::Variable(VariableExpression {
                    variable_id: exp_fields_var,
                })),
            })),
            argument: Box::new(Expression::Variable(VariableExpression {
                variable_id: act_fields_var,
            })),
        })),
        argument: Box::new(Expression::Number(NumberExpression { value: 0 })),
    });

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
    let exp_param = Expression::RecordGet(RecordGetExpression {
        record: Box::new(Expression::Variable(VariableExpression {
            variable_id: exp_fn_var,
        })),
        key: "parameter".into(),
    });
    let exp_ret = Expression::RecordGet(RecordGetExpression {
        record: Box::new(Expression::Variable(VariableExpression {
            variable_id: exp_fn_var,
        })),
        key: "return_type".into(),
    });
    let act_param = Expression::RecordGet(RecordGetExpression {
        record: Box::new(Expression::Variable(VariableExpression {
            variable_id: act_fn_var,
        })),
        key: "parameter".into(),
    });
    let act_ret = Expression::RecordGet(RecordGetExpression {
        record: Box::new(Expression::Variable(VariableExpression {
            variable_id: act_fn_var,
        })),
        key: "return_type".into(),
    });

    // type-assignable(exp_param, act_param) -- 引数の反変
    let param_subtyping = Expression::Call(CallExpression {
        function: Box::new(Expression::Call(CallExpression {
            function: Box::new(Expression::PartReference(PartReferenceExpression::new(
                type_assignable_hash.clone(),
            ))),
            argument: Box::new(exp_param),
        })),
        argument: Box::new(act_param),
    });
    // type-assignable(act_ret, exp_ret) -- 戻り値の共変
    let ret_subtyping = Expression::Call(CallExpression {
        function: Box::new(Expression::Call(CallExpression {
            function: Box::new(Expression::PartReference(PartReferenceExpression::new(
                type_assignable_hash,
            ))),
            argument: Box::new(act_ret),
        })),
        argument: Box::new(exp_ret),
    });

    let fn_subtyping = Expression::And(AndExpression {
        left: Box::new(param_subtyping),
        right: Box::new(ret_subtyping),
    });

    let match_actual_for_fn = Expression::Match(MatchExpression {
        target: Box::new(actual_type),
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
        part_type: Some(PartType::Function {
            parameter: Box::new(PartType::TypePart(type_ast_hash.clone())),
            return_type: Box::new(PartType::Function {
                parameter: Box::new(PartType::TypePart(type_ast_hash)),
                return_type: Box::new(PartType::Boolean),
            }),
        }),
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
        expression: Some(Expression::Function(FunctionExpression {
            parameter_id: 0,
            parameter_name: "actual_type".into(),
            body: Box::new(Expression::Function(FunctionExpression {
                parameter_id: 1,
                parameter_name: "expected_type".into(),
                body: Box::new(body),
            })),
        })),
    }
}
