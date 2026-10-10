use crate::ast_builder::{call_part, fn_expr, fn_type};
use definy_event::EventHashId;
use definy_event::event::{
    AddExpression, Description, Expression, IfExpression, LessThanOrEqualExpression,
    ListGetExpression, ListLengthExpression, ModulePartEntry, NumberExpression, PartType,
    RecordFieldType, RecordGetExpression, VariableExpression, derive_module_part_id,
};

use super::helpers::eval_sub;

/// 関数適用の引数式を呼び出し元環境で評価し、呼び出し先環境へパラメータ ID と値のペアを束縛していく関数パーツ
/// `core.eval-call-arguments`: `(params: list<param>, args: list<arg>, caller_env: env, callee_env: env, index: number) -> env`
pub fn create_eval_call_arguments_part(core_module_id: &EventHashId) -> ModulePartEntry {
    let expr_type_hash = derive_module_part_id(core_module_id, "expression");
    let env_part_hash = derive_module_part_id(core_module_id, "env");
    let env_extend_hash = derive_module_part_id(core_module_id, "env-extend");
    let eval_value_hash = derive_module_part_id(core_module_id, "eval-value");
    let eval_call_args_hash = derive_module_part_id(core_module_id, "eval-call-arguments");

    let params = Expression::Variable(VariableExpression { variable_id: 0 });
    let args = Expression::Variable(VariableExpression { variable_id: 1 });
    let caller_env = Expression::Variable(VariableExpression { variable_id: 2 });
    let callee_env = Expression::Variable(VariableExpression { variable_id: 3 });
    let index = Expression::Variable(VariableExpression { variable_id: 4 });

    let at_end = Expression::LessThanOrEqual(LessThanOrEqualExpression {
        left: Box::new(Expression::ListLength(ListLengthExpression {
            value: Box::new(params.clone()),
        })),
        right: Box::new(index.clone()),
    });

    let current_param = Expression::ListGet(ListGetExpression {
        list: Box::new(params.clone()),
        index: Box::new(index.clone()),
    });
    let current_param_id = Expression::RecordGet(RecordGetExpression {
        record: Box::new(current_param),
        key: "parameter_id".into(),
    });

    let current_arg = Expression::ListGet(ListGetExpression {
        list: Box::new(args.clone()),
        index: Box::new(index.clone()),
    });
    let current_arg_val = Expression::RecordGet(RecordGetExpression {
        record: Box::new(current_arg),
        key: "value".into(),
    });

    let eval_val = eval_sub(&eval_value_hash, current_arg_val, caller_env.clone());

    let next_env = call_part(
        &env_extend_hash,
        &[
            ("env", callee_env.clone()),
            ("var_id", current_param_id),
            ("val", eval_val),
        ],
    );

    let next_index = Expression::Add(AddExpression {
        left: Box::new(index),
        right: Box::new(Expression::Number(NumberExpression { value: 1 })),
    });

    let recurse = call_part(
        &eval_call_args_hash,
        &[
            ("params", params),
            ("args", args),
            ("caller_env", caller_env),
            ("callee_env", next_env),
            ("index", next_index),
        ],
    );

    let body = Expression::If(IfExpression {
        condition: Box::new(at_end),
        then_expr: Box::new(callee_env),
        else_expr: Box::new(recurse),
    });

    let param_type = PartType::Record(vec![
        RecordFieldType {
            key: "parameter_id".into(),
            value: Box::new(PartType::Number),
        },
        RecordFieldType {
            key: "parameter_name".into(),
            value: Box::new(PartType::String),
        },
    ]);
    let call_arg_type = PartType::Record(vec![
        RecordFieldType {
            key: "name".into(),
            value: Box::new(PartType::String),
        },
        RecordFieldType {
            key: "value".into(),
            value: Box::new(PartType::TypePart(expr_type_hash)),
        },
    ]);

    ModulePartEntry {
        name: "eval-call-arguments".into(),
        part_type: Some(fn_type(
            &[
                ("params", PartType::List(Box::new(param_type))),
                ("args", PartType::List(Box::new(call_arg_type))),
                ("caller_env", PartType::TypePart(env_part_hash.clone())),
                ("callee_env", PartType::TypePart(env_part_hash.clone())),
                ("index", PartType::Number),
            ],
            PartType::TypePart(env_part_hash),
        )),
        description: Description::localized(vec![
            (
                "en",
                "Evaluates function call arguments and binds them to the callee environment",
            ),
            (
                "ja",
                "関数呼び出しの引数式を評価し呼び出し先環境へパラメータを変数束縛",
            ),
        ]),
        content_hash: None,
        expression: Some(fn_expr(
            &[
                ("params", 0),
                ("args", 1),
                ("caller_env", 2),
                ("callee_env", 3),
                ("index", 4),
            ],
            body,
        )),
    }
}
