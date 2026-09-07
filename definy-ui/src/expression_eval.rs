#[derive(Debug, Clone, PartialEq)]
pub enum Value {
    Number(i64),
    String(String),
    Bool(bool),
    List(Vec<Value>),
    Record(Vec<(String, Value)>),
    Function,
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
            Value::Function => write!(f, "<function>"),
        }
    }
}

pub fn evaluate_expression(
    expression: &definy_event::event::Expression,
    events: &[crate::app_state::EventWithHash],
) -> Result<Value, String> {
    let wasm_bytes = crate::wasm_emitter::compile_expression_to_wasm(expression, events)
        .map_err(|e| format!("Failed to compile expression to WebAssembly: {}", e))?;
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
                definy_event::event::CompilerBuiltin::Function => "[compiler function]".to_string(),
                definy_event::event::CompilerBuiltin::Call => "[compiler call]".to_string(),
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
            definy_event::event::Expression::Function(func_expression) => {
                let mut body_scope = scope.to_vec();
                body_scope.push((
                    func_expression.parameter_id,
                    func_expression.parameter_name.to_string(),
                ));
                let source = format!(
                    "fn {} -> {}",
                    func_expression.parameter_name,
                    render(func_expression.body.as_ref(), false, &body_scope)
                );
                if is_child {
                    format!("({})", source)
                } else {
                    source
                }
            }
            definy_event::event::Expression::Call(call_expression) => {
                let source = format!(
                    "{} {}",
                    render(call_expression.function.as_ref(), true, scope),
                    render(call_expression.argument.as_ref(), true, scope)
                );
                if is_child {
                    format!("({})", source)
                } else {
                    source
                }
            }
            definy_event::event::Expression::TypeFunction(type_func_expression) => {
                let source = format!(
                    "{} -> {}",
                    render(type_func_expression.parameter.as_ref(), true, scope),
                    render(type_func_expression.return_type.as_ref(), false, scope)
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
#[path = "expression_eval_tests.rs"]
mod tests;
