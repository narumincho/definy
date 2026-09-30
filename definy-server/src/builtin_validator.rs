use definy_event::EventHashId;
use definy_event::event::{
    BooleanExpression, CallExpression, Description, Expression, FunctionExpression, IfExpression,
    LessThanExpression, LessThanOrEqualExpression, ListGetExpression, ListLengthExpression,
    ListLiteralExpression, MatchArm, MatchExpression, ModulePartEntry, NumberExpression,
    PartReferenceExpression, PartType, RecordGetExpression, StringLengthExpression,
    VariableExpression, derive_module_part_id,
};

/// パーツ妥当性検証器 `core.validate-part`: `part-definition -> boolean`
/// 自己記述型チェッカーを用いて、パーツの式が宣言された型と一致するかを自己検証します。
pub fn create_validate_part_part(core_module_id: &EventHashId) -> ModulePartEntry {
    let part_def_hash = derive_module_part_id(core_module_id, "part-definition");
    let type_check_against_hash = derive_module_part_id(core_module_id, "type-check-against");

    let part_var_id = 0;
    let expr_access = Expression::RecordGet(RecordGetExpression {
        record: Box::new(Expression::Variable(VariableExpression {
            variable_id: part_var_id,
        })),
        key: "expression".into(),
    });
    let declared_type_access = Expression::RecordGet(RecordGetExpression {
        record: Box::new(Expression::Variable(VariableExpression {
            variable_id: part_var_id,
        })),
        key: "part_type".into(),
    });

    let empty_env = Expression::ListLiteral(ListLiteralExpression { items: vec![] });

    // type-check-against(expr)([])(declared_type)
    let check_call = Expression::Call(CallExpression {
        function: Box::new(Expression::Call(CallExpression {
            function: Box::new(Expression::Call(CallExpression {
                function: Box::new(Expression::PartReference(PartReferenceExpression::new(
                    type_check_against_hash,
                ))),
                argument: Box::new(expr_access),
            })),
            argument: Box::new(empty_env),
        })),
        argument: Box::new(declared_type_access),
    });

    let match_expr = Expression::Match(MatchExpression {
        target: Box::new(check_call),
        arms: vec![
            MatchArm {
                tag: "ok".into(),
                variable_id: Some(10),
                variable_name: Some("checked_type".into()),
                body: Box::new(Expression::Boolean(BooleanExpression { value: true })),
            },
            MatchArm {
                tag: "error".into(),
                variable_id: Some(11),
                variable_name: Some("err".into()),
                body: Box::new(Expression::Boolean(BooleanExpression { value: false })),
            },
            MatchArm {
                tag: "_".into(),
                variable_id: Some(99),
                variable_name: Some("_".into()),
                body: Box::new(Expression::Boolean(BooleanExpression { value: false })),
            },
        ],
        default: None,
    });

    let main_expr = Expression::Function(FunctionExpression {
        parameter_id: part_var_id,
        parameter_name: "part".into(),
        body: Box::new(match_expr),
    });

    ModulePartEntry {
        name: "validate-part".into(),
        part_type: Some(PartType::Function {
            parameter: Box::new(PartType::TypePart(part_def_hash)),
            return_type: Box::new(PartType::Boolean),
        }),
        description: Description::localized(vec![
            (
                "en",
                "Validates that a part definition expression matches its declared type using the self-hosted type checker",
            ),
            (
                "ja",
                "自己記述型チェッカーを用いてパーツ定義の式が宣言された型と一致するか検証する関数",
            ),
        ]),
        content_hash: None,
        expression: Some(main_expr),
    }
}

/// パーツ一覧を再帰的に検証する関数 `core.validate-parts`。
pub fn create_validate_parts_part(core_module_id: &EventHashId) -> ModulePartEntry {
    let part_def_hash = derive_module_part_id(core_module_id, "part-definition");
    let validate_part_hash = derive_module_part_id(core_module_id, "validate-part");
    let validate_parts_hash = derive_module_part_id(core_module_id, "validate-parts");

    let parts_var_id = 0;
    let index_var_id = 1;
    let parts = Expression::Variable(VariableExpression {
        variable_id: parts_var_id,
    });
    let index = Expression::Variable(VariableExpression {
        variable_id: index_var_id,
    });
    let at_end = Expression::LessThanOrEqual(LessThanOrEqualExpression {
        left: Box::new(Expression::ListLength(ListLengthExpression {
            value: Box::new(parts.clone()),
        })),
        right: Box::new(index.clone()),
    });
    let current_part = Expression::ListGet(ListGetExpression {
        list: Box::new(parts.clone()),
        index: Box::new(index.clone()),
    });
    let current_is_valid = Expression::Call(CallExpression {
        function: Box::new(Expression::PartReference(PartReferenceExpression::new(
            validate_part_hash,
        ))),
        argument: Box::new(current_part),
    });
    let next_index = Expression::Add(definy_event::event::AddExpression {
        left: Box::new(index),
        right: Box::new(Expression::Number(NumberExpression { value: 1 })),
    });
    let validate_rest = Expression::Call(CallExpression {
        function: Box::new(Expression::Call(CallExpression {
            function: Box::new(Expression::PartReference(PartReferenceExpression::new(
                validate_parts_hash.clone(),
            ))),
            argument: Box::new(parts),
        })),
        argument: Box::new(next_index),
    });
    let body = Expression::If(IfExpression {
        condition: Box::new(at_end),
        then_expr: Box::new(Expression::Boolean(BooleanExpression { value: true })),
        else_expr: Box::new(Expression::If(IfExpression {
            condition: Box::new(current_is_valid),
            then_expr: Box::new(validate_rest),
            else_expr: Box::new(Expression::Boolean(BooleanExpression { value: false })),
        })),
    });

    let main_expr = Expression::Function(FunctionExpression {
        parameter_id: parts_var_id,
        parameter_name: "parts".into(),
        body: Box::new(Expression::Function(FunctionExpression {
            parameter_id: index_var_id,
            parameter_name: "index".into(),
            body: Box::new(body),
        })),
    });

    ModulePartEntry {
        name: "validate-parts".into(),
        part_type: Some(PartType::Function {
            parameter: Box::new(PartType::List(Box::new(PartType::TypePart(part_def_hash)))),
            return_type: Box::new(PartType::Function {
                parameter: Box::new(PartType::Number),
                return_type: Box::new(PartType::Boolean),
            }),
        }),
        description: Description::localized(vec![
            ("en", "Validates every part definition in a list"),
            ("ja", "パーツ定義のリストを最後まで検証する関数"),
        ]),
        content_hash: None,
        expression: Some(main_expr),
    }
}

/// モジュール妥当性検証器 `core.validate-module`: `module-definition -> boolean`
/// モジュール定義に含まれるメタデータ（非空の名前）や構成パーツの自己検証を行います。
pub fn create_validate_module_part(core_module_id: &EventHashId) -> ModulePartEntry {
    let mod_def_hash = derive_module_part_id(core_module_id, "module-definition");
    let validate_parts_hash = derive_module_part_id(core_module_id, "validate-parts");

    let mod_var_id = 0;
    let name_access = Expression::RecordGet(RecordGetExpression {
        record: Box::new(Expression::Variable(VariableExpression {
            variable_id: mod_var_id,
        })),
        key: "name".into(),
    });
    let parts_access = Expression::RecordGet(RecordGetExpression {
        record: Box::new(Expression::Variable(VariableExpression {
            variable_id: mod_var_id,
        })),
        key: "parts".into(),
    });

    // name_len > 0 (0 < string_length(name))
    let name_len = Expression::StringLength(StringLengthExpression {
        value: Box::new(name_access),
    });
    let name_not_empty = Expression::LessThan(LessThanExpression {
        left: Box::new(Expression::Number(NumberExpression { value: 0 })),
        right: Box::new(name_len),
    });

    // validate-parts(parts)(0)
    let parts_valid = Expression::Call(CallExpression {
        function: Box::new(Expression::Call(CallExpression {
            function: Box::new(Expression::PartReference(PartReferenceExpression::new(
                validate_parts_hash,
            ))),
            argument: Box::new(parts_access),
        })),
        argument: Box::new(Expression::Number(NumberExpression { value: 0 })),
    });

    // if name_not_empty then parts_valid else false
    let body = Expression::If(IfExpression {
        condition: Box::new(name_not_empty),
        then_expr: Box::new(parts_valid),
        else_expr: Box::new(Expression::Boolean(BooleanExpression { value: false })),
    });

    let main_expr = Expression::Function(FunctionExpression {
        parameter_id: mod_var_id,
        parameter_name: "mod_def".into(),
        body: Box::new(body),
    });

    ModulePartEntry {
        name: "validate-module".into(),
        part_type: Some(PartType::Function {
            parameter: Box::new(PartType::TypePart(mod_def_hash)),
            return_type: Box::new(PartType::Boolean),
        }),
        description: Description::localized(vec![
            (
                "en",
                "Validates a module definition ensuring non-empty module name and valid member parts",
            ),
            (
                "ja",
                "モジュール名が非空であり構成パーツが自己検証を満たすかを検証する関数",
            ),
        ]),
        content_hash: None,
        expression: Some(main_expr),
    }
}
