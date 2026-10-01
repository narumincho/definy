use definy_event::EventHashId;
use definy_event::event::{
    Description, Expression, FunctionExpression, MatchArm, MatchExpression, ModulePartEntry,
    PartType, VariableExpression, derive_module_part_id,
};

use super::basic_arms::create_basic_check_arms;
use super::control_arms::create_control_check_arms;
use super::helpers::error_unknown;
use super::list_ops::create_list_check_arms;
use super::record_ops::create_record_check_arms;
use super::union_check::create_union_check_arms;

/// 自己記述型チェッカー `core.type-check`: `expression -> type-env -> type-result`
pub fn create_type_check_part(core_module_id: &EventHashId) -> ModulePartEntry {
    let expr_type_part_hash = derive_module_part_id(core_module_id, "expression");
    let type_env_part_hash = derive_module_part_id(core_module_id, "type-env");
    let type_result_part_hash = derive_module_part_id(core_module_id, "type-result");
    let type_check_hash = derive_module_part_id(core_module_id, "type-check");
    let type_check_against_hash = derive_module_part_id(core_module_id, "type-check-against");
    let type_equals_hash = derive_module_part_id(core_module_id, "type-equals");
    let type_assignable_hash = derive_module_part_id(core_module_id, "type-assignable");
    let type_env_lookup_hash = derive_module_part_id(core_module_id, "type-env-lookup");
    let type_env_extend_hash = derive_module_part_id(core_module_id, "type-env-extend");
    let record_field_type_lookup_hash =
        derive_module_part_id(core_module_id, "record-field-type-lookup");
    let check_record_fields_hash =
        derive_module_part_id(core_module_id, "type-check-record-fields");
    let type_check_match_arms_hash = derive_module_part_id(core_module_id, "type-check-match-arms");
    let type_check_list_hash = derive_module_part_id(core_module_id, "type-check-list");

    let mut arms = Vec::new();

    // 1. Literal types, Arithmetic, Comparison, and Logical operations
    arms.extend(create_basic_check_arms(&type_check_hash, &type_equals_hash));

    // 2. Function calls, Variable lookup, Conditionals, and Let bindings
    arms.extend(create_control_check_arms(
        &type_check_hash,
        &type_check_against_hash,
        &type_assignable_hash,
        &type_equals_hash,
        &type_env_lookup_hash,
        &type_env_extend_hash,
    ));

    // 3. Record operations: record_get, record
    arms.extend(create_record_check_arms(
        &type_check_hash,
        record_field_type_lookup_hash,
        check_record_fields_hash,
    ));

    // 4. Union operations: variant, match
    arms.extend(create_union_check_arms(
        &type_check_hash,
        &type_check_match_arms_hash,
    ));

    // 5. List operations: list
    arms.extend(create_list_check_arms(&type_check_list_hash));

    // Default arm: unknown_error
    arms.push(MatchArm {
        tag: "_".into(),
        variable_id: Some(99),
        variable_name: Some("_".into()),
        body: Box::new(error_unknown()),
    });

    let main_expr = Expression::Function(FunctionExpression {
        parameter_id: 0,
        parameter_name: "expr".into(),
        body: Box::new(Expression::Function(FunctionExpression {
            parameter_id: 1,
            parameter_name: "env".into(),
            body: Box::new(Expression::Match(MatchExpression {
                target: Box::new(Expression::Variable(VariableExpression { variable_id: 0 })),
                arms,
                default: None,
            })),
        })),
    });

    ModulePartEntry {
        name: "type-check".into(),
        part_type: Some(PartType::Function {
            parameter: Box::new(PartType::TypePart(expr_type_part_hash)),
            return_type: Box::new(PartType::Function {
                parameter: Box::new(PartType::TypePart(type_env_part_hash)),
                return_type: Box::new(PartType::TypePart(type_result_part_hash)),
            }),
        }),
        description: Description::localized(vec![
            (
                "en",
                "Self-hosted type checker verifying expressions and deriving types",
            ),
            ("ja", "式の整合性を検証し型を導出する自己記述型チェッカー"),
        ]),
        content_hash: None,
        expression: Some(main_expr),
    }
}
