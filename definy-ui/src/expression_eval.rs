pub fn evaluate_expression(
    expression: &definy_event::event::Expression,
    events: &[(
        [u8; 32],
        Result<
            (ed25519_dalek::Signature, definy_event::event::Event),
            definy_event::VerifyAndDeserializeError,
        >,
    )],
) -> Result<i64, &'static str> {
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
) -> Result<i64, &'static str> {
    if depth > 100 {
        return Err("Maximum evaluation depth exceeded (possible circular reference)");
    }
    match expression {
        definy_event::event::Expression::Number(number_expression) => Ok(number_expression.value),
        definy_event::event::Expression::Add(add_expression) => {
            let left =
                evaluate_expression_with_depth(add_expression.left.as_ref(), events, depth + 1)?;
            let right =
                evaluate_expression_with_depth(add_expression.right.as_ref(), events, depth + 1)?;
            left.checked_add(right)
                .ok_or("overflow while adding two numbers")
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
        assert_eq!(evaluate_expression(&expression, &[]), Ok(7));
        assert_eq!(expression_to_source(&expression), "+ 1 (+ 2 4)");
    }

    #[test]
    fn nested_examples() {
        let expression1 =
            definy_event::event::Expression::Number(definy_event::event::NumberExpression {
                value: 1,
            });
        assert_eq!(evaluate_expression(&expression1, &[]), Ok(1));

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
        assert_eq!(evaluate_expression(&expression2, &[]), Ok(7));

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
        assert_eq!(evaluate_expression(&expression3, &[]), Ok(330));
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
        assert_eq!(evaluate_expression(&expression, &[]), Ok(3));
        assert_eq!(expression_to_source(&expression), "+ 1 2");
    }
}
