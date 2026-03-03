#[derive(Debug, Clone, PartialEq)]
pub enum Value {
    Number(i64),
    Bool(bool),
}

impl std::fmt::Display for Value {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Value::Number(n) => write!(f, "{}", n),
            Value::Bool(b) => write!(f, "{}", if *b { "True" } else { "False" }),
        }
    }
}

pub fn evaluate_expression(
    expression: &definy_event::event::Expression,
    events: &[(
        [u8; 32],
        Result<
            (ed25519_dalek::Signature, definy_event::event::Event),
            definy_event::VerifyAndDeserializeError,
        >,
    )],
) -> Result<Value, &'static str> {
    evaluate_expression_with_depth(expression, events, 0)
}

fn evaluate_expression_with_depth(
    expression: &definy_event::event::Expression,
    events: &[(
        [u8; 32],
        Result<
            (ed25519_dalek::Signature, definy_event::event::Event),
            definy_event::VerifyAndDeserializeError,
        >,
    )],
    depth: usize,
) -> Result<Value, &'static str> {
    if depth > 100 {
        return Err("Maximum evaluation depth exceeded (possible circular reference)");
    }
    match expression {
        definy_event::event::Expression::Number(number_expression) => {
            Ok(Value::Number(number_expression.value))
        }
        definy_event::event::Expression::Add(add_expression) => {
            let left =
                evaluate_expression_with_depth(add_expression.left.as_ref(), events, depth + 1)?;
            let right =
                evaluate_expression_with_depth(add_expression.right.as_ref(), events, depth + 1)?;
            match (left, right) {
                (Value::Number(l), Value::Number(r)) => l
                    .checked_add(r)
                    .map(Value::Number)
                    .ok_or("overflow while adding two numbers"),
                _ => Err("can only add numbers"),
            }
        }
        definy_event::event::Expression::Boolean(boolean_expression) => {
            Ok(Value::Bool(boolean_expression.value))
        }
        definy_event::event::Expression::If(if_expression) => {
            let condition = evaluate_expression_with_depth(
                if_expression.condition.as_ref(),
                events,
                depth + 1,
            )?;
            match condition {
                Value::Bool(b) => {
                    if b {
                        evaluate_expression_with_depth(
                            if_expression.then_expr.as_ref(),
                            events,
                            depth + 1,
                        )
                    } else {
                        evaluate_expression_with_depth(
                            if_expression.else_expr.as_ref(),
                            events,
                            depth + 1,
                        )
                    }
                }
                _ => Err("condition of an if expression must evaluate to a boolean"),
            }
        }
        definy_event::event::Expression::Equal(equal_expression) => {
            let left =
                evaluate_expression_with_depth(equal_expression.left.as_ref(), events, depth + 1)?;
            let right =
                evaluate_expression_with_depth(equal_expression.right.as_ref(), events, depth + 1)?;
            Ok(Value::Bool(left == right))
        }
        definy_event::event::Expression::PartReference(part_reference_expression) => {
            let mut latest_expression = None;
            for (_, event_result) in events.iter().rev() {
                if let Ok((_, event)) = event_result {
                    match &event.content {
                        definy_event::event::EventContent::PartDefinition(part_definition) => {
                            if part_definition.part_name == part_reference_expression.part_name {
                                latest_expression = Some(&part_definition.expression);
                                break;
                            }
                        }
                        definy_event::event::EventContent::PartUpdate(part_update) => {
                            if part_update.part_name == part_reference_expression.part_name {
                                latest_expression = Some(&part_update.expression);
                                break;
                            }
                        }
                        _ => {}
                    }
                }
            }
            if let Some(expr) = latest_expression {
                evaluate_expression_with_depth(expr, events, depth + 1)
            } else {
                Err("Part not found")
            }
        }
    }
}

pub fn expression_to_source(expression: &definy_event::event::Expression) -> String {
    fn render(expression: &definy_event::event::Expression, is_child: bool) -> String {
        match expression {
            definy_event::event::Expression::Number(number_expression) => {
                number_expression.value.to_string()
            }
            definy_event::event::Expression::Add(add_expression) => {
                let source = format!(
                    "+ {} {}",
                    render(add_expression.left.as_ref(), true),
                    render(add_expression.right.as_ref(), true)
                );
                if is_child {
                    format!("({})", source)
                } else {
                    source
                }
            }
            definy_event::event::Expression::Boolean(boolean_expression) => {
                if boolean_expression.value {
                    "True".to_string()
                } else {
                    "False".to_string()
                }
            }
            definy_event::event::Expression::If(if_expression) => {
                let source = format!(
                    "if {} {} {}",
                    render(if_expression.condition.as_ref(), true),
                    render(if_expression.then_expr.as_ref(), true),
                    render(if_expression.else_expr.as_ref(), true)
                );
                if is_child {
                    format!("({})", source)
                } else {
                    source
                }
            }
            definy_event::event::Expression::Equal(equal_expression) => {
                let source = format!(
                    "== {} {}",
                    render(equal_expression.left.as_ref(), true),
                    render(equal_expression.right.as_ref(), true)
                );
                if is_child {
                    format!("({})", source)
                } else {
                    source
                }
            }
            definy_event::event::Expression::PartReference(part_reference_expression) => {
                part_reference_expression.part_name.to_string()
            }
        }
    }

    render(expression, false)
}

#[cfg(test)]
mod tests {
    use super::{evaluate_expression, expression_to_source};

    #[test]
    fn evaluate_expression_works() {
        let expression = definy_event::event::Expression::Add(definy_event::event::AddExpression {
            left: Box::new(definy_event::event::Expression::Number(
                definy_event::event::NumberExpression { value: 1 },
            )),
            right: Box::new(definy_event::event::Expression::Add(
                definy_event::event::AddExpression {
                    left: Box::new(definy_event::event::Expression::Number(
                        definy_event::event::NumberExpression { value: 2 },
                    )),
                    right: Box::new(definy_event::event::Expression::Number(
                        definy_event::event::NumberExpression { value: 4 },
                    )),
                },
            )),
        });
        assert_eq!(
            evaluate_expression(&expression, &[]),
            Ok(crate::expression_eval::Value::Number(7))
        );
        assert_eq!(expression_to_source(&expression), "+ 1 (+ 2 4)");
    }

    #[test]
    fn nested_examples() {
        let expression1 =
            definy_event::event::Expression::Number(definy_event::event::NumberExpression {
                value: 1,
            });
        assert_eq!(
            evaluate_expression(&expression1, &[]),
            Ok(crate::expression_eval::Value::Number(1))
        );

        let expression2 =
            definy_event::event::Expression::Add(definy_event::event::AddExpression {
                left: Box::new(definy_event::event::Expression::Number(
                    definy_event::event::NumberExpression { value: 1 },
                )),
                right: Box::new(definy_event::event::Expression::Add(
                    definy_event::event::AddExpression {
                        left: Box::new(definy_event::event::Expression::Number(
                            definy_event::event::NumberExpression { value: 2 },
                        )),
                        right: Box::new(definy_event::event::Expression::Number(
                            definy_event::event::NumberExpression { value: 4 },
                        )),
                    },
                )),
            });
        assert_eq!(
            evaluate_expression(&expression2, &[]),
            Ok(crate::expression_eval::Value::Number(7))
        );

        let expression3 =
            definy_event::event::Expression::Add(definy_event::event::AddExpression {
                left: Box::new(definy_event::event::Expression::Add(
                    definy_event::event::AddExpression {
                        left: Box::new(definy_event::event::Expression::Number(
                            definy_event::event::NumberExpression { value: 321 },
                        )),
                        right: Box::new(definy_event::event::Expression::Number(
                            definy_event::event::NumberExpression { value: 1 },
                        )),
                    },
                )),
                right: Box::new(definy_event::event::Expression::Add(
                    definy_event::event::AddExpression {
                        left: Box::new(definy_event::event::Expression::Add(
                            definy_event::event::AddExpression {
                                left: Box::new(definy_event::event::Expression::Number(
                                    definy_event::event::NumberExpression { value: 1 },
                                )),
                                right: Box::new(definy_event::event::Expression::Number(
                                    definy_event::event::NumberExpression { value: 3 },
                                )),
                            },
                        )),
                        right: Box::new(definy_event::event::Expression::Number(
                            definy_event::event::NumberExpression { value: 4 },
                        )),
                    },
                )),
            });
        assert_eq!(
            evaluate_expression(&expression3, &[]),
            Ok(crate::expression_eval::Value::Number(330))
        );
    }

    #[test]
    fn source_for_simple_add() {
        let expression = definy_event::event::Expression::Add(definy_event::event::AddExpression {
            left: Box::new(definy_event::event::Expression::Number(
                definy_event::event::NumberExpression { value: 1 },
            )),
            right: Box::new(definy_event::event::Expression::Number(
                definy_event::event::NumberExpression { value: 2 },
            )),
        });
        assert_eq!(
            evaluate_expression(&expression, &[]),
            Ok(crate::expression_eval::Value::Number(3))
        );
        assert_eq!(expression_to_source(&expression), "+ 1 2");
    }

    #[test]
    fn evaluate_boolean_and_if() {
        let bool_expr =
            definy_event::event::Expression::Boolean(definy_event::event::BooleanExpression {
                value: true,
            });
        assert_eq!(
            evaluate_expression(&bool_expr, &[]),
            Ok(crate::expression_eval::Value::Bool(true))
        );
        assert_eq!(expression_to_source(&bool_expr), "True");

        let if_expr = definy_event::event::Expression::If(definy_event::event::IfExpression {
            condition: Box::new(definy_event::event::Expression::Boolean(
                definy_event::event::BooleanExpression { value: false },
            )),
            then_expr: Box::new(definy_event::event::Expression::Number(
                definy_event::event::NumberExpression { value: 10 },
            )),
            else_expr: Box::new(definy_event::event::Expression::Number(
                definy_event::event::NumberExpression { value: 20 },
            )),
        });
        assert_eq!(
            evaluate_expression(&if_expr, &[]),
            Ok(crate::expression_eval::Value::Number(20))
        );
        assert_eq!(expression_to_source(&if_expr), "if False 10 20");
    }

    #[test]
    fn evaluate_equal() {
        let equal_expr =
            definy_event::event::Expression::Equal(definy_event::event::EqualExpression {
                left: Box::new(definy_event::event::Expression::Number(
                    definy_event::event::NumberExpression { value: 5 },
                )),
                right: Box::new(definy_event::event::Expression::Number(
                    definy_event::event::NumberExpression { value: 5 },
                )),
            });
        assert_eq!(
            evaluate_expression(&equal_expr, &[]),
            Ok(crate::expression_eval::Value::Bool(true))
        );
        assert_eq!(expression_to_source(&equal_expr), "== 5 5");
    }
}
