use definy_event::event::*;

#[derive(Clone, Debug, PartialEq)]
pub struct LayoutSample {
    pub id: &'static str,
    pub title_ja: &'static str,
    pub title_en: &'static str,
    pub description_ja: &'static str,
    pub description_en: &'static str,
    pub expression: Expression,
}

pub fn all_samples() -> Vec<LayoutSample> {
    vec![
        LayoutSample {
            id: "simple_arithmetic",
            title_ja: "1. 単純な足し算 (1 + 2)",
            title_en: "1. Simple Addition (1 + 2)",
            description_ja: "最小構成の2項演算。インラインでコンパクトに収まります。",
            description_en: "Minimal binary operation. Compactly fits inline.",
            expression: Expression::Add(AddExpression {
                left: Box::new(Expression::Number(NumberExpression { value: 1 })),
                right: Box::new(Expression::Number(NumberExpression { value: 2 })),
            }),
        },
        LayoutSample {
            id: "nested_arithmetic",
            title_ja: "2. ネストした四則演算 ((1 + 2) * (30 + 400) + 5)",
            title_en: "2. Nested Arithmetic ((1 + 2) * (30 + 400) + 5)",
            description_ja: "幅が広い場合はインライン、幅を狭めると演算子ごとに改行・インデントされます。",
            description_en: "Inline when wide, wraps with indentation when narrow.",
            expression: Expression::Add(AddExpression {
                left: Box::new(Expression::Multiply(MultiplyExpression {
                    left: Box::new(Expression::Add(AddExpression {
                        left: Box::new(Expression::Number(NumberExpression { value: 1 })),
                        right: Box::new(Expression::Number(NumberExpression { value: 2 })),
                    })),
                    right: Box::new(Expression::Add(AddExpression {
                        left: Box::new(Expression::Number(NumberExpression { value: 30 })),
                        right: Box::new(Expression::Number(NumberExpression { value: 400 })),
                    })),
                })),
                right: Box::new(Expression::Number(NumberExpression { value: 5 })),
            }),
        },
        LayoutSample {
            id: "if_expression",
            title_ja: "3. 条件分岐 (if-then-else)",
            title_en: "3. Conditional (if-then-else)",
            description_ja: "条件式、真の場合、偽の場合を構造的に展開表示します。",
            description_en: "Structural display of condition, then, and else branches.",
            expression: Expression::If(IfExpression {
                condition: Box::new(Expression::GreaterThan(GreaterThanExpression {
                    left: Box::new(Expression::Variable(VariableExpression { variable_id: 1 })),
                    right: Box::new(Expression::Number(NumberExpression { value: 10 })),
                })),
                then_expr: Box::new(Expression::String(StringExpression {
                    value: "大きい値 (High)".into(),
                })),
                else_expr: Box::new(Expression::String(StringExpression {
                    value: "小さい値 (Low)".into(),
                })),
            }),
        },
        LayoutSample {
            id: "let_binding",
            title_ja: "4. 変数定義 (let a = 100 in let b = 200 in a + b)",
            title_en: "4. Variable Binding (let a = 100 in let b = 200 in a + b)",
            description_ja: "スコープと変数束縛の階層をインデント付きブロックで表現します。",
            description_en: "Scope and variable binding hierarchy with indentation.",
            expression: Expression::Let(LetExpression {
                variable_id: 1,
                variable_name: "price".into(),
                value: Box::new(Expression::Number(NumberExpression { value: 100 })),
                body: Box::new(Expression::Let(LetExpression {
                    variable_id: 2,
                    variable_name: "tax".into(),
                    value: Box::new(Expression::Number(NumberExpression { value: 10 })),
                    body: Box::new(Expression::Add(AddExpression {
                        left: Box::new(Expression::Variable(VariableExpression { variable_id: 1 })),
                        right: Box::new(Expression::Variable(VariableExpression {
                            variable_id: 2,
                        })),
                    })),
                })),
            }),
        },
        LayoutSample {
            id: "function_and_call",
            title_ja: "5. 関数定義と呼び出し ((fn x -> x * 2) 21)",
            title_en: "5. Function Definition and Call ((fn x -> x * 2) 21)",
            description_ja: "無名関数と実引数の適用関係を表示します。",
            description_en: "Shows lambda abstraction and argument application.",
            expression: Expression::Call(CallExpression {
                function: Box::new(Expression::Function(FunctionExpression {
                    parameter_id: 1,
                    parameter_name: "x".into(),
                    body: Box::new(Expression::Multiply(MultiplyExpression {
                        left: Box::new(Expression::Variable(VariableExpression { variable_id: 1 })),
                        right: Box::new(Expression::Number(NumberExpression { value: 2 })),
                    })),
                })),
                argument: Box::new(Expression::Number(NumberExpression { value: 21 })),
            }),
        },
        LayoutSample {
            id: "spreadsheet_table",
            title_ja: "6. スプレッドシート型 (レコードの2重配列)",
            title_en: "6. Spreadsheet Table (List of Records)",
            description_ja: "docs/dynamic-layout.md の重要要件。各行のキー幅を自動で揃えて表形式で表示します。",
            description_en: "Requirement from docs/dynamic-layout.md: auto-align columns in a grid format.",
            expression: Expression::ListLiteral(ListLiteralExpression {
                items: vec![
                    Expression::TypeLiteral(TypeLiteralExpression {
                        items: vec![
                            TypeLiteralItemExpression {
                                key: "name".into(),
                                value: Box::new(Expression::String(StringExpression {
                                    value: "リンゴ (Apple)".into(),
                                })),
                            },
                            TypeLiteralItemExpression {
                                key: "price".into(),
                                value: Box::new(Expression::Number(NumberExpression {
                                    value: 150,
                                })),
                            },
                            TypeLiteralItemExpression {
                                key: "in_stock".into(),
                                value: Box::new(Expression::Boolean(BooleanExpression {
                                    value: true,
                                })),
                            },
                        ],
                    }),
                    Expression::TypeLiteral(TypeLiteralExpression {
                        items: vec![
                            TypeLiteralItemExpression {
                                key: "name".into(),
                                value: Box::new(Expression::String(StringExpression {
                                    value: "温州みかん (Mandarin Orange)".into(),
                                })),
                            },
                            TypeLiteralItemExpression {
                                key: "price".into(),
                                value: Box::new(Expression::Number(NumberExpression { value: 80 })),
                            },
                            TypeLiteralItemExpression {
                                key: "in_stock".into(),
                                value: Box::new(Expression::Boolean(BooleanExpression {
                                    value: false,
                                })),
                            },
                        ],
                    }),
                    Expression::TypeLiteral(TypeLiteralExpression {
                        items: vec![
                            TypeLiteralItemExpression {
                                key: "name".into(),
                                value: Box::new(Expression::String(StringExpression {
                                    value: "山形産シャインマスカット".into(),
                                })),
                            },
                            TypeLiteralItemExpression {
                                key: "price".into(),
                                value: Box::new(Expression::Number(NumberExpression {
                                    value: 2400,
                                })),
                            },
                            TypeLiteralItemExpression {
                                key: "in_stock".into(),
                                value: Box::new(Expression::Boolean(BooleanExpression {
                                    value: true,
                                })),
                            },
                        ],
                    }),
                ],
            }),
        },
        LayoutSample {
            id: "long_string_concat",
            title_ja: "7. 長い文字列連結 (折り返しテスト)",
            title_en: "7. Long String Concat (Wrap Test)",
            description_ja: "横に非常に長い式。コンテナ幅を縮めるとどのように折り返されるか検証できます。",
            description_en: "Very wide expression. Test how it wraps when container width shrinks.",
            expression: Expression::StringConcat(StringConcatExpression {
                left: Box::new(Expression::String(StringExpression {
                    value: "The quick brown fox jumps over the lazy dog.".into(),
                })),
                right: Box::new(Expression::StringConcat(StringConcatExpression {
                    left: Box::new(Expression::String(StringExpression {
                        value: " いろはにほへと ちりぬるを わかよたれそ つねならむ".into(),
                    })),
                    right: Box::new(Expression::String(StringExpression {
                        value: " 1234567890 ABCDEFGHIJKLMNOPQRSTUVWXYZ".into(),
                    })),
                })),
            }),
        },
    ]
}
