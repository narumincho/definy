use definy_event::event::{
    Description, EqualExpression, Expression, FunctionExpression, GreaterThanExpression,
    IfExpression, LessThanExpression, ListGetExpression, ListLengthExpression, ModulePartEntry,
    NumberExpression, PartType, StringExpression, SubtractExpression, VariableExpression,
};

/// 標準ライブラリ `std` モジュールのパーツ一覧を生成します。
pub fn create_std_module_parts() -> Vec<ModulePartEntry> {
    vec![
        // 1. abs: 数値の絶対値
        ModulePartEntry {
            name: "abs".into(),
            part_type: Some(PartType::Function {
                parameter: Box::new(PartType::Number),
                return_type: Box::new(PartType::Number),
            }),
            description: Description::localized(vec![
                ("en", "Return absolute value of a number"),
                ("ja", "数値の絶対値を返します"),
            ]),
            expression: Some(Expression::Function(FunctionExpression {
                parameter_id: 1,
                parameter_name: "x".into(),
                body: Box::new(Expression::If(IfExpression {
                    condition: Box::new(Expression::LessThan(LessThanExpression {
                        left: Box::new(Expression::Variable(VariableExpression { variable_id: 1 })),
                        right: Box::new(Expression::Number(NumberExpression { value: 0 })),
                    })),
                    then_expr: Box::new(Expression::Subtract(SubtractExpression {
                        left: Box::new(Expression::Number(NumberExpression { value: 0 })),
                        right: Box::new(Expression::Variable(VariableExpression {
                            variable_id: 1,
                        })),
                    })),
                    else_expr: Box::new(Expression::Variable(VariableExpression {
                        variable_id: 1,
                    })),
                })),
            })),
        },
        // 2. min: 2つの数値の最小値 (カリー化)
        ModulePartEntry {
            name: "min".into(),
            part_type: Some(PartType::Function {
                parameter: Box::new(PartType::Number),
                return_type: Box::new(PartType::Function {
                    parameter: Box::new(PartType::Number),
                    return_type: Box::new(PartType::Number),
                }),
            }),
            description: Description::localized(vec![
                ("en", "Return the smaller of two numbers (curried)"),
                ("ja", "2つの数値のうち小さい方を返します (カリー化)"),
            ]),
            expression: Some(Expression::Function(FunctionExpression {
                parameter_id: 1,
                parameter_name: "a".into(),
                body: Box::new(Expression::Function(FunctionExpression {
                    parameter_id: 2,
                    parameter_name: "b".into(),
                    body: Box::new(Expression::If(IfExpression {
                        condition: Box::new(Expression::LessThan(LessThanExpression {
                            left: Box::new(Expression::Variable(VariableExpression {
                                variable_id: 1,
                            })),
                            right: Box::new(Expression::Variable(VariableExpression {
                                variable_id: 2,
                            })),
                        })),
                        then_expr: Box::new(Expression::Variable(VariableExpression {
                            variable_id: 1,
                        })),
                        else_expr: Box::new(Expression::Variable(VariableExpression {
                            variable_id: 2,
                        })),
                    })),
                })),
            })),
        },
        // 3. max: 2つの数値の最大値 (カリー化)
        ModulePartEntry {
            name: "max".into(),
            part_type: Some(PartType::Function {
                parameter: Box::new(PartType::Number),
                return_type: Box::new(PartType::Function {
                    parameter: Box::new(PartType::Number),
                    return_type: Box::new(PartType::Number),
                }),
            }),
            description: Description::localized(vec![
                ("en", "Return the larger of two numbers (curried)"),
                ("ja", "2つの数値のうち大きい方を返します (カリー化)"),
            ]),
            expression: Some(Expression::Function(FunctionExpression {
                parameter_id: 1,
                parameter_name: "a".into(),
                body: Box::new(Expression::Function(FunctionExpression {
                    parameter_id: 2,
                    parameter_name: "b".into(),
                    body: Box::new(Expression::If(IfExpression {
                        condition: Box::new(Expression::GreaterThan(GreaterThanExpression {
                            left: Box::new(Expression::Variable(VariableExpression {
                                variable_id: 1,
                            })),
                            right: Box::new(Expression::Variable(VariableExpression {
                                variable_id: 2,
                            })),
                        })),
                        then_expr: Box::new(Expression::Variable(VariableExpression {
                            variable_id: 1,
                        })),
                        else_expr: Box::new(Expression::Variable(VariableExpression {
                            variable_id: 2,
                        })),
                    })),
                })),
            })),
        },
        // 4. sign: 数値の符号 (-1, 0, 1)
        ModulePartEntry {
            name: "sign".into(),
            part_type: Some(PartType::Function {
                parameter: Box::new(PartType::Number),
                return_type: Box::new(PartType::Number),
            }),
            description: Description::localized(vec![
                (
                    "en",
                    "Return sign of a number: 1 if positive, -1 if negative, 0 if zero",
                ),
                (
                    "ja",
                    "数値の符号を返します (正なら 1, 負なら -1, ゼロなら 0)",
                ),
            ]),
            expression: Some(Expression::Function(FunctionExpression {
                parameter_id: 1,
                parameter_name: "x".into(),
                body: Box::new(Expression::If(IfExpression {
                    condition: Box::new(Expression::GreaterThan(GreaterThanExpression {
                        left: Box::new(Expression::Variable(VariableExpression { variable_id: 1 })),
                        right: Box::new(Expression::Number(NumberExpression { value: 0 })),
                    })),
                    then_expr: Box::new(Expression::Number(NumberExpression { value: 1 })),
                    else_expr: Box::new(Expression::If(IfExpression {
                        condition: Box::new(Expression::LessThan(LessThanExpression {
                            left: Box::new(Expression::Variable(VariableExpression {
                                variable_id: 1,
                            })),
                            right: Box::new(Expression::Number(NumberExpression { value: 0 })),
                        })),
                        then_expr: Box::new(Expression::Number(NumberExpression { value: -1 })),
                        else_expr: Box::new(Expression::Number(NumberExpression { value: 0 })),
                    })),
                })),
            })),
        },
        // 5. bool-to-string: 真偽値の文字列化
        ModulePartEntry {
            name: "bool-to-string".into(),
            part_type: Some(PartType::Function {
                parameter: Box::new(PartType::Boolean),
                return_type: Box::new(PartType::String),
            }),
            description: Description::localized(vec![
                ("en", "Convert boolean to string (\"true\" or \"false\")"),
                (
                    "ja",
                    "真偽値を文字列 (\"true\" または \"false\") に変換します",
                ),
            ]),
            expression: Some(Expression::Function(FunctionExpression {
                parameter_id: 1,
                parameter_name: "b".into(),
                body: Box::new(Expression::If(IfExpression {
                    condition: Box::new(Expression::Variable(VariableExpression {
                        variable_id: 1,
                    })),
                    then_expr: Box::new(Expression::String(StringExpression {
                        value: "true".into(),
                    })),
                    else_expr: Box::new(Expression::String(StringExpression {
                        value: "false".into(),
                    })),
                })),
            })),
        },
        // 6. list-is-empty: リストが空かどうか判定
        ModulePartEntry {
            name: "list-is-empty".into(),
            part_type: None,
            description: Description::localized(vec![
                ("en", "Check if a list is empty"),
                ("ja", "リストが空かどうかを判定します"),
            ]),
            expression: Some(Expression::Function(FunctionExpression {
                parameter_id: 1,
                parameter_name: "xs".into(),
                body: Box::new(Expression::Equal(EqualExpression {
                    left: Box::new(Expression::ListLength(ListLengthExpression {
                        value: Box::new(Expression::Variable(VariableExpression {
                            variable_id: 1,
                        })),
                    })),
                    right: Box::new(Expression::Number(NumberExpression { value: 0 })),
                })),
            })),
        },
        // 7. list-head: リストの先頭要素を取得
        ModulePartEntry {
            name: "list-head".into(),
            part_type: None,
            description: Description::localized(vec![
                ("en", "Get the first item of a list"),
                ("ja", "リストの先頭要素を取得します"),
            ]),
            expression: Some(Expression::Function(FunctionExpression {
                parameter_id: 1,
                parameter_name: "xs".into(),
                body: Box::new(Expression::ListGet(ListGetExpression {
                    list: Box::new(Expression::Variable(VariableExpression { variable_id: 1 })),
                    index: Box::new(Expression::Number(NumberExpression { value: 0 })),
                })),
            })),
        },
    ]
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_std_parts_definitions() {
        let parts = create_std_module_parts();
        assert_eq!(parts.len(), 7);
        let names: Vec<&str> = parts.iter().map(|p| p.name.as_ref()).collect();
        assert_eq!(
            names,
            vec![
                "abs",
                "min",
                "max",
                "sign",
                "bool-to-string",
                "list-is-empty",
                "list-head"
            ]
        );
        for part in &parts {
            assert!(
                part.expression.is_some(),
                "Part {} must have an expression",
                part.name
            );
            assert!(part.description.get("ja").is_some());
            assert!(part.description.get("en").is_some());
        }
    }
}
