use definy_event::EventHashId;
use definy_event::event::{
    BooleanExpression, Expression, IfExpression, MatchArm, MatchExpression, RecordGetExpression,
    VariableExpression,
};

use super::helpers::{eval_sub, val_bool, val_unit};

/// 論理演算 (`not`, `and`, `or`) のパターンマッチアーム群を生成して追加します。
pub fn create_logical_arms(eval_value_hash: &EventHashId, arms: &mut Vec<MatchArm>) {
    // 12. Logical not: not({ value })
    {
        let not_var_id = 27;
        let val_expr = Expression::RecordGet(RecordGetExpression {
            record: Box::new(Expression::Variable(VariableExpression {
                variable_id: not_var_id,
            })),
            key: "value".into(),
        });
        let eval_v = eval_sub(
            eval_value_hash,
            val_expr,
            Expression::Variable(VariableExpression { variable_id: 1 }),
        );
        let b_id = 28;
        let not_body = Expression::Match(MatchExpression {
            target: Box::new(eval_v),
            arms: vec![
                MatchArm {
                    tag: "boolean".into(),
                    variable_id: Some(b_id),
                    variable_name: Some("b".into()),
                    body: Box::new(val_bool(Expression::If(IfExpression {
                        condition: Box::new(Expression::Variable(VariableExpression {
                            variable_id: b_id,
                        })),
                        then_expr: Box::new(Expression::Boolean(BooleanExpression {
                            value: false,
                        })),
                        else_expr: Box::new(Expression::Boolean(BooleanExpression { value: true })),
                    }))),
                },
                MatchArm {
                    tag: "_".into(),
                    variable_id: Some(94),
                    variable_name: Some("_".into()),
                    body: Box::new(val_unit()),
                },
            ],
            default: None,
        });

        arms.push(MatchArm {
            tag: "not".into(),
            variable_id: Some(not_var_id),
            variable_name: Some("not_e".into()),
            body: Box::new(not_body),
        });
    }

    // 13. Logical and: and({ left, right })
    {
        let and_var_id = 29;
        let left_expr = Expression::RecordGet(RecordGetExpression {
            record: Box::new(Expression::Variable(VariableExpression {
                variable_id: and_var_id,
            })),
            key: "left".into(),
        });
        let right_expr = Expression::RecordGet(RecordGetExpression {
            record: Box::new(Expression::Variable(VariableExpression {
                variable_id: and_var_id,
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
        let b_id = 30;
        let and_body = Expression::Match(MatchExpression {
            target: Box::new(eval_l),
            arms: vec![
                MatchArm {
                    tag: "boolean".into(),
                    variable_id: Some(b_id),
                    variable_name: Some("b".into()),
                    body: Box::new(Expression::If(IfExpression {
                        condition: Box::new(Expression::Variable(VariableExpression {
                            variable_id: b_id,
                        })),
                        then_expr: Box::new(eval_r),
                        else_expr: Box::new(val_bool(Expression::Boolean(BooleanExpression {
                            value: false,
                        }))),
                    })),
                },
                MatchArm {
                    tag: "_".into(),
                    variable_id: Some(93),
                    variable_name: Some("_".into()),
                    body: Box::new(val_unit()),
                },
            ],
            default: None,
        });

        arms.push(MatchArm {
            tag: "and".into(),
            variable_id: Some(and_var_id),
            variable_name: Some("and_e".into()),
            body: Box::new(and_body),
        });
    }

    // 14. Logical or: or({ left, right })
    {
        let or_var_id = 31;
        let left_expr = Expression::RecordGet(RecordGetExpression {
            record: Box::new(Expression::Variable(VariableExpression {
                variable_id: or_var_id,
            })),
            key: "left".into(),
        });
        let right_expr = Expression::RecordGet(RecordGetExpression {
            record: Box::new(Expression::Variable(VariableExpression {
                variable_id: or_var_id,
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
        let b_id = 32;
        let or_body = Expression::Match(MatchExpression {
            target: Box::new(eval_l),
            arms: vec![
                MatchArm {
                    tag: "boolean".into(),
                    variable_id: Some(b_id),
                    variable_name: Some("b".into()),
                    body: Box::new(Expression::If(IfExpression {
                        condition: Box::new(Expression::Variable(VariableExpression {
                            variable_id: b_id,
                        })),
                        then_expr: Box::new(val_bool(Expression::Boolean(BooleanExpression {
                            value: true,
                        }))),
                        else_expr: Box::new(eval_r),
                    })),
                },
                MatchArm {
                    tag: "_".into(),
                    variable_id: Some(92),
                    variable_name: Some("_".into()),
                    body: Box::new(val_unit()),
                },
            ],
            default: None,
        });

        arms.push(MatchArm {
            tag: "or".into(),
            variable_id: Some(or_var_id),
            variable_name: Some("or_e".into()),
            body: Box::new(or_body),
        });
    }
}
