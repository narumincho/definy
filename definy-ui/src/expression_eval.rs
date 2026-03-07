#[derive(Debug, Clone, PartialEq)]
pub enum Value {
    Number(i64),
    String(String),
    Bool(bool),
    Record(Vec<(String, Value)>),
}

impl std::fmt::Display for Value {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Value::Number(n) => write!(f, "{}", n),
            Value::String(s) => write!(f, "\"{}\"", s),
            Value::Bool(b) => write!(f, "{}", if *b { "True" } else { "False" }),
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
    events: &[(
        [u8; 32],
        Result<
            (ed25519_dalek::Signature, definy_event::event::Event),
            definy_event::VerifyAndDeserializeError,
        >,
    )],
) -> Result<Value, &'static str> {
    // Try to evaluate purely via WebAssembly first!
    if let Some(result) = evaluate_via_wasm(expression) {
        return result;
    }

    let env = std::collections::HashMap::new();
    evaluate_expression_with_depth(expression, events, &env, 0)
}

fn evaluate_via_wasm(
    #[allow(unused_variables)] expression: &definy_event::event::Expression,
) -> Option<Result<Value, &'static str>> {
    #[cfg(target_arch = "wasm32")]
    {
        // For expressions containing PartReferences, fallback to Rust for now since
        // the Wasm emitter doesn't yet resolve them from the `events` store.
        if has_part_references(expression) {
            return None;
        }

        let wasm_bytes = crate::wasm_emitter::compile_expression_to_wasm(expression).ok()?;

        let uint8_array = js_sys::Uint8Array::from(wasm_bytes.as_slice());
        let module_result = js_sys::WebAssembly::Module::new(&uint8_array);
        let module = match module_result {
            Ok(m) => m,
            Err(_) => {
                web_sys::console::warn_1(&wasm_bindgen::JsValue::from_str(
                    "Wasm compilation failed",
                ));
                return None;
            }
        };

        let imports = js_sys::Object::new();
        let instance_result = js_sys::WebAssembly::Instance::new(&module, &imports);
        let instance = match instance_result {
            Ok(i) => i,
            Err(_) => return None,
        };

        let exports = instance.exports();
        let evaluate_func =
            js_sys::Reflect::get(&exports, &wasm_bindgen::JsValue::from_str("evaluate")).ok()?;

        if evaluate_func.is_function() {
            let func_obj: &js_sys::Function = wasm_bindgen::JsCast::unchecked_ref(&evaluate_func);
            let call_result = func_obj.call0(&wasm_bindgen::JsValue::NULL);

            match call_result {
                Ok(val) => {
                    if let Some(num) = val.as_f64() {
                        let i64_val = num as i64;
                        // Determine if we should treat it as bool or number based on expression type
                        if is_boolean_expression(expression) {
                            return Some(Ok(Value::Bool(i64_val != 0)));
                        } else {
                            return Some(Ok(Value::Number(i64_val)));
                        }
                    }
                }
                Err(e) => {
                    web_sys::console::error_1(&e);
                    return Some(Err("Exception executing Wasm"));
                }
            }
        }
    }

    None
}

#[allow(dead_code)]
fn has_part_references(expr: &definy_event::event::Expression) -> bool {
    match expr {
        definy_event::event::Expression::PartReference(_) => true,
        definy_event::event::Expression::Add(a) => {
            has_part_references(&a.left) || has_part_references(&a.right)
        }
        definy_event::event::Expression::If(i) => {
            has_part_references(&i.condition)
                || has_part_references(&i.then_expr)
                || has_part_references(&i.else_expr)
        }
        definy_event::event::Expression::Equal(e) => {
            has_part_references(&e.left) || has_part_references(&e.right)
        }
        definy_event::event::Expression::Let(l) => {
            has_part_references(&l.value) || has_part_references(&l.body)
        }
        definy_event::event::Expression::RecordLiteral(record_expression) => record_expression
            .items
            .iter()
            .any(|item| has_part_references(item.value.as_ref())),
        definy_event::event::Expression::Variable(_) => false,
        definy_event::event::Expression::String(_) => false,
        _ => false,
    }
}

#[allow(dead_code)]
fn is_boolean_expression(expr: &definy_event::event::Expression) -> bool {
    match expr {
        definy_event::event::Expression::Boolean(_) | definy_event::event::Expression::Equal(_) => {
            true
        }
        definy_event::event::Expression::If(i) => {
            is_boolean_expression(&i.then_expr) && is_boolean_expression(&i.else_expr)
        }
        definy_event::event::Expression::Let(l) => is_boolean_expression(&l.body),
        definy_event::event::Expression::RecordLiteral(_) => false,
        definy_event::event::Expression::Variable(_) => false,
        definy_event::event::Expression::String(_) => false,
        _ => false,
    }
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
    env: &std::collections::HashMap<i64, Value>,
    depth: usize,
) -> Result<Value, &'static str> {
    if depth > 100 {
        return Err("Maximum evaluation depth exceeded (possible circular reference)");
    }
    match expression {
        definy_event::event::Expression::Number(number_expression) => {
            Ok(Value::Number(number_expression.value))
        }
        definy_event::event::Expression::String(string_expression) => {
            Ok(Value::String(string_expression.value.to_string()))
        }
        definy_event::event::Expression::Add(add_expression) => {
            let left = evaluate_expression_with_depth(
                add_expression.left.as_ref(),
                events,
                env,
                depth + 1,
            )?;
            let right = evaluate_expression_with_depth(
                add_expression.right.as_ref(),
                events,
                env,
                depth + 1,
            )?;
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
                env,
                depth + 1,
            )?;
            match condition {
                Value::Bool(b) => {
                    if b {
                        evaluate_expression_with_depth(
                            if_expression.then_expr.as_ref(),
                            events,
                            env,
                            depth + 1,
                        )
                    } else {
                        evaluate_expression_with_depth(
                            if_expression.else_expr.as_ref(),
                            events,
                            env,
                            depth + 1,
                        )
                    }
                }
                _ => Err("condition of an if expression must evaluate to a boolean"),
            }
        }
        definy_event::event::Expression::Equal(equal_expression) => {
            let left = evaluate_expression_with_depth(
                equal_expression.left.as_ref(),
                events,
                env,
                depth + 1,
            )?;
            let right = evaluate_expression_with_depth(
                equal_expression.right.as_ref(),
                events,
                env,
                depth + 1,
            )?;
            Ok(Value::Bool(left == right))
        }
        definy_event::event::Expression::Let(let_expr) => {
            let value =
                evaluate_expression_with_depth(let_expr.value.as_ref(), events, env, depth + 1)?;
            let mut new_env = env.clone();
            new_env.insert(let_expr.variable_id, value);
            evaluate_expression_with_depth(let_expr.body.as_ref(), events, &new_env, depth + 1)
        }
        definy_event::event::Expression::Variable(var_expr) => env
            .get(&var_expr.variable_id)
            .cloned()
            .ok_or("undefined variable"),
        definy_event::event::Expression::PartReference(part_reference_expression) => {
            let mut latest_expression = None;
            for (event_hash, event_result) in events.iter().rev() {
                if let Ok((_, event)) = event_result {
                    match &event.content {
                        definy_event::event::EventContent::PartDefinition(part_definition) => {
                            if part_reference_expression.part_definition_event_hash == *event_hash {
                                latest_expression = Some(&part_definition.expression);
                                break;
                            }
                        }
                        definy_event::event::EventContent::PartUpdate(part_update) => {
                            if part_update.part_definition_event_hash
                                == part_reference_expression.part_definition_event_hash
                            {
                                latest_expression = Some(&part_update.expression);
                                break;
                            }
                        }
                        _ => {}
                    }
                }
            }
            if let Some(expr) = latest_expression {
                let empty_env = std::collections::HashMap::new();
                evaluate_expression_with_depth(expr, events, &empty_env, depth + 1)
            } else {
                Err("Part not found")
            }
        }
        definy_event::event::Expression::RecordLiteral(record_expression) => {
            let mut items = Vec::with_capacity(record_expression.items.len());
            for item in &record_expression.items {
                let value =
                    evaluate_expression_with_depth(item.value.as_ref(), events, env, depth + 1)?;
                items.push((item.key.to_string(), value));
            }
            Ok(Value::Record(items))
        }
    }
}

pub fn expression_to_source(expression: &definy_event::event::Expression) -> String {
    fn render(
        expression: &definy_event::event::Expression,
        is_child: bool,
        scope: &[(i64, String)],
    ) -> String {
        match expression {
            definy_event::event::Expression::Number(number_expression) => {
                number_expression.value.to_string()
            }
            definy_event::event::Expression::String(string_expression) => {
                format!("\"{}\"", string_expression.value)
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
                    "== {} {}",
                    render(equal_expression.left.as_ref(), true, scope),
                    render(equal_expression.right.as_ref(), true, scope)
                );
                if is_child {
                    format!("({})", source)
                } else {
                    source
                }
            }
            definy_event::event::Expression::PartReference(part_reference_expression) => {
                crate::hash_format::encode_hash32(&part_reference_expression.part_definition_event_hash)
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
            definy_event::event::Expression::Variable(variable_expression) => {
                scope
                    .iter()
                    .rev()
                    .find_map(|(id, name)| {
                        if *id == variable_expression.variable_id {
                            Some(name.clone())
                        } else {
                            None
                        }
                    })
                    .unwrap_or_else(|| format!("#{}", variable_expression.variable_id))
            }
            definy_event::event::Expression::RecordLiteral(record_expression) => {
                let items = record_expression
                    .items
                    .iter()
                    .map(|item| format!("{}: {}", item.key, render(item.value.as_ref(), false, scope)))
                    .collect::<Vec<String>>()
                    .join(", ");
                format!("{{{}}}", items)
            }
        }
    }

    render(expression, false, &[])
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

    #[test]
    fn evaluate_record_literal() {
        let record_expr = definy_event::event::Expression::RecordLiteral(
            definy_event::event::RecordLiteralExpression {
                items: vec![
                    definy_event::event::RecordItemExpression {
                        key: "name".into(),
                        value: Box::new(definy_event::event::Expression::String(
                            definy_event::event::StringExpression {
                                value: "narumi".into(),
                            },
                        )),
                    },
                    definy_event::event::RecordItemExpression {
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
                ("name".to_string(), crate::expression_eval::Value::String("narumi".to_string())),
                ("age".to_string(), crate::expression_eval::Value::Number(3)),
            ]))
        );
        assert_eq!(expression_to_source(&record_expr), "{name: \"narumi\", age: 3}");
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
                                definy_event::event::VariableExpression {
                                    variable_id: 1,
                                },
                            )),
                            right: Box::new(definy_event::event::Expression::Variable(
                                definy_event::event::VariableExpression {
                                    variable_id: 2,
                                },
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
        let definition_hash = [42u8; 32];
        let part_expression =
            definy_event::event::Expression::Number(definy_event::event::NumberExpression {
                value: 99,
            });
        let events = vec![(
            definition_hash,
            Ok((
                ed25519_dalek::Signature::from_bytes(&[0u8; 64]),
                definy_event::event::Event {
                    account_id: definy_event::event::AccountId(Box::new([1u8; 32])),
                    time: chrono::DateTime::UNIX_EPOCH,
                    content: definy_event::event::EventContent::PartDefinition(
                        definy_event::event::PartDefinitionEvent {
                            part_name: "legacy-name".into(),
                            part_type: definy_event::event::PartType::Number,
                            description: "".into(),
                            expression: part_expression,
                        },
                    ),
                },
            )),
        )];

        let reference = definy_event::event::Expression::PartReference(
            definy_event::event::PartReferenceExpression {
                part_definition_event_hash: definition_hash,
            },
        );

        assert_eq!(
            evaluate_expression(&reference, &events),
            Ok(crate::expression_eval::Value::Number(99))
        );
        assert_eq!(
            expression_to_source(&reference),
            crate::hash_format::encode_hash32(&definition_hash)
        );
    }
}
