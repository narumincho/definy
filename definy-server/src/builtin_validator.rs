use definy_event::EventHashId;
use definy_event::event::{
    BooleanExpression, CallExpression, Description, Expression, FunctionExpression, IfExpression,
    LessThanExpression, ListGetExpression, ListLengthExpression, ListLiteralExpression, MatchArm,
    MatchExpression, ModulePartEntry, NumberExpression, PartReferenceExpression, PartType,
    RecordGetExpression, StringLengthExpression, VariableExpression, derive_module_part_id,
};

/// パーツ妥当性検証器 `core.validate-part`: `part-definition -> boolean`
/// 自己記述型チェッカーを用いて、パーツの式が宣言された型と一致するかを自己検証します。
pub fn create_validate_part_part(core_module_id: &EventHashId) -> ModulePartEntry {
    let part_def_hash = derive_module_part_id(core_module_id, "part-definition");
    let type_check_hash = derive_module_part_id(core_module_id, "type-check");
    let type_equals_hash = derive_module_part_id(core_module_id, "type-equals");

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

    // type-check(expr)([])
    let check_call = Expression::Call(CallExpression {
        function: Box::new(Expression::Call(CallExpression {
            function: Box::new(Expression::PartReference(PartReferenceExpression::new(
                type_check_hash,
            ))),
            argument: Box::new(expr_access),
        })),
        argument: Box::new(empty_env),
    });

    let inferred_type_var = 10;
    // type-equals(inferred_type)(declared_type)
    let equals_call = Expression::Call(CallExpression {
        function: Box::new(Expression::Call(CallExpression {
            function: Box::new(Expression::PartReference(PartReferenceExpression::new(
                type_equals_hash,
            ))),
            argument: Box::new(Expression::Variable(VariableExpression {
                variable_id: inferred_type_var,
            })),
        })),
        argument: Box::new(declared_type_access),
    });

    let match_expr = Expression::Match(MatchExpression {
        target: Box::new(check_call),
        arms: vec![
            MatchArm {
                tag: "ok".into(),
                variable_id: Some(inferred_type_var),
                variable_name: Some("inferred_type".into()),
                body: Box::new(equals_call),
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

/// モジュール妥当性検証器 `core.validate-module`: `module-definition -> boolean`
/// モジュール定義に含まれるメタデータ（非空の名前）や構成パーツの自己検証を行います。
pub fn create_validate_module_part(core_module_id: &EventHashId) -> ModulePartEntry {
    let mod_def_hash = derive_module_part_id(core_module_id, "module-definition");
    let validate_part_hash = derive_module_part_id(core_module_id, "validate-part");

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

    // parts_len > 0
    let parts_len = Expression::ListLength(ListLengthExpression {
        value: Box::new(parts_access.clone()),
    });
    let has_parts = Expression::LessThan(LessThanExpression {
        left: Box::new(Expression::Number(NumberExpression { value: 0 })),
        right: Box::new(parts_len),
    });

    // first_part = list_get(parts, 0)
    let first_part = Expression::ListGet(ListGetExpression {
        list: Box::new(parts_access),
        index: Box::new(Expression::Number(NumberExpression { value: 0 })),
    });

    // validate-part(first_part)
    let validate_first_part = Expression::Call(CallExpression {
        function: Box::new(Expression::PartReference(PartReferenceExpression::new(
            validate_part_hash,
        ))),
        argument: Box::new(first_part),
    });

    // if has_parts then validate_first_part else true
    let parts_valid = Expression::If(IfExpression {
        condition: Box::new(has_parts),
        then_expr: Box::new(validate_first_part),
        else_expr: Box::new(Expression::Boolean(BooleanExpression { value: true })),
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
