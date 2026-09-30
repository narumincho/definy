use definy_event::EventHashId;
use definy_event::event::{
    BooleanExpression, CallExpression, Description, Expression, FunctionExpression,
    ListLiteralExpression, MatchArm, MatchExpression, ModulePartEntry, PartReferenceExpression,
    PartType, RecordGetExpression, VariableExpression, derive_module_part_id,
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
