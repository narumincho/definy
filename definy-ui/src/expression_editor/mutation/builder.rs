use std::str::FromStr;

use definy_event::EventHashId;

use crate::app_state::{AppState, PathStep};

use super::get_mut_expression_at_path;
use super::variables::next_local_variable_id;

pub(crate) fn build_expression_from_selection(
    state: &AppState,
    selected_value: &str,
    next_variable_id: i64,
    constructor_default: Option<(EventHashId, definy_event::event::Expression)>,
    current_expr: &definy_event::event::Expression,
) -> definy_event::event::Expression {
    if selected_value == "expr:number" {
        definy_event::event::Expression::Number(definy_event::event::NumberExpression { value: 0 })
    } else if selected_value == "expr:string" {
        definy_event::event::Expression::String(definy_event::event::StringExpression {
            value: "".into(),
        })
    } else if selected_value == "expr:type:number" {
        definy_event::event::Expression::TypeNumber
    } else if selected_value == "expr:type:string" {
        definy_event::event::Expression::TypeString
    } else if selected_value == "expr:type:boolean" {
        definy_event::event::Expression::TypeBoolean
    } else if selected_value == "expr:type:list" {
        definy_event::event::Expression::TypeList(definy_event::event::TypeListExpression {
            item_type: Box::new(definy_event::event::Expression::TypeString),
        })
    } else if selected_value == "expr:list" {
        definy_event::event::Expression::ListLiteral(definy_event::event::ListLiteralExpression {
            items: vec![definy_event::event::Expression::Number(
                definy_event::event::NumberExpression { value: 0 },
            )],
        })
    } else if selected_value == "expr:boolean" {
        definy_event::event::Expression::Boolean(definy_event::event::BooleanExpression {
            value: false,
        })
    } else if selected_value == "expr:add" {
        definy_event::event::Expression::Add(definy_event::event::AddExpression {
            left: Box::new(definy_event::event::Expression::Number(
                definy_event::event::NumberExpression { value: 0 },
            )),
            right: Box::new(definy_event::event::Expression::Number(
                definy_event::event::NumberExpression { value: 0 },
            )),
        })
    } else if selected_value == "expr:subtract" || selected_value == "expr:minus" {
        definy_event::event::Expression::Subtract(definy_event::event::SubtractExpression {
            left: Box::new(definy_event::event::Expression::Number(
                definy_event::event::NumberExpression { value: 0 },
            )),
            right: Box::new(definy_event::event::Expression::Number(
                definy_event::event::NumberExpression { value: 0 },
            )),
        })
    } else if selected_value == "expr:multiply" {
        definy_event::event::Expression::Multiply(definy_event::event::MultiplyExpression {
            left: Box::new(definy_event::event::Expression::Number(
                definy_event::event::NumberExpression { value: 0 },
            )),
            right: Box::new(definy_event::event::Expression::Number(
                definy_event::event::NumberExpression { value: 0 },
            )),
        })
    } else if selected_value == "expr:divide" {
        definy_event::event::Expression::Divide(definy_event::event::DivideExpression {
            left: Box::new(definy_event::event::Expression::Number(
                definy_event::event::NumberExpression { value: 0 },
            )),
            right: Box::new(definy_event::event::Expression::Number(
                definy_event::event::NumberExpression { value: 1 },
            )),
        })
    } else if selected_value == "expr:remainder" {
        definy_event::event::Expression::Remainder(definy_event::event::RemainderExpression {
            left: Box::new(definy_event::event::Expression::Number(
                definy_event::event::NumberExpression { value: 0 },
            )),
            right: Box::new(definy_event::event::Expression::Number(
                definy_event::event::NumberExpression { value: 1 },
            )),
        })
    } else if selected_value == "expr:equal" {
        definy_event::event::Expression::Equal(definy_event::event::EqualExpression {
            left: Box::new(definy_event::event::Expression::Number(
                definy_event::event::NumberExpression { value: 0 },
            )),
            right: Box::new(definy_event::event::Expression::Number(
                definy_event::event::NumberExpression { value: 0 },
            )),
        })
    } else if selected_value == "expr:not_equal" {
        definy_event::event::Expression::NotEqual(definy_event::event::NotEqualExpression {
            left: Box::new(definy_event::event::Expression::Number(
                definy_event::event::NumberExpression { value: 0 },
            )),
            right: Box::new(definy_event::event::Expression::Number(
                definy_event::event::NumberExpression { value: 0 },
            )),
        })
    } else if selected_value == "expr:less_than" {
        definy_event::event::Expression::LessThan(definy_event::event::LessThanExpression {
            left: Box::new(definy_event::event::Expression::Number(
                definy_event::event::NumberExpression { value: 0 },
            )),
            right: Box::new(definy_event::event::Expression::Number(
                definy_event::event::NumberExpression { value: 0 },
            )),
        })
    } else if selected_value == "expr:less_than_or_equal" {
        definy_event::event::Expression::LessThanOrEqual(
            definy_event::event::LessThanOrEqualExpression {
                left: Box::new(definy_event::event::Expression::Number(
                    definy_event::event::NumberExpression { value: 0 },
                )),
                right: Box::new(definy_event::event::Expression::Number(
                    definy_event::event::NumberExpression { value: 0 },
                )),
            },
        )
    } else if selected_value == "expr:greater_than" {
        definy_event::event::Expression::GreaterThan(definy_event::event::GreaterThanExpression {
            left: Box::new(definy_event::event::Expression::Number(
                definy_event::event::NumberExpression { value: 0 },
            )),
            right: Box::new(definy_event::event::Expression::Number(
                definy_event::event::NumberExpression { value: 0 },
            )),
        })
    } else if selected_value == "expr:greater_than_or_equal" {
        definy_event::event::Expression::GreaterThanOrEqual(
            definy_event::event::GreaterThanOrEqualExpression {
                left: Box::new(definy_event::event::Expression::Number(
                    definy_event::event::NumberExpression { value: 0 },
                )),
                right: Box::new(definy_event::event::Expression::Number(
                    definy_event::event::NumberExpression { value: 0 },
                )),
            },
        )
    } else if selected_value == "expr:not" {
        definy_event::event::Expression::Not(definy_event::event::NotExpression {
            value: Box::new(definy_event::event::Expression::Boolean(
                definy_event::event::BooleanExpression { value: false },
            )),
        })
    } else if selected_value == "expr:and" {
        definy_event::event::Expression::And(definy_event::event::AndExpression {
            left: Box::new(definy_event::event::Expression::Boolean(
                definy_event::event::BooleanExpression { value: true },
            )),
            right: Box::new(definy_event::event::Expression::Boolean(
                definy_event::event::BooleanExpression { value: true },
            )),
        })
    } else if selected_value == "expr:or" {
        definy_event::event::Expression::Or(definy_event::event::OrExpression {
            left: Box::new(definy_event::event::Expression::Boolean(
                definy_event::event::BooleanExpression { value: false },
            )),
            right: Box::new(definy_event::event::Expression::Boolean(
                definy_event::event::BooleanExpression { value: false },
            )),
        })
    } else if selected_value == "expr:string_concat" {
        definy_event::event::Expression::StringConcat(definy_event::event::StringConcatExpression {
            left: Box::new(definy_event::event::Expression::String(
                definy_event::event::StringExpression { value: "".into() },
            )),
            right: Box::new(definy_event::event::Expression::String(
                definy_event::event::StringExpression { value: "".into() },
            )),
        })
    } else if selected_value == "expr:string_length" {
        definy_event::event::Expression::StringLength(definy_event::event::StringLengthExpression {
            value: Box::new(definy_event::event::Expression::String(
                definy_event::event::StringExpression { value: "".into() },
            )),
        })
    } else if selected_value == "expr:string_slice" {
        definy_event::event::Expression::StringSlice(definy_event::event::StringSliceExpression {
            value: Box::new(definy_event::event::Expression::String(
                definy_event::event::StringExpression { value: "".into() },
            )),
            start: Box::new(definy_event::event::Expression::Number(
                definy_event::event::NumberExpression { value: 0 },
            )),
            end: Box::new(definy_event::event::Expression::Number(
                definy_event::event::NumberExpression { value: 0 },
            )),
        })
    } else if selected_value == "expr:list_length" {
        definy_event::event::Expression::ListLength(definy_event::event::ListLengthExpression {
            value: Box::new(definy_event::event::Expression::ListLiteral(
                definy_event::event::ListLiteralExpression { items: Vec::new() },
            )),
        })
    } else if selected_value == "expr:list_concat" {
        definy_event::event::Expression::ListConcat(definy_event::event::ListConcatExpression {
            left: Box::new(definy_event::event::Expression::ListLiteral(
                definy_event::event::ListLiteralExpression { items: Vec::new() },
            )),
            right: Box::new(definy_event::event::Expression::ListLiteral(
                definy_event::event::ListLiteralExpression { items: Vec::new() },
            )),
        })
    } else if selected_value == "expr:list_get" {
        definy_event::event::Expression::ListGet(definy_event::event::ListGetExpression {
            list: Box::new(definy_event::event::Expression::ListLiteral(
                definy_event::event::ListLiteralExpression { items: Vec::new() },
            )),
            index: Box::new(definy_event::event::Expression::Number(
                definy_event::event::NumberExpression { value: 0 },
            )),
        })
    } else if selected_value == "expr:list_append" {
        definy_event::event::Expression::ListAppend(definy_event::event::ListAppendExpression {
            list: Box::new(definy_event::event::Expression::ListLiteral(
                definy_event::event::ListLiteralExpression { items: Vec::new() },
            )),
            item: Box::new(definy_event::event::Expression::Number(
                definy_event::event::NumberExpression { value: 0 },
            )),
        })
    } else if selected_value == "expr:if" {
        definy_event::event::Expression::If(definy_event::event::IfExpression {
            condition: Box::new(definy_event::event::Expression::Boolean(
                definy_event::event::BooleanExpression { value: false },
            )),
            then_expr: Box::new(definy_event::event::Expression::Number(
                definy_event::event::NumberExpression { value: 0 },
            )),
            else_expr: Box::new(definy_event::event::Expression::Number(
                definy_event::event::NumberExpression { value: 0 },
            )),
        })
    } else if selected_value == "expr:let" {
        definy_event::event::Expression::Let(definy_event::event::LetExpression {
            variable_id: next_variable_id,
            variable_name: "x".into(),
            value: Box::new(definy_event::event::Expression::Number(
                definy_event::event::NumberExpression { value: 0 },
            )),
            body: Box::new(definy_event::event::Expression::Variable(
                definy_event::event::VariableExpression {
                    variable_id: next_variable_id,
                },
            )),
        })
    } else if selected_value == "expr:type_literal" {
        definy_event::event::Expression::TypeLiteral(definy_event::event::TypeLiteralExpression {
            items: vec![definy_event::event::TypeLiteralItemExpression {
                key: "key".into(),
                value: Box::new(definy_event::event::Expression::TypeString),
            }],
        })
    } else if selected_value == "expr:function" {
        definy_event::event::Expression::Function(definy_event::event::FunctionExpression {
            parameter_id: next_variable_id,
            parameter_name: "x".into(),
            body: Box::new(definy_event::event::Expression::Variable(
                definy_event::event::VariableExpression {
                    variable_id: next_variable_id,
                },
            )),
        })
    } else if selected_value == "expr:call" {
        definy_event::event::Expression::Call(definy_event::event::CallExpression {
            function: Box::new(definy_event::event::Expression::Function(
                definy_event::event::FunctionExpression {
                    parameter_id: next_variable_id,
                    parameter_name: "x".into(),
                    body: Box::new(definy_event::event::Expression::Variable(
                        definy_event::event::VariableExpression {
                            variable_id: next_variable_id,
                        },
                    )),
                },
            )),
            argument: Box::new(definy_event::event::Expression::Number(
                definy_event::event::NumberExpression { value: 0 },
            )),
        })
    } else if selected_value == "expr:type:function" {
        definy_event::event::Expression::TypeFunction(definy_event::event::TypeFunctionExpression {
            parameter: Box::new(definy_event::event::Expression::TypeNumber),
            return_type: Box::new(definy_event::event::Expression::TypeNumber),
        })
    } else if let Some((type_part_definition_event_hash, default_value)) = constructor_default {
        definy_event::event::Expression::Constructor(definy_event::event::ConstructorExpression {
            type_part_definition_event_hash,
            value: Box::new(default_value),
        })
    } else if let Some(encoded) = selected_value.strip_prefix("ref:global:") {
        if let Ok(hash) = EventHashId::from_str(encoded) {
            if let Some(snapshot) = crate::part_projection::find_part_snapshot(state, &hash) {
                match snapshot.expression.as_ref() {
                    Some(definy_event::event::Expression::Compiler(
                        definy_event::event::CompilerBuiltin::Plus,
                    )) => {
                        definy_event::event::Expression::Add(definy_event::event::AddExpression {
                            left: Box::new(definy_event::event::Expression::Number(
                                definy_event::event::NumberExpression { value: 0 },
                            )),
                            right: Box::new(definy_event::event::Expression::Number(
                                definy_event::event::NumberExpression { value: 0 },
                            )),
                        })
                    }
                    Some(definy_event::event::Expression::Compiler(
                        definy_event::event::CompilerBuiltin::Minus,
                    )) => definy_event::event::Expression::Subtract(
                        definy_event::event::SubtractExpression {
                            left: Box::new(definy_event::event::Expression::Number(
                                definy_event::event::NumberExpression { value: 0 },
                            )),
                            right: Box::new(definy_event::event::Expression::Number(
                                definy_event::event::NumberExpression { value: 0 },
                            )),
                        },
                    ),
                    Some(definy_event::event::Expression::Compiler(
                        definy_event::event::CompilerBuiltin::Multiply,
                    )) => definy_event::event::Expression::Multiply(
                        definy_event::event::MultiplyExpression {
                            left: Box::new(definy_event::event::Expression::Number(
                                definy_event::event::NumberExpression { value: 0 },
                            )),
                            right: Box::new(definy_event::event::Expression::Number(
                                definy_event::event::NumberExpression { value: 0 },
                            )),
                        },
                    ),
                    Some(definy_event::event::Expression::Compiler(
                        definy_event::event::CompilerBuiltin::Divide,
                    )) => definy_event::event::Expression::Divide(
                        definy_event::event::DivideExpression {
                            left: Box::new(definy_event::event::Expression::Number(
                                definy_event::event::NumberExpression { value: 0 },
                            )),
                            right: Box::new(definy_event::event::Expression::Number(
                                definy_event::event::NumberExpression { value: 1 },
                            )),
                        },
                    ),
                    Some(definy_event::event::Expression::Compiler(
                        definy_event::event::CompilerBuiltin::Remainder,
                    )) => definy_event::event::Expression::Remainder(
                        definy_event::event::RemainderExpression {
                            left: Box::new(definy_event::event::Expression::Number(
                                definy_event::event::NumberExpression { value: 0 },
                            )),
                            right: Box::new(definy_event::event::Expression::Number(
                                definy_event::event::NumberExpression { value: 1 },
                            )),
                        },
                    ),
                    Some(definy_event::event::Expression::Compiler(
                        definy_event::event::CompilerBuiltin::LessThan,
                    )) => definy_event::event::Expression::LessThan(
                        definy_event::event::LessThanExpression {
                            left: Box::new(definy_event::event::Expression::Number(
                                definy_event::event::NumberExpression { value: 0 },
                            )),
                            right: Box::new(definy_event::event::Expression::Number(
                                definy_event::event::NumberExpression { value: 0 },
                            )),
                        },
                    ),
                    Some(definy_event::event::Expression::Compiler(
                        definy_event::event::CompilerBuiltin::LessThanOrEqual,
                    )) => definy_event::event::Expression::LessThanOrEqual(
                        definy_event::event::LessThanOrEqualExpression {
                            left: Box::new(definy_event::event::Expression::Number(
                                definy_event::event::NumberExpression { value: 0 },
                            )),
                            right: Box::new(definy_event::event::Expression::Number(
                                definy_event::event::NumberExpression { value: 0 },
                            )),
                        },
                    ),
                    Some(definy_event::event::Expression::Compiler(
                        definy_event::event::CompilerBuiltin::GreaterThan,
                    )) => definy_event::event::Expression::GreaterThan(
                        definy_event::event::GreaterThanExpression {
                            left: Box::new(definy_event::event::Expression::Number(
                                definy_event::event::NumberExpression { value: 0 },
                            )),
                            right: Box::new(definy_event::event::Expression::Number(
                                definy_event::event::NumberExpression { value: 0 },
                            )),
                        },
                    ),
                    Some(definy_event::event::Expression::Compiler(
                        definy_event::event::CompilerBuiltin::GreaterThanOrEqual,
                    )) => definy_event::event::Expression::GreaterThanOrEqual(
                        definy_event::event::GreaterThanOrEqualExpression {
                            left: Box::new(definy_event::event::Expression::Number(
                                definy_event::event::NumberExpression { value: 0 },
                            )),
                            right: Box::new(definy_event::event::Expression::Number(
                                definy_event::event::NumberExpression { value: 0 },
                            )),
                        },
                    ),
                    Some(definy_event::event::Expression::Compiler(
                        definy_event::event::CompilerBuiltin::NotEqual,
                    )) => definy_event::event::Expression::NotEqual(
                        definy_event::event::NotEqualExpression {
                            left: Box::new(definy_event::event::Expression::Number(
                                definy_event::event::NumberExpression { value: 0 },
                            )),
                            right: Box::new(definy_event::event::Expression::Number(
                                definy_event::event::NumberExpression { value: 0 },
                            )),
                        },
                    ),
                    Some(definy_event::event::Expression::Compiler(
                        definy_event::event::CompilerBuiltin::Not,
                    )) => {
                        definy_event::event::Expression::Not(definy_event::event::NotExpression {
                            value: Box::new(definy_event::event::Expression::Boolean(
                                definy_event::event::BooleanExpression { value: false },
                            )),
                        })
                    }
                    Some(definy_event::event::Expression::Compiler(
                        definy_event::event::CompilerBuiltin::And,
                    )) => {
                        definy_event::event::Expression::And(definy_event::event::AndExpression {
                            left: Box::new(definy_event::event::Expression::Boolean(
                                definy_event::event::BooleanExpression { value: true },
                            )),
                            right: Box::new(definy_event::event::Expression::Boolean(
                                definy_event::event::BooleanExpression { value: true },
                            )),
                        })
                    }
                    Some(definy_event::event::Expression::Compiler(
                        definy_event::event::CompilerBuiltin::Or,
                    )) => definy_event::event::Expression::Or(definy_event::event::OrExpression {
                        left: Box::new(definy_event::event::Expression::Boolean(
                            definy_event::event::BooleanExpression { value: false },
                        )),
                        right: Box::new(definy_event::event::Expression::Boolean(
                            definy_event::event::BooleanExpression { value: false },
                        )),
                    }),
                    Some(definy_event::event::Expression::Compiler(
                        definy_event::event::CompilerBuiltin::Let,
                    )) => {
                        definy_event::event::Expression::Let(definy_event::event::LetExpression {
                            variable_id: next_variable_id,
                            variable_name: "x".into(),
                            value: Box::new(definy_event::event::Expression::Number(
                                definy_event::event::NumberExpression { value: 0 },
                            )),
                            body: Box::new(definy_event::event::Expression::Variable(
                                definy_event::event::VariableExpression {
                                    variable_id: next_variable_id,
                                },
                            )),
                        })
                    }
                    Some(definy_event::event::Expression::Compiler(
                        definy_event::event::CompilerBuiltin::NumberLiteral,
                    )) => definy_event::event::Expression::Number(
                        definy_event::event::NumberExpression { value: 0 },
                    ),
                    Some(definy_event::event::Expression::Compiler(
                        definy_event::event::CompilerBuiltin::If,
                    )) => definy_event::event::Expression::If(definy_event::event::IfExpression {
                        condition: Box::new(definy_event::event::Expression::Boolean(
                            definy_event::event::BooleanExpression { value: false },
                        )),
                        then_expr: Box::new(definy_event::event::Expression::Number(
                            definy_event::event::NumberExpression { value: 0 },
                        )),
                        else_expr: Box::new(definy_event::event::Expression::Number(
                            definy_event::event::NumberExpression { value: 0 },
                        )),
                    }),
                    Some(definy_event::event::Expression::Compiler(
                        definy_event::event::CompilerBuiltin::Equal,
                    )) => definy_event::event::Expression::Equal(
                        definy_event::event::EqualExpression {
                            left: Box::new(definy_event::event::Expression::Number(
                                definy_event::event::NumberExpression { value: 0 },
                            )),
                            right: Box::new(definy_event::event::Expression::Number(
                                definy_event::event::NumberExpression { value: 0 },
                            )),
                        },
                    ),
                    Some(definy_event::event::Expression::Compiler(
                        definy_event::event::CompilerBuiltin::StringConcat,
                    )) => definy_event::event::Expression::StringConcat(
                        definy_event::event::StringConcatExpression {
                            left: Box::new(definy_event::event::Expression::String(
                                definy_event::event::StringExpression { value: "".into() },
                            )),
                            right: Box::new(definy_event::event::Expression::String(
                                definy_event::event::StringExpression { value: "".into() },
                            )),
                        },
                    ),
                    Some(definy_event::event::Expression::Compiler(
                        definy_event::event::CompilerBuiltin::StringLength,
                    )) => definy_event::event::Expression::StringLength(
                        definy_event::event::StringLengthExpression {
                            value: Box::new(definy_event::event::Expression::String(
                                definy_event::event::StringExpression { value: "".into() },
                            )),
                        },
                    ),
                    Some(definy_event::event::Expression::Compiler(
                        definy_event::event::CompilerBuiltin::StringSlice,
                    )) => definy_event::event::Expression::StringSlice(
                        definy_event::event::StringSliceExpression {
                            value: Box::new(definy_event::event::Expression::String(
                                definy_event::event::StringExpression { value: "".into() },
                            )),
                            start: Box::new(definy_event::event::Expression::Number(
                                definy_event::event::NumberExpression { value: 0 },
                            )),
                            end: Box::new(definy_event::event::Expression::Number(
                                definy_event::event::NumberExpression { value: 0 },
                            )),
                        },
                    ),
                    Some(definy_event::event::Expression::Compiler(
                        definy_event::event::CompilerBuiltin::ListLength,
                    )) => definy_event::event::Expression::ListLength(
                        definy_event::event::ListLengthExpression {
                            value: Box::new(definy_event::event::Expression::ListLiteral(
                                definy_event::event::ListLiteralExpression { items: Vec::new() },
                            )),
                        },
                    ),
                    Some(definy_event::event::Expression::Compiler(
                        definy_event::event::CompilerBuiltin::ListConcat,
                    )) => definy_event::event::Expression::ListConcat(
                        definy_event::event::ListConcatExpression {
                            left: Box::new(definy_event::event::Expression::ListLiteral(
                                definy_event::event::ListLiteralExpression { items: Vec::new() },
                            )),
                            right: Box::new(definy_event::event::Expression::ListLiteral(
                                definy_event::event::ListLiteralExpression { items: Vec::new() },
                            )),
                        },
                    ),
                    Some(definy_event::event::Expression::Compiler(
                        definy_event::event::CompilerBuiltin::ListGet,
                    )) => definy_event::event::Expression::ListGet(
                        definy_event::event::ListGetExpression {
                            list: Box::new(definy_event::event::Expression::ListLiteral(
                                definy_event::event::ListLiteralExpression { items: Vec::new() },
                            )),
                            index: Box::new(definy_event::event::Expression::Number(
                                definy_event::event::NumberExpression { value: 0 },
                            )),
                        },
                    ),
                    Some(definy_event::event::Expression::Compiler(
                        definy_event::event::CompilerBuiltin::ListAppend,
                    )) => definy_event::event::Expression::ListAppend(
                        definy_event::event::ListAppendExpression {
                            list: Box::new(definy_event::event::Expression::ListLiteral(
                                definy_event::event::ListLiteralExpression { items: Vec::new() },
                            )),
                            item: Box::new(definy_event::event::Expression::Number(
                                definy_event::event::NumberExpression { value: 0 },
                            )),
                        },
                    ),
                    _ => definy_event::event::Expression::PartReference(
                        definy_event::event::PartReferenceExpression {
                            part_definition_event_hash: hash,
                        },
                    ),
                }
            } else {
                definy_event::event::Expression::PartReference(
                    definy_event::event::PartReferenceExpression {
                        part_definition_event_hash: hash,
                    },
                )
            }
        } else {
            current_expr.clone()
        }
    } else if let Some(local_id_str) = selected_value.strip_prefix("ref:local:") {
        if let Ok(variable_id) = local_id_str.parse::<i64>() {
            definy_event::event::Expression::Variable(definy_event::event::VariableExpression {
                variable_id,
            })
        } else {
            current_expr.clone()
        }
    } else {
        current_expr.clone()
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
