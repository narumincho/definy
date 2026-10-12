use crate::ast_builder::{call_part, fn_expr, fn_type};
use definy_event::EventHashId;
use definy_event::event::{
    AddExpression, AndExpression, Description, EqualExpression, Expression, GreaterThanExpression,
    GreaterThanOrEqualExpression, IfExpression, LessThanExpression, LessThanOrEqualExpression,
    LetExpression, ListGetExpression, ListLengthExpression, ModulePartEntry, NumberExpression,
    PartType, RecordFieldType, StringExpression, StringLengthExpression, StringSliceExpression,
    StringToBytesExpression, SubtractExpression, TypeLiteralExpression, TypeLiteralItemExpression,
    UnionVariantType, VariableExpression, VariantExpression, derive_module_part_id,
};

/// 純粋関数型 Pull 型バイトストリーム (案A) の型定義:
/// `{ initialState: Number, next: (state: Number) -> union<yield({ chunk: List<Number>, nextState: Number }) | done> }`
#[must_use]
pub fn byte_stream_part_type() -> PartType {
    let step_union = PartType::Union(vec![
        UnionVariantType {
            tag: "yield".into(),
            payload: Some(Box::new(PartType::Record(vec![
                RecordFieldType {
                    key: "chunk".into(),
                    value: Box::new(PartType::List(Box::new(PartType::Number))),
                },
                RecordFieldType {
                    key: "nextState".into(),
                    value: Box::new(PartType::Number),
                },
            ]))),
        },
        UnionVariantType {
            tag: "done".into(),
            payload: None,
        },
    ]);

    PartType::Record(vec![
        RecordFieldType {
            key: "initialState".into(),
            value: Box::new(PartType::Number),
        },
        RecordFieldType {
            key: "next".into(),
            value: Box::new(fn_type(&[("state", PartType::Number)], step_union)),
        },
    ])
}

fn yield_step_expr(chunk_expr: Expression, next_state_expr: Expression) -> Expression {
    Expression::Variant(VariantExpression {
        tag: "yield".into(),
        payload: Some(Box::new(Expression::TypeLiteral(TypeLiteralExpression {
            items: vec![
                TypeLiteralItemExpression {
                    key: "chunk".into(),
                    value: Box::new(chunk_expr),
                },
                TypeLiteralItemExpression {
                    key: "nextState".into(),
                    value: Box::new(next_state_expr),
                },
            ],
        }))),
        type_part_definition_event_hash: None,
    })
}

fn done_step_expr() -> Expression {
    Expression::Variant(VariantExpression {
        tag: "done".into(),
        payload: None,
        type_part_definition_event_hash: None,
    })
}

/// 標準ライブラリ `std` モジュールのパーツ一覧を生成します。
pub fn create_std_module_parts(std_module_id: &EventHashId) -> Vec<ModulePartEntry> {
    let string_index_of_hash = derive_module_part_id(std_module_id, "string-index-of");

    vec![
        // 1. abs: 数値の絶対値
        ModulePartEntry {
            name: "abs".into(),
            part_type: Some(fn_type(&[("x", PartType::Number)], PartType::Number)),
            description: Description::localized(vec![
                ("en", "Return absolute value of a number"),
                ("ja", "数値の絶対値を返します"),
            ]),
            content_hash: None,
            expression: Some(fn_expr(
                &[("x", 1)],
                Expression::If(IfExpression {
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
                }),
            )),
        },
        // 2. min: 2つの数値の最小値
        ModulePartEntry {
            name: "min".into(),
            part_type: Some(fn_type(
                &[("a", PartType::Number), ("b", PartType::Number)],
                PartType::Number,
            )),
            description: Description::localized(vec![
                ("en", "Return the smaller of two numbers"),
                ("ja", "2つの数値のうち小さい方を返します"),
            ]),
            content_hash: None,
            expression: Some(fn_expr(
                &[("a", 1), ("b", 2)],
                Expression::If(IfExpression {
                    condition: Box::new(Expression::LessThan(LessThanExpression {
                        left: Box::new(Expression::Variable(VariableExpression { variable_id: 1 })),
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
                }),
            )),
        },
        // 3. max: 2つの数値の最大値
        ModulePartEntry {
            name: "max".into(),
            part_type: Some(fn_type(
                &[("a", PartType::Number), ("b", PartType::Number)],
                PartType::Number,
            )),
            description: Description::localized(vec![
                ("en", "Return the larger of two numbers"),
                ("ja", "2つの数値のうち大きい方を返します"),
            ]),
            content_hash: None,
            expression: Some(fn_expr(
                &[("a", 1), ("b", 2)],
                Expression::If(IfExpression {
                    condition: Box::new(Expression::GreaterThan(GreaterThanExpression {
                        left: Box::new(Expression::Variable(VariableExpression { variable_id: 1 })),
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
                }),
            )),
        },
        // 4. sign: 数値の符号 (-1, 0, 1)
        ModulePartEntry {
            name: "sign".into(),
            part_type: Some(fn_type(&[("x", PartType::Number)], PartType::Number)),
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
            content_hash: None,
            expression: Some(fn_expr(
                &[("x", 1)],
                Expression::If(IfExpression {
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
                }),
            )),
        },
        // 5. bool-to-string: 真偽値の文字列化
        ModulePartEntry {
            name: "bool-to-string".into(),
            part_type: Some(fn_type(&[("b", PartType::Boolean)], PartType::String)),
            description: Description::localized(vec![
                ("en", "Convert boolean to string (\"true\" or \"false\")"),
                (
                    "ja",
                    "真偽値を文字列 (\"true\" または \"false\") に変換します",
                ),
            ]),
            content_hash: None,
            expression: Some(fn_expr(
                &[("b", 1)],
                Expression::If(IfExpression {
                    condition: Box::new(Expression::Variable(VariableExpression {
                        variable_id: 1,
                    })),
                    then_expr: Box::new(Expression::String(StringExpression {
                        value: "true".into(),
                    })),
                    else_expr: Box::new(Expression::String(StringExpression {
                        value: "false".into(),
                    })),
                }),
            )),
        },
        // 6. list-is-empty: リストが空かどうか判定
        ModulePartEntry {
            name: "list-is-empty".into(),
            part_type: Some(fn_type(
                &[("xs", PartType::List(Box::new(PartType::Number)))],
                PartType::Boolean,
            )),
            description: Description::localized(vec![
                ("en", "Check if a list is empty"),
                ("ja", "リストが空かどうかを判定します"),
            ]),
            content_hash: None,
            expression: Some(fn_expr(
                &[("xs", 1)],
                Expression::Equal(EqualExpression {
                    left: Box::new(Expression::ListLength(ListLengthExpression {
                        value: Box::new(Expression::Variable(VariableExpression {
                            variable_id: 1,
                        })),
                    })),
                    right: Box::new(Expression::Number(NumberExpression { value: 0 })),
                }),
            )),
        },
        // 7. list-head: リストの先頭要素を取得
        ModulePartEntry {
            name: "list-head".into(),
            part_type: Some(fn_type(
                &[("xs", PartType::List(Box::new(PartType::Number)))],
                PartType::Number,
            )),
            description: Description::localized(vec![
                ("en", "Get the first item of a list"),
                ("ja", "リストの先頭要素を取得します"),
            ]),
            content_hash: None,
            expression: Some(fn_expr(
                &[("xs", 1)],
                Expression::ListGet(ListGetExpression {
                    list: Box::new(Expression::Variable(VariableExpression { variable_id: 1 })),
                    index: Box::new(Expression::Number(NumberExpression { value: 0 })),
                }),
            )),
        },
        // 8. string-to-utf8-bytes: 文字列を UTF-8 バイト列 (List<Number>) に変換
        ModulePartEntry {
            name: "string-to-utf8-bytes".into(),
            part_type: Some(fn_type(
                &[("text", PartType::String)],
                PartType::List(Box::new(PartType::Number)),
            )),
            description: Description::localized(vec![
                ("en", "Encode a string into a list of UTF-8 bytes"),
                ("ja", "文字列を UTF-8 バイト列 (List<Number>) に変換します"),
            ]),
            content_hash: None,
            expression: Some(fn_expr(
                &[("text", 1)],
                Expression::StringToBytes(StringToBytesExpression {
                    value: Box::new(Expression::Variable(VariableExpression { variable_id: 1 })),
                }),
            )),
        },
        // 9. bytes-to-stream: バイト列 (List<Number>) を純粋関数型 Pull ストリーム (案A) に変換
        ModulePartEntry {
            name: "bytes-to-stream".into(),
            part_type: Some(fn_type(
                &[("bytes", PartType::List(Box::new(PartType::Number)))],
                byte_stream_part_type(),
            )),
            description: Description::localized(vec![
                (
                    "en",
                    "Wrap a byte list into a pull-based byte stream ({ initialState, next })",
                ),
                (
                    "ja",
                    "バイト列 (List<Number>) を Pull 型バイトストリーム ({ initialState, next }) に変換します",
                ),
            ]),
            content_hash: None,
            expression: Some(fn_expr(
                &[("bytes", 1)],
                Expression::TypeLiteral(TypeLiteralExpression {
                    items: vec![
                        TypeLiteralItemExpression {
                            key: "initialState".into(),
                            value: Box::new(Expression::Number(NumberExpression { value: 0 })),
                        },
                        TypeLiteralItemExpression {
                            key: "next".into(),
                            value: Box::new(fn_expr(
                                &[("state", 2)],
                                Expression::If(IfExpression {
                                    condition: Box::new(Expression::And(AndExpression {
                                        left: Box::new(Expression::Equal(EqualExpression {
                                            left: Box::new(Expression::Variable(
                                                VariableExpression { variable_id: 2 },
                                            )),
                                            right: Box::new(Expression::Number(NumberExpression {
                                                value: 0,
                                            })),
                                        })),
                                        right: Box::new(Expression::GreaterThan(
                                            GreaterThanExpression {
                                                left: Box::new(Expression::ListLength(
                                                    ListLengthExpression {
                                                        value: Box::new(Expression::Variable(
                                                            VariableExpression { variable_id: 1 },
                                                        )),
                                                    },
                                                )),
                                                right: Box::new(Expression::Number(
                                                    NumberExpression { value: 0 },
                                                )),
                                            },
                                        )),
                                    })),
                                    then_expr: Box::new(yield_step_expr(
                                        Expression::Variable(VariableExpression { variable_id: 1 }),
                                        Expression::Number(NumberExpression { value: 1 }),
                                    )),
                                    else_expr: Box::new(done_step_expr()),
                                }),
                            )),
                        },
                    ],
                }),
            )),
        },
        // 10. string-to-utf8-stream: 文字列を UTF-8 バイト列の純粋関数型 Pull ストリーム (案A) に変換
        ModulePartEntry {
            name: "string-to-utf8-stream".into(),
            part_type: Some(fn_type(
                &[("text", PartType::String)],
                byte_stream_part_type(),
            )),
            description: Description::localized(vec![
                (
                    "en",
                    "Convert a string into a UTF-8 pull-based byte stream ({ initialState, next })",
                ),
                (
                    "ja",
                    "文字列を UTF-8 バイト列の Pull 型ストリーム ({ initialState, next }) に変換します",
                ),
            ]),
            content_hash: None,
            expression: Some(fn_expr(
                &[("text", 1)],
                Expression::TypeLiteral(TypeLiteralExpression {
                    items: vec![
                        TypeLiteralItemExpression {
                            key: "initialState".into(),
                            value: Box::new(Expression::Number(NumberExpression { value: 0 })),
                        },
                        TypeLiteralItemExpression {
                            key: "next".into(),
                            value: Box::new(fn_expr(
                                &[("state", 2)],
                                Expression::If(IfExpression {
                                    condition: Box::new(Expression::And(AndExpression {
                                        left: Box::new(Expression::Equal(EqualExpression {
                                            left: Box::new(Expression::Variable(
                                                VariableExpression { variable_id: 2 },
                                            )),
                                            right: Box::new(Expression::Number(NumberExpression {
                                                value: 0,
                                            })),
                                        })),
                                        right: Box::new(Expression::GreaterThan(
                                            GreaterThanExpression {
                                                left: Box::new(Expression::StringLength(
                                                    StringLengthExpression {
                                                        value: Box::new(Expression::Variable(
                                                            VariableExpression { variable_id: 1 },
                                                        )),
                                                    },
                                                )),
                                                right: Box::new(Expression::Number(
                                                    NumberExpression { value: 0 },
                                                )),
                                            },
                                        )),
                                    })),
                                    then_expr: Box::new(yield_step_expr(
                                        Expression::StringToBytes(StringToBytesExpression {
                                            value: Box::new(Expression::Variable(
                                                VariableExpression { variable_id: 1 },
                                            )),
                                        }),
                                        Expression::Number(NumberExpression { value: 1 }),
                                    )),
                                    else_expr: Box::new(done_step_expr()),
                                }),
                            )),
                        },
                    ],
                }),
            )),
        },
        // 11. string-list-to-utf8-stream: 文字列リストを1要素ずつ遅延評価して UTF-8 チャンクを送出する Pull ストリーム (案A)
        ModulePartEntry {
            name: "string-list-to-utf8-stream".into(),
            part_type: Some(fn_type(
                &[("chunks", PartType::List(Box::new(PartType::String)))],
                byte_stream_part_type(),
            )),
            description: Description::localized(vec![
                (
                    "en",
                    "Convert a list of string chunks into a multi-chunk UTF-8 pull-based byte stream",
                ),
                (
                    "ja",
                    "文字列のリストを1チャンクずつ UTF-8 バイト列として遅延送出する Pull 型ストリームに変換します",
                ),
            ]),
            content_hash: None,
            expression: Some(fn_expr(
                &[("chunks", 1)],
                Expression::TypeLiteral(TypeLiteralExpression {
                    items: vec![
                        TypeLiteralItemExpression {
                            key: "initialState".into(),
                            value: Box::new(Expression::Number(NumberExpression { value: 0 })),
                        },
                        TypeLiteralItemExpression {
                            key: "next".into(),
                            value: Box::new(fn_expr(
                                &[("state", 2)],
                                Expression::If(IfExpression {
                                    condition: Box::new(Expression::LessThan(LessThanExpression {
                                        left: Box::new(Expression::Variable(VariableExpression {
                                            variable_id: 2,
                                        })),
                                        right: Box::new(Expression::ListLength(
                                            ListLengthExpression {
                                                value: Box::new(Expression::Variable(
                                                    VariableExpression { variable_id: 1 },
                                                )),
                                            },
                                        )),
                                    })),
                                    then_expr: Box::new(yield_step_expr(
                                        Expression::StringToBytes(StringToBytesExpression {
                                            value: Box::new(Expression::ListGet(
                                                ListGetExpression {
                                                    list: Box::new(Expression::Variable(
                                                        VariableExpression { variable_id: 1 },
                                                    )),
                                                    index: Box::new(Expression::Variable(
                                                        VariableExpression { variable_id: 2 },
                                                    )),
                                                },
                                            )),
                                        }),
                                        Expression::Add(AddExpression {
                                            left: Box::new(Expression::Variable(
                                                VariableExpression { variable_id: 2 },
                                            )),
                                            right: Box::new(Expression::Number(NumberExpression {
                                                value: 1,
                                            })),
                                        }),
                                    )),
                                    else_expr: Box::new(done_step_expr()),
                                }),
                            )),
                        },
                    ],
                }),
            )),
        },
        // 12. string-index-of: startIndex 以降で target が最初に出現するバイト位置を返す (見つからない場合は -1)
        ModulePartEntry {
            name: "string-index-of".into(),
            part_type: Some(fn_type(
                &[
                    ("text", PartType::String),
                    ("target", PartType::String),
                    ("startIndex", PartType::Number),
                ],
                PartType::Number,
            )),
            description: Description::localized(vec![
                (
                    "en",
                    "Find first byte index of target substring in text at or after startIndex, or -1 if not found",
                ),
                (
                    "ja",
                    "文字列 text 内の startIndex 以降で target が最初に出現する位置を返します (見つからない場合は -1)",
                ),
            ]),
            content_hash: None,
            expression: Some(fn_expr(
                &[("text", 1), ("target", 2), ("startIndex", 3)],
                Expression::Let(LetExpression {
                    variable_id: 4,
                    variable_name: "textLen".into(),
                    value: Box::new(Expression::StringLength(StringLengthExpression {
                        value: Box::new(Expression::Variable(VariableExpression {
                            variable_id: 1,
                        })),
                    })),
                    body: Box::new(Expression::Let(LetExpression {
                        variable_id: 5,
                        variable_name: "targetLen".into(),
                        value: Box::new(Expression::StringLength(StringLengthExpression {
                            value: Box::new(Expression::Variable(VariableExpression {
                                variable_id: 2,
                            })),
                        })),
                        body: Box::new(Expression::If(IfExpression {
                            condition: Box::new(Expression::GreaterThan(GreaterThanExpression {
                                left: Box::new(Expression::Add(AddExpression {
                                    left: Box::new(Expression::Variable(VariableExpression {
                                        variable_id: 3,
                                    })),
                                    right: Box::new(Expression::Variable(VariableExpression {
                                        variable_id: 5,
                                    })),
                                })),
                                right: Box::new(Expression::Variable(VariableExpression {
                                    variable_id: 4,
                                })),
                            })),
                            then_expr: Box::new(Expression::Number(NumberExpression { value: -1 })),
                            else_expr: Box::new(Expression::If(IfExpression {
                                condition: Box::new(Expression::Equal(EqualExpression {
                                    left: Box::new(Expression::StringSlice(
                                        StringSliceExpression {
                                            value: Box::new(Expression::Variable(
                                                VariableExpression { variable_id: 1 },
                                            )),
                                            start: Box::new(Expression::Variable(
                                                VariableExpression { variable_id: 3 },
                                            )),
                                            end: Box::new(Expression::Add(AddExpression {
                                                left: Box::new(Expression::Variable(
                                                    VariableExpression { variable_id: 3 },
                                                )),
                                                right: Box::new(Expression::Variable(
                                                    VariableExpression { variable_id: 5 },
                                                )),
                                            })),
                                        },
                                    )),
                                    right: Box::new(Expression::Variable(VariableExpression {
                                        variable_id: 2,
                                    })),
                                })),
                                then_expr: Box::new(Expression::Variable(VariableExpression {
                                    variable_id: 3,
                                })),
                                else_expr: Box::new(call_part(
                                    &string_index_of_hash,
                                    &[
                                        (
                                            "text",
                                            Expression::Variable(VariableExpression {
                                                variable_id: 1,
                                            }),
                                        ),
                                        (
                                            "target",
                                            Expression::Variable(VariableExpression {
                                                variable_id: 2,
                                            }),
                                        ),
                                        (
                                            "startIndex",
                                            Expression::Add(AddExpression {
                                                left: Box::new(Expression::Variable(
                                                    VariableExpression { variable_id: 3 },
                                                )),
                                                right: Box::new(Expression::Number(
                                                    NumberExpression { value: 1 },
                                                )),
                                            }),
                                        ),
                                    ],
                                )),
                            })),
                        })),
                    })),
                }),
            )),
        },
        // 13. url-path: URL 文字列からパス部分 (例: "/api/self-host", "/") を抽出する純粋関数
        ModulePartEntry {
            name: "url-path".into(),
            part_type: Some(fn_type(&[("url", PartType::String)], PartType::String)),
            description: Description::localized(vec![
                (
                    "en",
                    "Extract the path component (e.g. \"/api/self-host\") from a URL string",
                ),
                (
                    "ja",
                    "URL 文字列からパス部分 (例: \"/api/self-host\", \"/\") を抽出する純粋関数",
                ),
            ]),
            content_hash: None,
            expression: Some(fn_expr(
                &[("url", 1)],
                Expression::Let(LetExpression {
                    variable_id: 2,
                    variable_name: "schemeIdx".into(),
                    value: Box::new(call_part(
                        &string_index_of_hash,
                        &[
                            (
                                "text",
                                Expression::Variable(VariableExpression { variable_id: 1 }),
                            ),
                            (
                                "target",
                                Expression::String(StringExpression {
                                    value: "://".into(),
                                }),
                            ),
                            (
                                "startIndex",
                                Expression::Number(NumberExpression { value: 0 }),
                            ),
                        ],
                    )),
                    body: Box::new(Expression::Let(LetExpression {
                        variable_id: 3,
                        variable_name: "searchStart".into(),
                        value: Box::new(Expression::If(IfExpression {
                            condition: Box::new(Expression::GreaterThanOrEqual(
                                GreaterThanOrEqualExpression {
                                    left: Box::new(Expression::Variable(VariableExpression {
                                        variable_id: 2,
                                    })),
                                    right: Box::new(Expression::Number(NumberExpression {
                                        value: 0,
                                    })),
                                },
                            )),
                            then_expr: Box::new(Expression::Add(AddExpression {
                                left: Box::new(Expression::Variable(VariableExpression {
                                    variable_id: 2,
                                })),
                                right: Box::new(Expression::Number(NumberExpression { value: 3 })),
                            })),
                            else_expr: Box::new(Expression::Number(NumberExpression { value: 0 })),
                        })),
                        body: Box::new(Expression::Let(LetExpression {
                            variable_id: 4,
                            variable_name: "slashIdx".into(),
                            value: Box::new(call_part(
                                &string_index_of_hash,
                                &[
                                    (
                                        "text",
                                        Expression::Variable(VariableExpression { variable_id: 1 }),
                                    ),
                                    (
                                        "target",
                                        Expression::String(StringExpression { value: "/".into() }),
                                    ),
                                    (
                                        "startIndex",
                                        Expression::Variable(VariableExpression { variable_id: 3 }),
                                    ),
                                ],
                            )),
                            body: Box::new(Expression::Let(LetExpression {
                                variable_id: 5,
                                variable_name: "queryIdx".into(),
                                value: Box::new(call_part(
                                    &string_index_of_hash,
                                    &[
                                        (
                                            "text",
                                            Expression::Variable(VariableExpression {
                                                variable_id: 1,
                                            }),
                                        ),
                                        (
                                            "target",
                                            Expression::String(StringExpression {
                                                value: "?".into(),
                                            }),
                                        ),
                                        (
                                            "startIndex",
                                            Expression::Variable(VariableExpression {
                                                variable_id: 3,
                                            }),
                                        ),
                                    ],
                                )),
                                body: Box::new(Expression::If(IfExpression {
                                    condition: Box::new(Expression::LessThan(LessThanExpression {
                                        left: Box::new(Expression::Variable(VariableExpression {
                                            variable_id: 4,
                                        })),
                                        right: Box::new(Expression::Number(NumberExpression {
                                            value: 0,
                                        })),
                                    })),
                                    then_expr: Box::new(Expression::String(StringExpression {
                                        value: "/".into(),
                                    })),
                                    else_expr: Box::new(Expression::Let(LetExpression {
                                        variable_id: 6,
                                        variable_name: "endIdx".into(),
                                        value: Box::new(Expression::If(IfExpression {
                                            condition: Box::new(Expression::GreaterThanOrEqual(
                                                GreaterThanOrEqualExpression {
                                                    left: Box::new(Expression::Variable(
                                                        VariableExpression { variable_id: 5 },
                                                    )),
                                                    right: Box::new(Expression::Number(
                                                        NumberExpression { value: 0 },
                                                    )),
                                                },
                                            )),
                                            then_expr: Box::new(Expression::Variable(
                                                VariableExpression { variable_id: 5 },
                                            )),
                                            else_expr: Box::new(Expression::StringLength(
                                                StringLengthExpression {
                                                    value: Box::new(Expression::Variable(
                                                        VariableExpression { variable_id: 1 },
                                                    )),
                                                },
                                            )),
                                        })),
                                        body: Box::new(Expression::If(IfExpression {
                                            condition: Box::new(Expression::LessThanOrEqual(
                                                LessThanOrEqualExpression {
                                                    left: Box::new(Expression::Variable(
                                                        VariableExpression { variable_id: 6 },
                                                    )),
                                                    right: Box::new(Expression::Variable(
                                                        VariableExpression { variable_id: 4 },
                                                    )),
                                                },
                                            )),
                                            then_expr: Box::new(Expression::String(
                                                StringExpression { value: "/".into() },
                                            )),
                                            else_expr: Box::new(Expression::StringSlice(
                                                StringSliceExpression {
                                                    value: Box::new(Expression::Variable(
                                                        VariableExpression { variable_id: 1 },
                                                    )),
                                                    start: Box::new(Expression::Variable(
                                                        VariableExpression { variable_id: 4 },
                                                    )),
                                                    end: Box::new(Expression::Variable(
                                                        VariableExpression { variable_id: 6 },
                                                    )),
                                                },
                                            )),
                                        })),
                                    })),
                                })),
                            })),
                        })),
                    })),
                }),
            )),
        },
        // 14. url-query: URL 文字列からクエリ部分 ('?' 以降、なければ "") を抽出する純粋関数
        ModulePartEntry {
            name: "url-query".into(),
            part_type: Some(fn_type(&[("url", PartType::String)], PartType::String)),
            description: Description::localized(vec![
                (
                    "en",
                    "Extract the query string component after '?' (or \"\" if none) from a URL string",
                ),
                (
                    "ja",
                    "URL 文字列からクエリ文字列 ('?' の後ろの部分、存在しない場合は \"\") を抽出する純粋関数",
                ),
            ]),
            content_hash: None,
            expression: Some(fn_expr(
                &[("url", 1)],
                Expression::Let(LetExpression {
                    variable_id: 2,
                    variable_name: "queryIdx".into(),
                    value: Box::new(call_part(
                        &string_index_of_hash,
                        &[
                            (
                                "text",
                                Expression::Variable(VariableExpression { variable_id: 1 }),
                            ),
                            (
                                "target",
                                Expression::String(StringExpression { value: "?".into() }),
                            ),
                            (
                                "startIndex",
                                Expression::Number(NumberExpression { value: 0 }),
                            ),
                        ],
                    )),
                    body: Box::new(Expression::If(IfExpression {
                        condition: Box::new(Expression::LessThan(LessThanExpression {
                            left: Box::new(Expression::Variable(VariableExpression {
                                variable_id: 2,
                            })),
                            right: Box::new(Expression::Number(NumberExpression { value: 0 })),
                        })),
                        then_expr: Box::new(Expression::String(StringExpression {
                            value: "".into(),
                        })),
                        else_expr: Box::new(Expression::StringSlice(StringSliceExpression {
                            value: Box::new(Expression::Variable(VariableExpression {
                                variable_id: 1,
                            })),
                            start: Box::new(Expression::Add(AddExpression {
                                left: Box::new(Expression::Variable(VariableExpression {
                                    variable_id: 2,
                                })),
                                right: Box::new(Expression::Number(NumberExpression { value: 1 })),
                            })),
                            end: Box::new(Expression::StringLength(StringLengthExpression {
                                value: Box::new(Expression::Variable(VariableExpression {
                                    variable_id: 1,
                                })),
                            })),
                        })),
                    })),
                }),
            )),
        },
    ]
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_std_parts_definitions() {
        let dummy_mod = EventHashId::from_bytes(&[1u8; 32]);
        let parts = create_std_module_parts(&dummy_mod);
        assert_eq!(parts.len(), 14);
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
                "list-head",
                "string-to-utf8-bytes",
                "bytes-to-stream",
                "string-to-utf8-stream",
                "string-list-to-utf8-stream",
                "string-index-of",
                "url-path",
                "url-query"
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
