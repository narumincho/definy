use std::str::FromStr;

use definy_event::EventHashId;

use crate::app_state::{AppState, PathStep};

use super::get_mut_expression_at_path;
use super::variables::next_local_variable_id;

use definy_event::event::*;

fn num(value: i64) -> Box<Expression> {
    Box::new(Expression::Number(NumberExpression { value }))
}

fn bool_expr(value: bool) -> Box<Expression> {
    Box::new(Expression::Boolean(BooleanExpression { value }))
}

fn str_expr(value: &str) -> Box<Expression> {
    Box::new(Expression::String(StringExpression {
        value: value.into(),
    }))
}

fn empty_list() -> Box<Expression> {
    Box::new(Expression::ListLiteral(ListLiteralExpression {
        items: Vec::new(),
    }))
}

fn var_expr(variable_id: i64) -> Box<Expression> {
    Box::new(Expression::Variable(VariableExpression { variable_id }))
}

pub(crate) fn default_expression_for_compiler_builtin(
    builtin: CompilerBuiltin,
    next_variable_id: i64,
) -> Expression {
    match builtin {
        CompilerBuiltin::Plus => Expression::Add(AddExpression {
            left: num(0),
            right: num(0),
        }),
        CompilerBuiltin::Minus => Expression::Subtract(SubtractExpression {
            left: num(0),
            right: num(0),
        }),
        CompilerBuiltin::Multiply => Expression::Multiply(MultiplyExpression {
            left: num(0),
            right: num(0),
        }),
        CompilerBuiltin::Divide => Expression::Divide(DivideExpression {
            left: num(0),
            right: num(1),
        }),
        CompilerBuiltin::Remainder => Expression::Remainder(RemainderExpression {
            left: num(0),
            right: num(1),
        }),
        CompilerBuiltin::Equal => Expression::Equal(EqualExpression {
            left: num(0),
            right: num(0),
        }),
        CompilerBuiltin::NotEqual => Expression::NotEqual(NotEqualExpression {
            left: num(0),
            right: num(0),
        }),
        CompilerBuiltin::LessThan => Expression::LessThan(LessThanExpression {
            left: num(0),
            right: num(0),
        }),
        CompilerBuiltin::LessThanOrEqual => {
            Expression::LessThanOrEqual(LessThanOrEqualExpression {
                left: num(0),
                right: num(0),
            })
        }
        CompilerBuiltin::GreaterThan => Expression::GreaterThan(GreaterThanExpression {
            left: num(0),
            right: num(0),
        }),
        CompilerBuiltin::GreaterThanOrEqual => {
            Expression::GreaterThanOrEqual(GreaterThanOrEqualExpression {
                left: num(0),
                right: num(0),
            })
        }
        CompilerBuiltin::Not => Expression::Not(NotExpression {
            value: bool_expr(false),
        }),
        CompilerBuiltin::And => Expression::And(AndExpression {
            left: bool_expr(true),
            right: bool_expr(true),
        }),
        CompilerBuiltin::Or => Expression::Or(OrExpression {
            left: bool_expr(false),
            right: bool_expr(false),
        }),
        CompilerBuiltin::StringConcat => Expression::StringConcat(StringConcatExpression {
            left: str_expr(""),
            right: str_expr(""),
        }),
        CompilerBuiltin::StringLength => Expression::StringLength(StringLengthExpression {
            value: str_expr(""),
        }),
        CompilerBuiltin::StringSlice => Expression::StringSlice(StringSliceExpression {
            value: str_expr(""),
            start: num(0),
            end: num(0),
        }),
        CompilerBuiltin::ListLength => Expression::ListLength(ListLengthExpression {
            value: empty_list(),
        }),
        CompilerBuiltin::ListConcat => Expression::ListConcat(ListConcatExpression {
            left: empty_list(),
            right: empty_list(),
        }),
        CompilerBuiltin::ListGet => Expression::ListGet(ListGetExpression {
            list: empty_list(),
            index: num(0),
        }),
        CompilerBuiltin::ListAppend => Expression::ListAppend(ListAppendExpression {
            list: empty_list(),
            item: num(0),
        }),
        CompilerBuiltin::NumberLiteral => Expression::Number(NumberExpression { value: 0 }),
        CompilerBuiltin::If => Expression::If(IfExpression {
            condition: bool_expr(false),
            then_expr: num(0),
            else_expr: num(0),
        }),
        CompilerBuiltin::Let => Expression::Let(LetExpression {
            variable_id: next_variable_id,
            variable_name: "x".into(),
            value: num(0),
            body: var_expr(next_variable_id),
        }),
        CompilerBuiltin::Function => Expression::Function(FunctionExpression {
            parameter_id: next_variable_id,
            parameter_name: "x".into(),
            body: var_expr(next_variable_id),
        }),
        CompilerBuiltin::Call => Expression::Call(CallExpression {
            function: Box::new(Expression::Function(FunctionExpression {
                parameter_id: next_variable_id,
                parameter_name: "x".into(),
                body: var_expr(next_variable_id),
            })),
            argument: num(0),
        }),
    }
}

pub(crate) fn build_expression_from_selection(
    state: &AppState,
    selected_value: &str,
    next_variable_id: i64,
    constructor_default: Option<(EventHashId, definy_event::event::Expression)>,
    current_expr: &definy_event::event::Expression,
) -> definy_event::event::Expression {
    let builtin_opt = match selected_value {
        "expr:number" => Some(CompilerBuiltin::NumberLiteral),
        "expr:add" => Some(CompilerBuiltin::Plus),
        "expr:subtract" | "expr:minus" => Some(CompilerBuiltin::Minus),
        "expr:multiply" => Some(CompilerBuiltin::Multiply),
        "expr:divide" => Some(CompilerBuiltin::Divide),
        "expr:remainder" => Some(CompilerBuiltin::Remainder),
        "expr:equal" => Some(CompilerBuiltin::Equal),
        "expr:not_equal" => Some(CompilerBuiltin::NotEqual),
        "expr:less_than" => Some(CompilerBuiltin::LessThan),
        "expr:less_than_or_equal" => Some(CompilerBuiltin::LessThanOrEqual),
        "expr:greater_than" => Some(CompilerBuiltin::GreaterThan),
        "expr:greater_than_or_equal" => Some(CompilerBuiltin::GreaterThanOrEqual),
        "expr:not" => Some(CompilerBuiltin::Not),
        "expr:and" => Some(CompilerBuiltin::And),
        "expr:or" => Some(CompilerBuiltin::Or),
        "expr:string_concat" => Some(CompilerBuiltin::StringConcat),
        "expr:string_length" => Some(CompilerBuiltin::StringLength),
        "expr:string_slice" => Some(CompilerBuiltin::StringSlice),
        "expr:list_length" => Some(CompilerBuiltin::ListLength),
        "expr:list_concat" => Some(CompilerBuiltin::ListConcat),
        "expr:list_get" => Some(CompilerBuiltin::ListGet),
        "expr:list_append" => Some(CompilerBuiltin::ListAppend),
        "expr:if" => Some(CompilerBuiltin::If),
        "expr:let" => Some(CompilerBuiltin::Let),
        "expr:function" => Some(CompilerBuiltin::Function),
        "expr:call" => Some(CompilerBuiltin::Call),
        _ => None,
    };

    if let Some(builtin) = builtin_opt {
        return default_expression_for_compiler_builtin(builtin, next_variable_id);
    }

    match selected_value {
        "expr:string" => Expression::String(StringExpression { value: "".into() }),
        "expr:boolean" => Expression::Boolean(BooleanExpression { value: false }),
        "expr:list" => Expression::ListLiteral(ListLiteralExpression {
            items: vec![Expression::Number(NumberExpression { value: 0 })],
        }),
        "expr:type:number" => Expression::TypeNumber,
        "expr:type:string" => Expression::TypeString,
        "expr:type:boolean" => Expression::TypeBoolean,
        "expr:type:list" => Expression::TypeList(TypeListExpression {
            item_type: Box::new(Expression::TypeString),
        }),
        "expr:type_literal" => Expression::TypeLiteral(TypeLiteralExpression {
            items: vec![TypeLiteralItemExpression {
                key: "key".into(),
                value: Box::new(Expression::TypeString),
            }],
        }),
        "expr:record_get" => Expression::RecordGet(RecordGetExpression {
            record: Box::new(Expression::TypeLiteral(TypeLiteralExpression {
                items: vec![TypeLiteralItemExpression {
                    key: "field".into(),
                    value: Box::new(Expression::Number(NumberExpression { value: 0 })),
                }],
            })),
            key: "field".into(),
        }),
        "expr:type:function" => Expression::TypeFunction(TypeFunctionExpression {
            parameter: Box::new(Expression::TypeNumber),
            return_type: Box::new(Expression::TypeNumber),
        }),
        "expr:type:union" => Expression::TypeUnion(TypeUnionExpression {
            variants: vec![
                TypeUnionVariant {
                    tag: "A".into(),
                    payload_type: None,
                },
                TypeUnionVariant {
                    tag: "B".into(),
                    payload_type: None,
                },
            ],
        }),
        "expr:variant" => build_variant_expression(state, "some", current_expr),
        "expr:match" => Expression::Match(MatchExpression {
            target: num(0),
            arms: vec![MatchArm {
                tag: "A".into(),
                variable_id: None,
                variable_name: None,
                body: num(0),
            }],
            default: Some(num(0)),
        }),
        _ if selected_value.starts_with("expr:variant:") => {
            let tag = selected_value
                .strip_prefix("expr:variant:")
                .unwrap_or("some");
            build_variant_expression(state, tag, current_expr)
        }
        _ => {
            if let Some((type_part_definition_event_hash, default_value)) = constructor_default {
                Expression::Constructor(ConstructorExpression {
                    type_part_definition_event_hash,
                    value: Box::new(default_value),
                })
            } else if let Some(encoded) = selected_value.strip_prefix("ref:global:") {
                if let Ok(hash) = EventHashId::from_str(encoded) {
                    if let Some(snapshot) = crate::part_projection::find_part_snapshot(state, &hash)
                        && let Some(Expression::Compiler(builtin)) = snapshot.expression.as_ref()
                    {
                        return default_expression_for_compiler_builtin(*builtin, next_variable_id);
                    }
                    Expression::PartReference(PartReferenceExpression {
                        part_definition_event_hash: hash,
                    })
                } else {
                    current_expr.clone()
                }
            } else if let Some(local_id_str) = selected_value.strip_prefix("ref:local:") {
                if let Ok(variable_id) = local_id_str.parse::<i64>() {
                    Expression::Variable(VariableExpression { variable_id })
                } else {
                    current_expr.clone()
                }
            } else {
                current_expr.clone()
            }
        }
    }
}

pub fn apply_selection(
    state: &AppState,
    root_expression_opt: &mut Option<definy_event::event::Expression>,
    path: &[PathStep],
    selected_value: &str,
    constructor_default: Option<(EventHashId, definy_event::event::Expression)>,
) {
    if path.is_empty() {
        if selected_value == "expr:none" {
            *root_expression_opt = None;
            return;
        }
        let next_variable_id =
            if selected_value == "expr:let" || selected_value.starts_with("ref:global:") {
                root_expression_opt
                    .as_ref()
                    .map(next_local_variable_id)
                    .unwrap_or(1)
            } else {
                0
            };
        let fallback =
            definy_event::event::Expression::Number(definy_event::event::NumberExpression {
                value: 0,
            });
        let current_ref = root_expression_opt.as_ref().unwrap_or(&fallback);
        *root_expression_opt = Some(build_expression_from_selection(
            state,
            selected_value,
            next_variable_id,
            constructor_default,
            current_ref,
        ));
        return;
    }

    if let Some(root_expr) = root_expression_opt.as_mut() {
        let next_variable_id =
            if selected_value == "expr:let" || selected_value.starts_with("ref:global:") {
                next_local_variable_id(root_expr)
            } else {
                0
            };
        if let Some(target_expr) = get_mut_expression_at_path(root_expr, path) {
            *target_expr = build_expression_from_selection(
                state,
                selected_value,
                next_variable_id,
                constructor_default,
                target_expr,
            );
        }
    }
}

fn build_variant_expression(
    state: &AppState,
    tag: &str,
    current_expr: &definy_event::event::Expression,
) -> definy_event::event::Expression {
    let snapshots = crate::part_projection::collect_part_snapshots(state);
    let type_variant = snapshots.iter().find_map(|snapshot| {
        if let Some(Expression::TypeUnion(union_expr)) = &snapshot.expression {
            union_expr
                .variants
                .iter()
                .find(|v| v.tag.as_ref() == tag)
                .map(|v| (snapshot.definition_event_hash.clone(), v))
        } else {
            None
        }
    });

    let (type_hash, payload_type_opt) = match type_variant {
        Some((hash, v)) => (Some(hash), v.payload_type.as_ref().map(|b| b.as_ref())),
        None => (None, None),
    };

    let payload = if tag == "none" {
        None
    } else if let Expression::Variant(existing_var) = current_expr {
        if existing_var.tag.as_ref() == tag && existing_var.payload.is_some() {
            existing_var.payload.clone()
        } else if tag == "some" || payload_type_opt.is_some() {
            existing_var.payload.clone().or_else(|| Some(num(0)))
        } else {
            None
        }
    } else if tag == "some" || payload_type_opt.is_some() {
        Some(num(0))
    } else {
        None
    };

    Expression::Variant(VariantExpression {
        tag: tag.into(),
        payload,
        type_part_definition_event_hash: type_hash,
    })
}
