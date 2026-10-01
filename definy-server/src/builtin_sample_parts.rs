use definy_event::EventHashId;
use definy_event::event::{
    AddExpression, Description, DivideExpression, EqualExpression, Expression, IfExpression,
    LetExpression, ListLiteralExpression, MatchArm, MatchExpression, ModulePartEntry,
    MultiplyExpression, NumberExpression, PartType, RemainderExpression, StringConcatExpression,
    StringExpression, TypeUnionExpression, TypeUnionVariant, VariableExpression, VariantExpression,
};

pub fn create_sample_module_parts(core_module_id: &EventHashId) -> Vec<ModulePartEntry> {
    vec![
        ModulePartEntry {
            name: "triangle-area".into(),
            part_type: Some(PartType::Number),
            description: Description::localized(vec![
                ("en", "Calculate the area of a triangle (base 10, height 5)"),
                (
                    "ja",
                    "三角形の面積を計算するサンプルプログラム (底辺 10, 高さ 5)",
                ),
            ]),
            content_hash: None,
            expression: Some(Expression::Let(LetExpression {
                variable_id: 1,
                variable_name: "base".into(),
                value: Box::new(Expression::Number(NumberExpression { value: 10 })),
                body: Box::new(Expression::Let(LetExpression {
                    variable_id: 2,
                    variable_name: "height".into(),
                    value: Box::new(Expression::Number(NumberExpression { value: 5 })),
                    body: Box::new(Expression::Divide(DivideExpression {
                        left: Box::new(Expression::Multiply(MultiplyExpression {
                            left: Box::new(Expression::Variable(VariableExpression {
                                variable_id: 1,
                            })),
                            right: Box::new(Expression::Variable(VariableExpression {
                                variable_id: 2,
                            })),
                        })),
                        right: Box::new(Expression::Number(NumberExpression { value: 2 })),
                    })),
                })),
            })),
        },
        ModulePartEntry {
            name: "greet".into(),
            part_type: Some(PartType::String),
            description: Description::localized(vec![
                ("en", "Greeting message using string concatenation"),
                ("ja", "文字列結合を使った挨拶メッセージの生成サンプル"),
            ]),
            content_hash: None,
            expression: Some(Expression::StringConcat(StringConcatExpression {
                left: Box::new(Expression::String(StringExpression {
                    value: "Hello, ".into(),
                })),
                right: Box::new(Expression::String(StringExpression {
                    value: "definy!".into(),
                })),
            })),
        },
        ModulePartEntry {
            name: "is-even-sample".into(),
            part_type: Some(PartType::String),
            description: Description::localized(vec![
                (
                    "en",
                    "Check if a number is even using conditional expression",
                ),
                ("ja", "剰余算と条件分岐による偶数・奇数判定サンプル (n = 4)"),
            ]),
            content_hash: None,
            expression: Some(Expression::Let(LetExpression {
                variable_id: 1,
                variable_name: "n".into(),
                value: Box::new(Expression::Number(NumberExpression { value: 4 })),
                body: Box::new(Expression::If(IfExpression {
                    condition: Box::new(Expression::Equal(EqualExpression {
                        left: Box::new(Expression::Remainder(RemainderExpression {
                            left: Box::new(Expression::Variable(VariableExpression {
                                variable_id: 1,
                            })),
                            right: Box::new(Expression::Number(NumberExpression { value: 2 })),
                        })),
                        right: Box::new(Expression::Number(NumberExpression { value: 0 })),
                    })),
                    then_expr: Box::new(Expression::String(StringExpression {
                        value: "even".into(),
                    })),
                    else_expr: Box::new(Expression::String(StringExpression {
                        value: "odd".into(),
                    })),
                })),
            })),
        },
        ModulePartEntry {
            name: "prime-numbers".into(),
            part_type: Some(PartType::List(Box::new(PartType::Number))),
            description: Description::localized(vec![
                ("en", "List literal containing prime numbers"),
                ("ja", "素数のリストリテラルサンプル [2, 3, 5, 7, 11]"),
            ]),
            content_hash: None,
            expression: Some(Expression::ListLiteral(ListLiteralExpression {
                items: vec![
                    Expression::Number(NumberExpression { value: 2 }),
                    Expression::Number(NumberExpression { value: 3 }),
                    Expression::Number(NumberExpression { value: 5 }),
                    Expression::Number(NumberExpression { value: 7 }),
                    Expression::Number(NumberExpression { value: 11 }),
                ],
            })),
        },
        ModulePartEntry {
            name: "option-number".into(),
            part_type: Some(PartType::Type),
            description: Description::localized(vec![
                ("en", "Option type for numbers (none or some(number))"),
                ("ja", "数値用の Option 型 (none または some(number))"),
            ]),
            content_hash: None,
            expression: Some(Expression::TypeUnion(TypeUnionExpression {
                variants: vec![
                    TypeUnionVariant {
                        tag: "none".into(),
                        payload_type: None,
                    },
                    TypeUnionVariant {
                        tag: "some".into(),
                        payload_type: Some(Box::new(Expression::TypeNumber)),
                    },
                ],
            })),
        },
        ModulePartEntry {
            name: "match-option-sample".into(),
            part_type: Some(PartType::Number),
            description: Description::localized(vec![
                ("en", "Pattern match sample: unwrap some(100) and add 23"),
                (
                    "ja",
                    "パターンマッチのサンプル: some(100) を分解して 23 を加算 (結果: 123)",
                ),
            ]),
            content_hash: None,
            expression: Some(Expression::Match(MatchExpression {
                target: Box::new(Expression::Variant(VariantExpression {
                    tag: "some".into(),
                    payload: Some(Box::new(Expression::Number(NumberExpression {
                        value: 100,
                    }))),
                    type_part_definition_event_hash: None,
                })),
                arms: vec![
                    MatchArm {
                        tag: "some".into(),
                        variable_id: Some(1),
                        variable_name: Some("val".into()),
                        body: Box::new(Expression::Add(AddExpression {
                            left: Box::new(Expression::Variable(VariableExpression {
                                variable_id: 1,
                            })),
                            right: Box::new(Expression::Number(NumberExpression { value: 23 })),
                        })),
                    },
                    MatchArm {
                        tag: "none".into(),
                        variable_id: Some(0),
                        variable_name: None,
                        body: Box::new(Expression::Number(NumberExpression { value: 0 })),
                    },
                ],
                default: None,
            })),
        },
        crate::builtin_expression_type::create_sample_ast_calc_part(core_module_id),
    ]
}
