#[derive(Debug, Clone, PartialEq)]
pub enum Value {
    Number(i64),
    String(String),
    Bool(bool),
    List(Vec<Value>),
    Record(Vec<(String, Value)>),
}

impl std::fmt::Display for Value {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Value::Number(n) => write!(f, "{}", n),
            Value::String(s) => write!(f, "\"{}\"", s),
            Value::Bool(b) => write!(f, "{}", if *b { "True" } else { "False" }),
            Value::List(items) => {
                let source = items
                    .iter()
                    .map(|item| item.to_string())
                    .collect::<Vec<String>>()
                    .join(", ");
                write!(f, "[{}]", source)
            }
            Value::Record(items) => {
                let source = items
                    .iter()
                    .map(|(key, value)| format!("{}: {}", key, value))
                    .collect::<Vec<String>>()
                    .join(", ");
                write!(f, "{{{}}}", source)
            }
        }
    }
}

pub fn evaluate_expression(
    expression: &definy_event::event::Expression,
    events: &[crate::app_state::EventWithHash],
) -> Result<Value, &'static str> {
    let wasm_bytes = crate::wasm_emitter::compile_expression_to_wasm(expression, events)
        .map_err(|_| "Failed to compile expression to WebAssembly")?;
    crate::wasm_emitter::execute_wasm(&wasm_bytes)
}

pub fn expression_to_source(expression: &definy_event::event::Expression) -> String {
    fn render(
        expression: &definy_event::event::Expression,
        is_child: bool,
        scope: &[(i64, String)],
    ) -> String {
        match expression {
            definy_event::event::Expression::Compiler(builtin) => match builtin {
                definy_event::event::CompilerBuiltin::Let => "[compiler let]".to_string(),
                definy_event::event::CompilerBuiltin::Plus => "[compiler plus]".to_string(),
                definy_event::event::CompilerBuiltin::Minus => "[compiler minus]".to_string(),
                definy_event::event::CompilerBuiltin::Multiply => "[compiler multiply]".to_string(),
                definy_event::event::CompilerBuiltin::Divide => "[compiler divide]".to_string(),
                definy_event::event::CompilerBuiltin::Remainder => {
                    "[compiler remainder]".to_string()
                }
                definy_event::event::CompilerBuiltin::LessThan => {
                    "[compiler less than]".to_string()
                }
                definy_event::event::CompilerBuiltin::LessThanOrEqual => {
                    "[compiler less than or equal]".to_string()
                }
                definy_event::event::CompilerBuiltin::GreaterThan => {
                    "[compiler greater than]".to_string()
                }
                definy_event::event::CompilerBuiltin::GreaterThanOrEqual => {
                    "[compiler greater than or equal]".to_string()
                }
                definy_event::event::CompilerBuiltin::Equal => "[compiler equal]".to_string(),
                definy_event::event::CompilerBuiltin::NotEqual => {
                    "[compiler not equal]".to_string()
                }
                definy_event::event::CompilerBuiltin::Not => "[compiler not]".to_string(),
                definy_event::event::CompilerBuiltin::And => "[compiler and]".to_string(),
                definy_event::event::CompilerBuiltin::Or => "[compiler or]".to_string(),
                definy_event::event::CompilerBuiltin::NumberLiteral => {
                    "[compiler number literal]".to_string()
                }
                definy_event::event::CompilerBuiltin::If => "[compiler if]".to_string(),
                definy_event::event::CompilerBuiltin::StringConcat => {
                    "[compiler string concat]".to_string()
                }
                definy_event::event::CompilerBuiltin::StringLength => {
                    "[compiler string length]".to_string()
                }
                definy_event::event::CompilerBuiltin::StringSlice => {
                    "[compiler string slice]".to_string()
                }
                definy_event::event::CompilerBuiltin::ListLength => {
                    "[compiler list length]".to_string()
                }
                definy_event::event::CompilerBuiltin::ListConcat => {
                    "[compiler list concat]".to_string()
                }
                definy_event::event::CompilerBuiltin::ListGet => "[compiler list get]".to_string(),
                definy_event::event::CompilerBuiltin::ListAppend => {
                    "[compiler list append]".to_string()
                }
            },
            definy_event::event::Expression::Number(number_expression) => {
                number_expression.value.to_string()
            }
            definy_event::event::Expression::String(string_expression) => {
                format!("\"{}\"", string_expression.value)
            }
            definy_event::event::Expression::TypeNumber => "Number".to_string(),
            definy_event::event::Expression::TypeString => "String".to_string(),
            definy_event::event::Expression::TypeBoolean => "Boolean".to_string(),
            definy_event::event::Expression::TypeList(type_list_expression) => {
                format!(
                    "List({})",
                    render(type_list_expression.item_type.as_ref(), false, scope)
                )
            }
            definy_event::event::Expression::ListLiteral(list_expression) => {
                let items = list_expression
                    .items
                    .iter()
                    .map(|item| render(item, false, scope))
                    .collect::<Vec<String>>()
                    .join(", ");
                format!("[{}]", items)
            }
            definy_event::event::Expression::Add(add_expression) => {
                let source = format!(
                    "+ {} {}",
                    render(add_expression.left.as_ref(), true, scope),
                    render(add_expression.right.as_ref(), true, scope)
                );
                if is_child {
                    format!("({})", source)
                } else {
                    source
                }
            }
            definy_event::event::Expression::Subtract(sub_expression) => {
                let source = format!(
                    "- {} {}",
                    render(sub_expression.left.as_ref(), true, scope),
                    render(sub_expression.right.as_ref(), true, scope)
                );
                if is_child {
                    format!("({})", source)
                } else {
                    source
                }
            }
            definy_event::event::Expression::Multiply(mul_expression) => {
                let source = format!(
                    "* {} {}",
                    render(mul_expression.left.as_ref(), true, scope),
                    render(mul_expression.right.as_ref(), true, scope)
                );
                if is_child {
                    format!("({})", source)
                } else {
                    source
                }
            }
            definy_event::event::Expression::Divide(div_expression) => {
                let source = format!(
                    "/ {} {}",
                    render(div_expression.left.as_ref(), true, scope),
                    render(div_expression.right.as_ref(), true, scope)
                );
                if is_child {
                    format!("({})", source)
                } else {
                    source
                }
            }
            definy_event::event::Expression::Remainder(rem_expression) => {
                let source = format!(
                    "% {} {}",
                    render(rem_expression.left.as_ref(), true, scope),
                    render(rem_expression.right.as_ref(), true, scope)
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
                    render(if_expression.condition.as_ref(), true, scope),
                    render(if_expression.then_expr.as_ref(), true, scope),
                    render(if_expression.else_expr.as_ref(), true, scope)
                );
                if is_child {
                    format!("({})", source)
                } else {
                    source
                }
            }
            definy_event::event::Expression::Equal(equal_expression) => {
                let source = format!(
                    "equal {} {}",
                    render(equal_expression.left.as_ref(), true, scope),
                    render(equal_expression.right.as_ref(), true, scope)
                );
                if is_child {
                    format!("({})", source)
                } else {
                    source
                }
            }
            definy_event::event::Expression::NotEqual(ne_expression) => {
                let source = format!(
                    "!= {} {}",
                    render(ne_expression.left.as_ref(), true, scope),
                    render(ne_expression.right.as_ref(), true, scope)
                );
                if is_child {
                    format!("({})", source)
                } else {
                    source
                }
            }
            definy_event::event::Expression::LessThan(lt_expression) => {
                let source = format!(
                    "< {} {}",
                    render(lt_expression.left.as_ref(), true, scope),
                    render(lt_expression.right.as_ref(), true, scope)
                );
                if is_child {
                    format!("({})", source)
                } else {
                    source
                }
            }
            definy_event::event::Expression::LessThanOrEqual(le_expression) => {
                let source = format!(
                    "<= {} {}",
                    render(le_expression.left.as_ref(), true, scope),
                    render(le_expression.right.as_ref(), true, scope)
                );
                if is_child {
                    format!("({})", source)
                } else {
                    source
                }
            }
            definy_event::event::Expression::GreaterThan(gt_expression) => {
                let source = format!(
                    "> {} {}",
                    render(gt_expression.left.as_ref(), true, scope),
                    render(gt_expression.right.as_ref(), true, scope)
                );
                if is_child {
                    format!("({})", source)
                } else {
                    source
                }
            }
            definy_event::event::Expression::GreaterThanOrEqual(ge_expression) => {
                let source = format!(
                    ">= {} {}",
                    render(ge_expression.left.as_ref(), true, scope),
                    render(ge_expression.right.as_ref(), true, scope)
                );
                if is_child {
                    format!("({})", source)
                } else {
                    source
                }
            }
            definy_event::event::Expression::Not(not_expression) => {
                let source = format!("not {}", render(not_expression.value.as_ref(), true, scope));
                if is_child {
                    format!("({})", source)
                } else {
                    source
                }
            }
            definy_event::event::Expression::And(and_expression) => {
                let source = format!(
                    "and {} {}",
                    render(and_expression.left.as_ref(), true, scope),
                    render(and_expression.right.as_ref(), true, scope)
                );
                if is_child {
                    format!("({})", source)
                } else {
                    source
                }
            }
            definy_event::event::Expression::Or(or_expression) => {
                let source = format!(
                    "or {} {}",
                    render(or_expression.left.as_ref(), true, scope),
                    render(or_expression.right.as_ref(), true, scope)
                );
                if is_child {
                    format!("({})", source)
                } else {
                    source
                }
            }
            definy_event::event::Expression::StringConcat(concat_expr) => {
                let source = format!(
                    "string_concat {} {}",
                    render(concat_expr.left.as_ref(), true, scope),
                    render(concat_expr.right.as_ref(), true, scope)
                );
                if is_child {
                    format!("({})", source)
                } else {
                    source
                }
            }
            definy_event::event::Expression::StringLength(len_expr) => {
                let source = format!(
                    "string_length {}",
                    render(len_expr.value.as_ref(), true, scope)
                );
                if is_child {
                    format!("({})", source)
                } else {
                    source
                }
            }
            definy_event::event::Expression::StringSlice(slice_expr) => {
                let source = format!(
                    "string_slice {} {} {}",
                    render(slice_expr.value.as_ref(), true, scope),
                    render(slice_expr.start.as_ref(), true, scope),
                    render(slice_expr.end.as_ref(), true, scope)
                );
                if is_child {
                    format!("({})", source)
                } else {
                    source
                }
            }
            definy_event::event::Expression::ListLength(len_expr) => {
                let source = format!(
                    "list_length {}",
                    render(len_expr.value.as_ref(), true, scope)
                );
                if is_child {
                    format!("({})", source)
                } else {
                    source
                }
            }
            definy_event::event::Expression::ListConcat(concat_expr) => {
                let source = format!(
                    "list_concat {} {}",
                    render(concat_expr.left.as_ref(), true, scope),
                    render(concat_expr.right.as_ref(), true, scope)
                );
                if is_child {
                    format!("({})", source)
                } else {
                    source
                }
            }
            definy_event::event::Expression::ListGet(get_expr) => {
                let source = format!(
                    "list_get {} {}",
                    render(get_expr.list.as_ref(), true, scope),
                    render(get_expr.index.as_ref(), true, scope)
                );
                if is_child {
                    format!("({})", source)
                } else {
                    source
                }
            }
            definy_event::event::Expression::ListAppend(append_expr) => {
                let source = format!(
                    "list_append {} {}",
                    render(append_expr.list.as_ref(), true, scope),
                    render(append_expr.item.as_ref(), true, scope)
                );
                if is_child {
                    format!("({})", source)
                } else {
                    source
                }
            }
            definy_event::event::Expression::PartReference(part_reference_expression) => {
                part_reference_expression
                    .part_definition_event_hash
                    .to_string()
            }
            definy_event::event::Expression::Let(let_expression) => {
                let mut body_scope = scope.to_vec();
                body_scope.push((
                    let_expression.variable_id,
                    let_expression.variable_name.to_string(),
                ));
                let source = format!(
                    "let {} = {} in {}",
                    let_expression.variable_name,
                    render(let_expression.value.as_ref(), false, scope),
                    render(let_expression.body.as_ref(), false, &body_scope)
                );
                if is_child {
                    format!("({})", source)
                } else {
                    source
                }
            }
            definy_event::event::Expression::Variable(variable_expression) => scope
                .iter()
                .rev()
                .find_map(|(id, name)| {
                    if *id == variable_expression.variable_id {
                        Some(name.clone())
                    } else {
                        None
                    }
                })
                .unwrap_or_else(|| format!("#{}", variable_expression.variable_id)),
            definy_event::event::Expression::TypeLiteral(record_expression) => {
                let items = record_expression
                    .items
                    .iter()
                    .map(|item| {
                        format!(
                            "{}: {}",
                            item.key,
                            render(item.value.as_ref(), false, scope)
                        )
                    })
                    .collect::<Vec<String>>()
                    .join(", ");
                format!("{{{}}}", items)
            }
            definy_event::event::Expression::Constructor(constructor_expression) => {
                let source = format!(
                    "constructor {} {}",
                    constructor_expression.type_part_definition_event_hash,
                    render(constructor_expression.value.as_ref(), true, scope)
                );
                if is_child {
                    format!("({})", source)
                } else {
                    source
                }
            }
        }
    }

    render(expression, false, &[])
}

#[cfg(test)]
mod tests {
    use std::str::FromStr;

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
            definy_event::event::Expression::Subtract(definy_event::event::SubtractExpression {
                left: Box::new(definy_event::event::Expression::Number(
                    definy_event::event::NumberExpression { value: 10 },
                )),
                right: Box::new(definy_event::event::Expression::Number(
                    definy_event::event::NumberExpression { value: 3 },
                )),
            });
        assert_eq!(
            evaluate_expression(&expression2, &[]),
            Ok(crate::expression_eval::Value::Number(7))
        );
        assert_eq!(expression_to_source(&expression2), "- 10 3");

        let expression3 =
            definy_event::event::Expression::Multiply(definy_event::event::MultiplyExpression {
                left: Box::new(definy_event::event::Expression::Number(
                    definy_event::event::NumberExpression { value: 6 },
                )),
                right: Box::new(definy_event::event::Expression::Number(
                    definy_event::event::NumberExpression { value: 7 },
                )),
            });
        assert_eq!(
            evaluate_expression(&expression3, &[]),
            Ok(crate::expression_eval::Value::Number(42))
        );
        assert_eq!(expression_to_source(&expression3), "* 6 7");
    }

    #[test]
    fn evaluate_division_and_remainder() {
        let div_expr =
            definy_event::event::Expression::Divide(definy_event::event::DivideExpression {
                left: Box::new(definy_event::event::Expression::Number(
                    definy_event::event::NumberExpression { value: 20 },
                )),
                right: Box::new(definy_event::event::Expression::Number(
                    definy_event::event::NumberExpression { value: 4 },
                )),
            });
        assert_eq!(
            evaluate_expression(&div_expr, &[]),
            Ok(crate::expression_eval::Value::Number(5))
        );
        assert_eq!(expression_to_source(&div_expr), "/ 20 4");

        let rem_expr =
            definy_event::event::Expression::Remainder(definy_event::event::RemainderExpression {
                left: Box::new(definy_event::event::Expression::Number(
                    definy_event::event::NumberExpression { value: 17 },
                )),
                right: Box::new(definy_event::event::Expression::Number(
                    definy_event::event::NumberExpression { value: 5 },
                )),
            });
        assert_eq!(
            evaluate_expression(&rem_expr, &[]),
            Ok(crate::expression_eval::Value::Number(2))
        );
        assert_eq!(expression_to_source(&rem_expr), "% 17 5");
    }

    #[test]
    fn evaluate_comparisons() {
        let lt_expr =
            definy_event::event::Expression::LessThan(definy_event::event::LessThanExpression {
                left: Box::new(definy_event::event::Expression::Number(
                    definy_event::event::NumberExpression { value: 3 },
                )),
                right: Box::new(definy_event::event::Expression::Number(
                    definy_event::event::NumberExpression { value: 5 },
                )),
            });
        assert_eq!(
            evaluate_expression(&lt_expr, &[]),
            Ok(crate::expression_eval::Value::Bool(true))
        );
        assert_eq!(expression_to_source(&lt_expr), "< 3 5");

        let ge_expr = definy_event::event::Expression::GreaterThanOrEqual(
            definy_event::event::GreaterThanOrEqualExpression {
                left: Box::new(definy_event::event::Expression::Number(
                    definy_event::event::NumberExpression { value: 5 },
                )),
                right: Box::new(definy_event::event::Expression::Number(
                    definy_event::event::NumberExpression { value: 5 },
                )),
            },
        );
        assert_eq!(
            evaluate_expression(&ge_expr, &[]),
            Ok(crate::expression_eval::Value::Bool(true))
        );
        assert_eq!(expression_to_source(&ge_expr), ">= 5 5");

        let ne_expr =
            definy_event::event::Expression::NotEqual(definy_event::event::NotEqualExpression {
                left: Box::new(definy_event::event::Expression::Number(
                    definy_event::event::NumberExpression { value: 3 },
                )),
                right: Box::new(definy_event::event::Expression::Number(
                    definy_event::event::NumberExpression { value: 5 },
                )),
            });
        assert_eq!(
            evaluate_expression(&ne_expr, &[]),
            Ok(crate::expression_eval::Value::Bool(true))
        );
        assert_eq!(expression_to_source(&ne_expr), "!= 3 5");
    }

    #[test]
    fn evaluate_boolean_logic() {
        let not_expr = definy_event::event::Expression::Not(definy_event::event::NotExpression {
            value: Box::new(definy_event::event::Expression::Boolean(
                definy_event::event::BooleanExpression { value: false },
            )),
        });
        assert_eq!(
            evaluate_expression(&not_expr, &[]),
            Ok(crate::expression_eval::Value::Bool(true))
        );
        assert_eq!(expression_to_source(&not_expr), "not False");

        let and_expr = definy_event::event::Expression::And(definy_event::event::AndExpression {
            left: Box::new(definy_event::event::Expression::Boolean(
                definy_event::event::BooleanExpression { value: true },
            )),
            right: Box::new(definy_event::event::Expression::Boolean(
                definy_event::event::BooleanExpression { value: false },
            )),
        });
        assert_eq!(
            evaluate_expression(&and_expr, &[]),
            Ok(crate::expression_eval::Value::Bool(false))
        );
        assert_eq!(expression_to_source(&and_expr), "and True False");

        let or_expr = definy_event::event::Expression::Or(definy_event::event::OrExpression {
            left: Box::new(definy_event::event::Expression::Boolean(
                definy_event::event::BooleanExpression { value: true },
            )),
            right: Box::new(definy_event::event::Expression::Boolean(
                definy_event::event::BooleanExpression { value: false },
            )),
        });
        assert_eq!(
            evaluate_expression(&or_expr, &[]),
            Ok(crate::expression_eval::Value::Bool(true))
        );
        assert_eq!(expression_to_source(&or_expr), "or True False");
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
    fn evaluate_string_literal() {
        let string_expr =
            definy_event::event::Expression::String(definy_event::event::StringExpression {
                value: "hello".into(),
            });
        assert_eq!(
            evaluate_expression(&string_expr, &[]),
            Ok(crate::expression_eval::Value::String("hello".to_string()))
        );
        assert_eq!(expression_to_source(&string_expr), "\"hello\"");
    }

    #[test]
    fn evaluate_list_literal() {
        let list_expr = definy_event::event::Expression::ListLiteral(
            definy_event::event::ListLiteralExpression {
                items: vec![
                    definy_event::event::Expression::Number(
                        definy_event::event::NumberExpression { value: 1 },
                    ),
                    definy_event::event::Expression::Number(
                        definy_event::event::NumberExpression { value: 2 },
                    ),
                ],
            },
        );
        assert_eq!(
            evaluate_expression(&list_expr, &[]),
            Ok(crate::expression_eval::Value::List(vec![
                crate::expression_eval::Value::Number(1),
                crate::expression_eval::Value::Number(2),
            ]))
        );
        assert_eq!(expression_to_source(&list_expr), "[1, 2]");
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
        assert_eq!(expression_to_source(&equal_expr), "equal 5 5");
    }

    #[test]
    fn evaluate_record_literal() {
        let record_expr = definy_event::event::Expression::TypeLiteral(
            definy_event::event::TypeLiteralExpression {
                items: vec![
                    definy_event::event::TypeLiteralItemExpression {
                        key: "name".into(),
                        value: Box::new(definy_event::event::Expression::String(
                            definy_event::event::StringExpression {
                                value: "narumi".into(),
                            },
                        )),
                    },
                    definy_event::event::TypeLiteralItemExpression {
                        key: "age".into(),
                        value: Box::new(definy_event::event::Expression::Number(
                            definy_event::event::NumberExpression { value: 3 },
                        )),
                    },
                ],
            },
        );
        assert_eq!(
            evaluate_expression(&record_expr, &[]),
            Ok(crate::expression_eval::Value::Record(vec![
                (
                    "name".to_string(),
                    crate::expression_eval::Value::String("narumi".to_string())
                ),
                ("age".to_string(), crate::expression_eval::Value::Number(3)),
            ]))
        );
        assert_eq!(
            expression_to_source(&record_expr),
            "{name: \"narumi\", age: 3}"
        );
    }

    #[test]
    fn evaluate_let_bindings() {
        // let x = 10 in (let y = 20 in x + y)
        let let_expr = definy_event::event::Expression::Let(definy_event::event::LetExpression {
            variable_id: 1,
            variable_name: "x".into(),
            value: Box::new(definy_event::event::Expression::Number(
                definy_event::event::NumberExpression { value: 10 },
            )),
            body: Box::new(definy_event::event::Expression::Let(
                definy_event::event::LetExpression {
                    variable_id: 2,
                    variable_name: "y".into(),
                    value: Box::new(definy_event::event::Expression::Number(
                        definy_event::event::NumberExpression { value: 20 },
                    )),
                    body: Box::new(definy_event::event::Expression::Add(
                        definy_event::event::AddExpression {
                            left: Box::new(definy_event::event::Expression::Variable(
                                definy_event::event::VariableExpression { variable_id: 1 },
                            )),
                            right: Box::new(definy_event::event::Expression::Variable(
                                definy_event::event::VariableExpression { variable_id: 2 },
                            )),
                        },
                    )),
                },
            )),
        });

        assert_eq!(
            evaluate_expression(&let_expr, &[]),
            Ok(crate::expression_eval::Value::Number(30))
        );
    }

    #[test]
    fn evaluate_part_reference_by_definition_hash() {
        let definition_hash =
            definy_event::EventHashId::from_str("AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA")
                .unwrap();
        let part_expression =
            definy_event::event::Expression::Number(definy_event::event::NumberExpression {
                value: 99,
            });
        let events = vec![(
            definition_hash.clone(),
            Ok((
                ed25519_dalek::Signature::from_bytes(&[0u8; 64]),
                definy_event::event::Event {
                    account_id: definy_event::event::AccountId::from_str(
                        "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
                    )
                    .unwrap(),
                    time: chrono::DateTime::UNIX_EPOCH,
                    content: definy_event::event::EventContent::PartDefinition(
                        definy_event::event::PartDefinitionEvent {
                            part_name: "legacy-name".into(),
                            part_type: Some(definy_event::event::PartType::Number),
                            description: "".into(),
                            expression: Some(part_expression),
                            module_definition_event_hash: definition_hash.clone(),
                        },
                    ),
                },
            )),
        )];

        let reference = definy_event::event::Expression::PartReference(
            definy_event::event::PartReferenceExpression {
                part_definition_event_hash: definition_hash.clone(),
            },
        );

        assert_eq!(
            evaluate_expression(&reference, &events),
            Ok(crate::expression_eval::Value::Number(99))
        );
        assert_eq!(
            expression_to_source(&reference),
            definition_hash.to_string()
        );
    }

    #[test]
    fn test_compiler_builtins() {
        use definy_event::event::{CompilerBuiltin, Expression};

        let let_expr = Expression::Compiler(CompilerBuiltin::Let);
        assert_eq!(expression_to_source(&let_expr), "[compiler let]");
        assert!(evaluate_expression(&let_expr, &[]).is_err());

        let plus_expr = Expression::Compiler(CompilerBuiltin::Plus);
        assert_eq!(expression_to_source(&plus_expr), "[compiler plus]");
        assert!(evaluate_expression(&plus_expr, &[]).is_err());

        let minus_expr = Expression::Compiler(CompilerBuiltin::Minus);
        assert_eq!(expression_to_source(&minus_expr), "[compiler minus]");
        assert!(evaluate_expression(&minus_expr, &[]).is_err());

        let num_expr = Expression::Compiler(CompilerBuiltin::NumberLiteral);
        assert_eq!(expression_to_source(&num_expr), "[compiler number literal]");
        assert!(evaluate_expression(&num_expr, &[]).is_err());

        let if_expr = Expression::Compiler(CompilerBuiltin::If);
        assert_eq!(expression_to_source(&if_expr), "[compiler if]");
        assert!(evaluate_expression(&if_expr, &[]).is_err());

        let equal_expr = Expression::Compiler(CompilerBuiltin::Equal);
        assert_eq!(expression_to_source(&equal_expr), "[compiler equal]");
        assert!(evaluate_expression(&equal_expr, &[]).is_err());

        let str_concat = Expression::Compiler(CompilerBuiltin::StringConcat);
        assert_eq!(
            expression_to_source(&str_concat),
            "[compiler string concat]"
        );
        assert!(evaluate_expression(&str_concat, &[]).is_err());

        let list_get = Expression::Compiler(CompilerBuiltin::ListGet);
        assert_eq!(expression_to_source(&list_get), "[compiler list get]");
        assert!(evaluate_expression(&list_get, &[]).is_err());
    }

    #[test]
    fn test_string_and_list_evaluation() {
        use definy_event::event::*;

        // string concat
        let concat = Expression::StringConcat(StringConcatExpression {
            left: Box::new(Expression::String(StringExpression {
                value: "foo".into(),
            })),
            right: Box::new(Expression::String(StringExpression {
                value: "bar".into(),
            })),
        });
        assert_eq!(
            evaluate_expression(&concat, &[]).unwrap(),
            crate::expression_eval::Value::String("foobar".to_string())
        );
        assert_eq!(
            expression_to_source(&concat),
            "string_concat \"foo\" \"bar\""
        );

        // string length
        let len = Expression::StringLength(StringLengthExpression {
            value: Box::new(Expression::String(StringExpression {
                value: "hello".into(),
            })),
        });
        assert_eq!(
            evaluate_expression(&len, &[]).unwrap(),
            crate::expression_eval::Value::Number(5)
        );

        // string slice
        let slice = Expression::StringSlice(StringSliceExpression {
            value: Box::new(Expression::String(StringExpression {
                value: "abcdef".into(),
            })),
            start: Box::new(Expression::Number(NumberExpression { value: 2 })),
            end: Box::new(Expression::Number(NumberExpression { value: 5 })),
        });
        assert_eq!(
            evaluate_expression(&slice, &[]).unwrap(),
            crate::expression_eval::Value::String("cde".to_string())
        );

        // list operations
        let list_lit = Expression::ListLiteral(ListLiteralExpression {
            items: vec![
                Expression::Number(NumberExpression { value: 100 }),
                Expression::Number(NumberExpression { value: 200 }),
            ],
        });
        let list_len = Expression::ListLength(ListLengthExpression {
            value: Box::new(list_lit.clone()),
        });
        assert_eq!(
            evaluate_expression(&list_len, &[]).unwrap(),
            crate::expression_eval::Value::Number(2)
        );

        let list_get = Expression::ListGet(ListGetExpression {
            list: Box::new(list_lit.clone()),
            index: Box::new(Expression::Number(NumberExpression { value: 1 })),
        });
        assert_eq!(
            evaluate_expression(&list_get, &[]).unwrap(),
            crate::expression_eval::Value::Number(200)
        );

        let list_append = Expression::ListAppend(ListAppendExpression {
            list: Box::new(list_lit.clone()),
            item: Box::new(Expression::Number(NumberExpression { value: 300 })),
        });
        assert_eq!(
            evaluate_expression(&list_append, &[]).unwrap(),
            crate::expression_eval::Value::List(vec![
                crate::expression_eval::Value::Number(100),
                crate::expression_eval::Value::Number(200),
                crate::expression_eval::Value::Number(300),
            ])
        );
    }
}
