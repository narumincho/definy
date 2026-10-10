use crate::ast_builder::call_part;
use definy_event::EventHashId;
use definy_event::event::{
    Expression, IfExpression, MatchArm, MatchExpression, RecordGetExpression,
    TypeLiteralExpression, TypeLiteralItemExpression, VariableExpression, VariantExpression,
};

use super::helpers::{eval_sub, val_unit, val_variant};

/// 制御構文および直和型・パターンマッチアーム群を生成して追加します。
pub fn create_control_arms(
    core_module_id: &EventHashId,
    eval_value_hash: &EventHashId,
    arms: &mut Vec<MatchArm>,
) {
    let env_lookup_hash = definy_event::event::derive_module_part_id(core_module_id, "env-lookup");
    let env_extend_hash = definy_event::event::derive_module_part_id(core_module_id, "env-extend");
    let eval_call_args_hash =
        definy_event::event::derive_module_part_id(core_module_id, "eval-call-arguments");
    let eval_match_arms_hash =
        definy_event::event::derive_module_part_id(core_module_id, "eval-match-arms");

    // 7. Variable lookup: env-lookup(env, variable_id)
    {
        let var_payload_id = 20;
        let target_var_id = Expression::RecordGet(RecordGetExpression {
            record: Box::new(Expression::Variable(VariableExpression {
                variable_id: var_payload_id,
            })),
            key: "variable_id".into(),
        });
        let lookup_call = call_part(
            &env_lookup_hash,
            &[
                (
                    "env",
                    Expression::Variable(VariableExpression { variable_id: 1 }),
                ),
                ("var_id", target_var_id),
            ],
        );

        arms.push(MatchArm {
            tag: "variable".into(),
            variable_id: Some(var_payload_id),
            variable_name: Some("var".into()),
            body: Box::new(lookup_call),
        });
    }

    // 8. Conditional: if({ condition, then_expr, else_expr })
    {
        let if_var_id = 21;
        let cond_expr = Expression::RecordGet(RecordGetExpression {
            record: Box::new(Expression::Variable(VariableExpression {
                variable_id: if_var_id,
            })),
            key: "condition".into(),
        });
        let then_sub = Expression::RecordGet(RecordGetExpression {
            record: Box::new(Expression::Variable(VariableExpression {
                variable_id: if_var_id,
            })),
            key: "then_expr".into(),
        });
        let else_sub = Expression::RecordGet(RecordGetExpression {
            record: Box::new(Expression::Variable(VariableExpression {
                variable_id: if_var_id,
            })),
            key: "else_expr".into(),
        });

        let eval_cond = eval_sub(
            eval_value_hash,
            cond_expr,
            Expression::Variable(VariableExpression { variable_id: 1 }),
        );
        let eval_then = eval_sub(
            eval_value_hash,
            then_sub,
            Expression::Variable(VariableExpression { variable_id: 1 }),
        );
        let eval_else = eval_sub(
            eval_value_hash,
            else_sub,
            Expression::Variable(VariableExpression { variable_id: 1 }),
        );

        let bool_var_id = 22;
        let if_body = Expression::Match(MatchExpression {
            target: Box::new(eval_cond),
            arms: vec![
                MatchArm {
                    tag: "boolean".into(),
                    variable_id: Some(bool_var_id),
                    variable_name: Some("b".into()),
                    body: Box::new(Expression::If(IfExpression {
                        condition: Box::new(Expression::Variable(VariableExpression {
                            variable_id: bool_var_id,
                        })),
                        then_expr: Box::new(eval_then),
                        else_expr: Box::new(eval_else),
                    })),
                },
                MatchArm {
                    tag: "_".into(),
                    variable_id: Some(97),
                    variable_name: Some("_".into()),
                    body: Box::new(val_unit()),
                },
            ],
            default: None,
        });

        arms.push(MatchArm {
            tag: "if".into(),
            variable_id: Some(if_var_id),
            variable_name: Some("if_e".into()),
            body: Box::new(if_body),
        });
    }

    // 9. Function definition: function({ parameters, body }) -> value.closure
    {
        let func_var_id = 23;
        let params_expr = Expression::RecordGet(RecordGetExpression {
            record: Box::new(Expression::Variable(VariableExpression {
                variable_id: func_var_id,
            })),
            key: "parameters".into(),
        });
        let body_expr = Expression::RecordGet(RecordGetExpression {
            record: Box::new(Expression::Variable(VariableExpression {
                variable_id: func_var_id,
            })),
            key: "body".into(),
        });

        let closure_record = Expression::TypeLiteral(TypeLiteralExpression {
            items: vec![
                TypeLiteralItemExpression {
                    key: "parameters".into(),
                    value: Box::new(params_expr),
                },
                TypeLiteralItemExpression {
                    key: "body".into(),
                    value: Box::new(body_expr),
                },
                TypeLiteralItemExpression {
                    key: "captured_env".into(),
                    value: Box::new(Expression::Variable(VariableExpression { variable_id: 1 })),
                },
            ],
        });

        let closure_val = Expression::Variant(VariantExpression {
            type_part_definition_event_hash: None,
            tag: "closure".into(),
            payload: Some(Box::new(closure_record)),
        });

        arms.push(MatchArm {
            tag: "function".into(),
            variable_id: Some(func_var_id),
            variable_name: Some("fn_def".into()),
            body: Box::new(closure_val),
        });
    }

    // 10. Function call: call({ function, arguments })
    {
        let call_var_id = 24;
        let fn_expr = Expression::RecordGet(RecordGetExpression {
            record: Box::new(Expression::Variable(VariableExpression {
                variable_id: call_var_id,
            })),
            key: "function".into(),
        });
        let args_expr = Expression::RecordGet(RecordGetExpression {
            record: Box::new(Expression::Variable(VariableExpression {
                variable_id: call_var_id,
            })),
            key: "arguments".into(),
        });

        let eval_fn = eval_sub(
            eval_value_hash,
            fn_expr,
            Expression::Variable(VariableExpression { variable_id: 1 }),
        );

        let closure_var_id = 25;
        let closure_params = Expression::RecordGet(RecordGetExpression {
            record: Box::new(Expression::Variable(VariableExpression {
                variable_id: closure_var_id,
            })),
            key: "parameters".into(),
        });
        let closure_body = Expression::RecordGet(RecordGetExpression {
            record: Box::new(Expression::Variable(VariableExpression {
                variable_id: closure_var_id,
            })),
            key: "body".into(),
        });
        let closure_env = Expression::RecordGet(RecordGetExpression {
            record: Box::new(Expression::Variable(VariableExpression {
                variable_id: closure_var_id,
            })),
            key: "captured_env".into(),
        });

        let extended_env = call_part(
            &eval_call_args_hash,
            &[
                ("params", closure_params),
                ("args", args_expr),
                (
                    "caller_env",
                    Expression::Variable(VariableExpression { variable_id: 1 }),
                ),
                ("callee_env", closure_env),
                (
                    "index",
                    Expression::Number(definy_event::event::NumberExpression { value: 0 }),
                ),
            ],
        );

        let call_result = eval_sub(eval_value_hash, closure_body, extended_env);

        let call_body = Expression::Match(MatchExpression {
            target: Box::new(eval_fn),
            arms: vec![
                MatchArm {
                    tag: "closure".into(),
                    variable_id: Some(closure_var_id),
                    variable_name: Some("c".into()),
                    body: Box::new(call_result),
                },
                MatchArm {
                    tag: "_".into(),
                    variable_id: Some(96),
                    variable_name: Some("_".into()),
                    body: Box::new(val_unit()),
                },
            ],
            default: None,
        });

        arms.push(MatchArm {
            tag: "call".into(),
            variable_id: Some(call_var_id),
            variable_name: Some("call_e".into()),
            body: Box::new(call_body),
        });
    }

    // 11. Let binding: let({ variable_id, value, body })
    {
        let let_var_id = 26;
        let var_id_expr = Expression::RecordGet(RecordGetExpression {
            record: Box::new(Expression::Variable(VariableExpression {
                variable_id: let_var_id,
            })),
            key: "variable_id".into(),
        });
        let val_expr = Expression::RecordGet(RecordGetExpression {
            record: Box::new(Expression::Variable(VariableExpression {
                variable_id: let_var_id,
            })),
            key: "value".into(),
        });
        let body_expr = Expression::RecordGet(RecordGetExpression {
            record: Box::new(Expression::Variable(VariableExpression {
                variable_id: let_var_id,
            })),
            key: "body".into(),
        });

        let eval_val = eval_sub(
            eval_value_hash,
            val_expr,
            Expression::Variable(VariableExpression { variable_id: 1 }),
        );

        let extended_env = call_part(
            &env_extend_hash,
            &[
                (
                    "env",
                    Expression::Variable(VariableExpression { variable_id: 1 }),
                ),
                ("var_id", var_id_expr),
                ("val", eval_val),
            ],
        );

        let let_eval_body = eval_sub(eval_value_hash, body_expr, extended_env);

        arms.push(MatchArm {
            tag: "let".into(),
            variable_id: Some(let_var_id),
            variable_name: Some("let_e".into()),
            body: Box::new(let_eval_body),
        });
    }

    // 15. Variant constructor: variant({ tag, payload })
    {
        let var_id = 33;
        let tag_expr = Expression::RecordGet(RecordGetExpression {
            record: Box::new(Expression::Variable(VariableExpression {
                variable_id: var_id,
            })),
            key: "tag".into(),
        });
        let payload_expr = Expression::RecordGet(RecordGetExpression {
            record: Box::new(Expression::Variable(VariableExpression {
                variable_id: var_id,
            })),
            key: "payload".into(),
        });

        let payload_sub_id = 34;
        let payload_match = Expression::Match(MatchExpression {
            target: Box::new(payload_expr),
            arms: vec![
                MatchArm {
                    tag: "none".into(),
                    variable_id: None,
                    variable_name: None,
                    body: Box::new(val_variant(tag_expr.clone(), val_unit())),
                },
                MatchArm {
                    tag: "some".into(),
                    variable_id: Some(payload_sub_id),
                    variable_name: Some("sub_e".into()),
                    body: Box::new(val_variant(
                        tag_expr,
                        eval_sub(
                            eval_value_hash,
                            Expression::Variable(VariableExpression {
                                variable_id: payload_sub_id,
                            }),
                            Expression::Variable(VariableExpression { variable_id: 1 }),
                        ),
                    )),
                },
                MatchArm {
                    tag: "_".into(),
                    variable_id: Some(91),
                    variable_name: Some("_".into()),
                    body: Box::new(val_unit()),
                },
            ],
            default: None,
        });

        arms.push(MatchArm {
            tag: "variant".into(),
            variable_id: Some(var_id),
            variable_name: Some("v_def".into()),
            body: Box::new(payload_match),
        });
    }

    // 16. Match expression: match({ target, arms })
    {
        let match_var_id = 35;
        let target_expr = Expression::RecordGet(RecordGetExpression {
            record: Box::new(Expression::Variable(VariableExpression {
                variable_id: match_var_id,
            })),
            key: "target".into(),
        });
        let arms_expr = Expression::RecordGet(RecordGetExpression {
            record: Box::new(Expression::Variable(VariableExpression {
                variable_id: match_var_id,
            })),
            key: "arms".into(),
        });

        let eval_target = eval_sub(
            eval_value_hash,
            target_expr,
            Expression::Variable(VariableExpression { variable_id: 1 }),
        );

        let target_var_val_id = 36;
        let target_val_record = Expression::Variable(VariableExpression {
            variable_id: target_var_val_id,
        });

        let target_tag = Expression::RecordGet(RecordGetExpression {
            record: Box::new(target_val_record.clone()),
            key: "tag".into(),
        });
        let target_payload = Expression::RecordGet(RecordGetExpression {
            record: Box::new(target_val_record),
            key: "payload".into(),
        });

        let eval_match_call = call_part(
            &eval_match_arms_hash,
            &[
                ("arms", arms_expr),
                ("target_tag", target_tag),
                ("target_payload", target_payload),
                (
                    "env",
                    Expression::Variable(VariableExpression { variable_id: 1 }),
                ),
            ],
        );

        let match_body = Expression::Match(MatchExpression {
            target: Box::new(eval_target),
            arms: vec![
                MatchArm {
                    tag: "variant".into(),
                    variable_id: Some(target_var_val_id),
                    variable_name: Some("v_val".into()),
                    body: Box::new(eval_match_call),
                },
                MatchArm {
                    tag: "_".into(),
                    variable_id: Some(90),
                    variable_name: Some("_".into()),
                    body: Box::new(val_unit()),
                },
            ],
            default: None,
        });

        arms.push(MatchArm {
            tag: "match".into(),
            variable_id: Some(match_var_id),
            variable_name: Some("match_e".into()),
            body: Box::new(match_body),
        });
    }
}
