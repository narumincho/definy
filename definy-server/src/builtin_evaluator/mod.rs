//! 汎用自己評価器 `core.eval-value` を提供するモジュール。
//!
//! 式 AST (`core.expression`) と環境 (`core.env`) を受け取り、
//! 式の種別に応じたパターンマッチを行って動的値 (`core.value`) を返却します。

mod arith_arms;
mod control_arms;
mod helpers;
pub mod list_eval;
mod logical_arms;
pub mod record_eval;

pub use list_eval::*;
pub use record_eval::*;

use definy_event::EventHashId;
use definy_event::event::{
    Description, Expression, FunctionExpression, MatchArm, MatchExpression, ModulePartEntry,
    PartType, VariableExpression, derive_module_part_id,
};

use self::arith_arms::create_arithmetic_arms;
use self::control_arms::create_control_arms;
use self::helpers::{val_bool, val_num, val_str, val_unit};
use self::logical_arms::create_logical_arms;
use self::record_eval::create_record_eval_arms;

/// 汎用自己評価器 `core.eval-value`: `expression -> env -> value`
///
/// definy 内で定義された式 AST を、definy の純粋関数として評価・解釈実行します。
pub fn create_eval_value_part(core_module_id: &EventHashId) -> ModulePartEntry {
    let expr_type_part_hash = derive_module_part_id(core_module_id, "expression");
    let val_part_hash = derive_module_part_id(core_module_id, "value");
    let env_part_hash = derive_module_part_id(core_module_id, "env");
    let eval_value_hash = derive_module_part_id(core_module_id, "eval-value");

    let mut arms = Vec::new();

    // 1. Literal: number
    arms.push(MatchArm {
        tag: "number".into(),
        variable_id: Some(10),
        variable_name: Some("n".into()),
        body: Box::new(val_num(Expression::Variable(VariableExpression {
            variable_id: 10,
        }))),
    });

    // 2. Literal: string
    arms.push(MatchArm {
        tag: "string".into(),
        variable_id: Some(11),
        variable_name: Some("s".into()),
        body: Box::new(val_str(Expression::Variable(VariableExpression {
            variable_id: 11,
        }))),
    });

    // 3. Literal: boolean
    arms.push(MatchArm {
        tag: "boolean".into(),
        variable_id: Some(12),
        variable_name: Some("b".into()),
        body: Box::new(val_bool(Expression::Variable(VariableExpression {
            variable_id: 12,
        }))),
    });

    // 4, 5, 6. Arithmetic & Comparison
    create_arithmetic_arms(&eval_value_hash, &mut arms);

    // 7, 8, 9, 10, 11, 15, 16. Variables, Control Flow, ADT & Pattern Matching
    create_control_arms(core_module_id, &eval_value_hash, &mut arms);

    // 12, 13, 14. Logical operations
    create_logical_arms(&eval_value_hash, &mut arms);

    // 17, 18. Record operations (record, record_get)
    create_record_eval_arms(core_module_id, &eval_value_hash, &mut arms);

    // 19. List operations (list)
    create_list_eval_arms(core_module_id, &eval_value_hash, &mut arms);

    // Default arm
    arms.push(MatchArm {
        tag: "_".into(),
        variable_id: Some(95),
        variable_name: Some("_".into()),
        body: Box::new(val_unit()),
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
        name: "eval-value".into(),
        part_type: Some(PartType::Function {
            parameter: Box::new(PartType::TypePart(expr_type_part_hash)),
            return_type: Box::new(PartType::Function {
                parameter: Box::new(PartType::TypePart(env_part_hash)),
                return_type: Box::new(PartType::TypePart(val_part_hash)),
            }),
        }),
        description: Description::localized(vec![
            (
                "en",
                "Universal self-hosted AST evaluator returning dynamic values",
            ),
            ("ja", "動的値を返却する汎用自己ホスト AST 評価器"),
        ]),
        content_hash: None,
        expression: Some(main_expr),
    }
}
