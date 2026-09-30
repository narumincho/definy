use definy_event::EventHashId;
use definy_event::event::{
    AddExpression, DivideExpression, EqualExpression, Expression, LessThanExpression, MatchArm,
    MatchExpression, MultiplyExpression, RecordGetExpression, RemainderExpression,
    SubtractExpression, VariableExpression,
};

use super::helpers::{eval_sub, val_bool, val_num, val_unit};

fn binary_arith_arm(
    tag: &'static str,
    eval_hash: &EventHashId,
    var_id: i64,
    op_fn: fn(Expression, Expression) -> Expression,
) -> MatchArm {
    let left_expr = Expression::RecordGet(RecordGetExpression {
        record: Box::new(Expression::Variable(VariableExpression {
            variable_id: var_id,
        })),
        key: "left".into(),
    });
    let right_expr = Expression::RecordGet(RecordGetExpression {
        record: Box::new(Expression::Variable(VariableExpression {
            variable_id: var_id,
        })),
        key: "right".into(),
    });

    let eval_l = eval_sub(
        eval_hash,
        left_expr,
        Expression::Variable(VariableExpression { variable_id: 1 }),
    );
    let eval_r = eval_sub(
        eval_hash,
        right_expr,
        Expression::Variable(VariableExpression { variable_id: 1 }),
    );

    let left_num_var = 10;
    let right_num_var = 11;

    let compute = val_num(op_fn(
        Expression::Variable(VariableExpression {
            variable_id: left_num_var,
        }),
        Expression::Variable(VariableExpression {
            variable_id: right_num_var,
        }),
    ));

    let inner_match = Expression::Match(MatchExpression {
        target: Box::new(eval_r),
        arms: vec![
            MatchArm {
                tag: "number".into(),
                variable_id: Some(right_num_var),
                variable_name: Some("r_num".into()),
                body: Box::new(compute),
            },
            MatchArm {
                tag: "_".into(),
                variable_id: Some(99),
                variable_name: Some("_".into()),
                body: Box::new(val_unit()),
            },
        ],
        default: None,
    });

    let outer_match = Expression::Match(MatchExpression {
        target: Box::new(eval_l),
        arms: vec![
            MatchArm {
                tag: "number".into(),
                variable_id: Some(left_num_var),
                variable_name: Some("l_num".into()),
                body: Box::new(inner_match),
            },
            MatchArm {
                tag: "_".into(),
                variable_id: Some(98),
                variable_name: Some("_".into()),
                body: Box::new(val_unit()),
            },
        ],
        default: None,
    });

    MatchArm {
        tag: tag.into(),
        variable_id: Some(var_id),
        variable_name: Some("bin".into()),
        body: Box::new(outer_match),
    }
}

/// 算術演算・比較演算のパターンマッチアーム群を生成して追加します。
pub fn create_arithmetic_arms(eval_value_hash: &EventHashId, arms: &mut Vec<MatchArm>) {
    // 4. Arithmetic
    arms.push(binary_arith_arm("add", eval_value_hash, 13, |l, r| {
        Expression::Add(AddExpression {
            left: Box::new(l),
            right: Box::new(r),
        })
    }));
    arms.push(binary_arith_arm("subtract", eval_value_hash, 14, |l, r| {
        Expression::Subtract(SubtractExpression {
            left: Box::new(l),
            right: Box::new(r),
        })
    }));
    arms.push(binary_arith_arm("multiply", eval_value_hash, 15, |l, r| {
        Expression::Multiply(MultiplyExpression {
            left: Box::new(l),
            right: Box::new(r),
        })
    }));
    arms.push(binary_arith_arm("divide", eval_value_hash, 16, |l, r| {
        Expression::Divide(DivideExpression {
            left: Box::new(l),
            right: Box::new(r),
        })
    }));
    arms.push(binary_arith_arm(
        "remainder",
        eval_value_hash,
        17,
        |l, r| {
            Expression::Remainder(RemainderExpression {
                left: Box::new(l),
                right: Box::new(r),
            })
        },
    ));

    // 5. Comparison: equal
    {
        let var_id = 18;
        let left_expr = Expression::RecordGet(RecordGetExpression {
            record: Box::new(Expression::Variable(VariableExpression {
                variable_id: var_id,
            })),
            key: "left".into(),
        });
        let right_expr = Expression::RecordGet(RecordGetExpression {
            record: Box::new(Expression::Variable(VariableExpression {
                variable_id: var_id,
            })),
            key: "right".into(),
        });
        let eval_l = eval_sub(
            eval_value_hash,
            left_expr,
            Expression::Variable(VariableExpression { variable_id: 1 }),
        );
        let eval_r = eval_sub(
            eval_value_hash,
            right_expr,
            Expression::Variable(VariableExpression { variable_id: 1 }),
        );

        arms.push(MatchArm {
            tag: "equal".into(),
            variable_id: Some(var_id),
            variable_name: Some("eq".into()),
            body: Box::new(val_bool(Expression::Equal(EqualExpression {
                left: Box::new(eval_l),
                right: Box::new(eval_r),
            }))),
        });
    }

    // 6. Comparison: less_than
    arms.push(binary_arith_arm(
        "less_than",
        eval_value_hash,
        19,
        |l, r| {
            Expression::LessThan(LessThanExpression {
                left: Box::new(l),
                right: Box::new(r),
            })
        },
    ));
}
