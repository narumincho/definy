use definy_event::EventHashId;
use definy_event::event::{
    CallExpression, Description, Expression, FunctionExpression, IfExpression, MatchArm,
    MatchExpression, ModulePartEntry, PartReferenceExpression, PartType, RecordGetExpression,
    StringConcatExpression, StringExpression, VariableExpression, derive_module_part_id,
};

/// definy AST を人間可読なソースコード文字列に変換する自己ホスト式
/// `core.expression-to-source`: `expression -> string`
pub fn create_expression_to_source_part(core_module_id: &EventHashId) -> ModulePartEntry {
    let expr_type_part_hash = derive_module_part_id(core_module_id, "expression");
    let to_source_hash = derive_module_part_id(core_module_id, "expression-to-source");

    fn str_lit(s: &str) -> Expression {
        Expression::String(StringExpression { value: s.into() })
    }

    fn concat(left: Expression, right: Expression) -> Expression {
        Expression::StringConcat(StringConcatExpression {
            left: Box::new(left),
            right: Box::new(right),
        })
    }

    fn rec_call(to_source_hash: &EventHashId, sub_expr: Expression) -> Expression {
        Expression::Call(CallExpression {
            function: Box::new(Expression::PartReference(PartReferenceExpression::new(
                to_source_hash.clone(),
            ))),
            argument: Box::new(sub_expr),
        })
    }

    let binary_op_arm = |tag: &'static str,
                         symbol: &'static str,
                         to_source_hash: &EventHashId,
                         var_id: i64|
     -> MatchArm {
        let left_sub = Expression::RecordGet(RecordGetExpression {
            record: Box::new(Expression::Variable(VariableExpression {
                variable_id: var_id,
            })),
            key: "left".into(),
        });
        let right_sub = Expression::RecordGet(RecordGetExpression {
            record: Box::new(Expression::Variable(VariableExpression {
                variable_id: var_id,
            })),
            key: "right".into(),
        });

        let rec_left = rec_call(to_source_hash, left_sub);
        let rec_right = rec_call(to_source_hash, right_sub);

        let body = concat(
            str_lit("("),
            concat(
                rec_left,
                concat(str_lit(symbol), concat(rec_right, str_lit(")"))),
            ),
        );

        MatchArm {
            tag: tag.into(),
            variable_id: Some(var_id),
            variable_name: Some("bin".into()),
            body: Box::new(body),
        }
    };

    let mut arms = vec![
        // 1. Literal: number
        MatchArm {
            tag: "number".into(),
            variable_id: Some(10),
            variable_name: Some("n".into()),
            body: Box::new(str_lit("<number>")),
        },
        // 2. Literal: string
        MatchArm {
            tag: "string".into(),
            variable_id: Some(11),
            variable_name: Some("s".into()),
            body: Box::new(Expression::Variable(VariableExpression { variable_id: 11 })),
        },
        // 3. Literal: boolean
        MatchArm {
            tag: "boolean".into(),
            variable_id: Some(12),
            variable_name: Some("b".into()),
            body: Box::new(Expression::If(IfExpression {
                condition: Box::new(Expression::Variable(VariableExpression { variable_id: 12 })),
                then_expr: Box::new(str_lit("true")),
                else_expr: Box::new(str_lit("false")),
            })),
        },
        // 4. Arithmetic operators
        binary_op_arm("add", " + ", &to_source_hash, 13),
        binary_op_arm("subtract", " - ", &to_source_hash, 14),
        binary_op_arm("multiply", " * ", &to_source_hash, 15),
        binary_op_arm("divide", " / ", &to_source_hash, 16),
        binary_op_arm("remainder", " % ", &to_source_hash, 17),
        // 5. Comparison operators
        binary_op_arm("equal", " == ", &to_source_hash, 18),
        binary_op_arm("less_than", " < ", &to_source_hash, 19),
        // 6. Logical operators
        binary_op_arm("and", " && ", &to_source_hash, 20),
        binary_op_arm("or", " || ", &to_source_hash, 21),
    ];

    // 7. Logical not: not({ value })
    {
        let not_var_id = 22;
        let val_sub = Expression::RecordGet(RecordGetExpression {
            record: Box::new(Expression::Variable(VariableExpression {
                variable_id: not_var_id,
            })),
            key: "value".into(),
        });
        let rec_val = rec_call(&to_source_hash, val_sub);
        arms.push(MatchArm {
            tag: "not".into(),
            variable_id: Some(not_var_id),
            variable_name: Some("not_e".into()),
            body: Box::new(concat(str_lit("!"), rec_val)),
        });
    }

    // 8. Variable: variable({ variable_id })
    arms.push(MatchArm {
        tag: "variable".into(),
        variable_id: Some(23),
        variable_name: Some("v".into()),
        body: Box::new(str_lit("var")),
    });

    // 9. Conditional: if({ condition, then_expr, else_expr })
    {
        let if_var_id = 24;
        let cond_sub = Expression::RecordGet(RecordGetExpression {
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

        let rec_cond = rec_call(&to_source_hash, cond_sub);
        let rec_then = rec_call(&to_source_hash, then_sub);
        let rec_else = rec_call(&to_source_hash, else_sub);

        let if_str = concat(
            str_lit("if ("),
            concat(
                rec_cond,
                concat(
                    str_lit(") then "),
                    concat(rec_then, concat(str_lit(" else "), rec_else)),
                ),
            ),
        );

        arms.push(MatchArm {
            tag: "if".into(),
            variable_id: Some(if_var_id),
            variable_name: Some("if_e".into()),
            body: Box::new(if_str),
        });
    }

    // 10. Call: call({ function, argument })
    {
        let call_var_id = 25;
        let fn_sub = Expression::RecordGet(RecordGetExpression {
            record: Box::new(Expression::Variable(VariableExpression {
                variable_id: call_var_id,
            })),
            key: "function".into(),
        });
        let arg_sub = Expression::RecordGet(RecordGetExpression {
            record: Box::new(Expression::Variable(VariableExpression {
                variable_id: call_var_id,
            })),
            key: "argument".into(),
        });

        let rec_fn = rec_call(&to_source_hash, fn_sub);
        let rec_arg = rec_call(&to_source_hash, arg_sub);

        let call_str = concat(rec_fn, concat(str_lit("("), concat(rec_arg, str_lit(")"))));

        arms.push(MatchArm {
            tag: "call".into(),
            variable_id: Some(call_var_id),
            variable_name: Some("c".into()),
            body: Box::new(call_str),
        });
    }

    // Default arm
    arms.push(MatchArm {
        tag: "_".into(),
        variable_id: Some(99),
        variable_name: Some("_".into()),
        body: Box::new(str_lit("...")),
    });

    let main_expr = Expression::Function(FunctionExpression {
        parameter_id: 0,
        parameter_name: "expr".into(),
        body: Box::new(Expression::Match(MatchExpression {
            target: Box::new(Expression::Variable(VariableExpression { variable_id: 0 })),
            arms,
            default: None,
        })),
    });

    ModulePartEntry {
        name: "expression-to-source".into(),
        part_type: Some(PartType::Function {
            parameter: Box::new(PartType::TypePart(expr_type_part_hash)),
            return_type: Box::new(PartType::String),
        }),
        description: Description::localized(vec![
            (
                "en",
                "Converts a Definy AST expression to a source code string (self-hosted formatter)",
            ),
            (
                "ja",
                "Definy の AST 式をソースコード文字列に変換する関数 (自己記述フォーマッター)",
            ),
        ]),
        content_hash: None,
        expression: Some(main_expr),
    }
}
