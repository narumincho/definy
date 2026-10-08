use definy_event::event::*;

/// LEB128 符号なし整数エンコード式 (0..16383 対応)
pub fn leb128_expr(val_expr: Expression) -> Expression {
    Expression::If(IfExpression {
        condition: Box::new(Expression::LessThan(LessThanExpression {
            left: Box::new(val_expr.clone()),
            right: Box::new(Expression::Number(NumberExpression { value: 128 })),
        })),
        then_expr: Box::new(Expression::ListLiteral(ListLiteralExpression {
            items: vec![val_expr.clone()],
        })),
        else_expr: Box::new(Expression::ListLiteral(ListLiteralExpression {
            items: vec![
                Expression::Add(AddExpression {
                    left: Box::new(Expression::Remainder(RemainderExpression {
                        left: Box::new(val_expr.clone()),
                        right: Box::new(Expression::Number(NumberExpression { value: 128 })),
                    })),
                    right: Box::new(Expression::Number(NumberExpression { value: 128 })),
                }),
                Expression::Divide(DivideExpression {
                    left: Box::new(val_expr),
                    right: Box::new(Expression::Number(NumberExpression { value: 128 })),
                }),
            ],
        })),
    })
}

/// 32-bit リトルエンディアン 4 バイト列生成式 (< 65536)
pub fn encode_u32_le_expr(val_expr: Expression) -> Expression {
    Expression::ListLiteral(ListLiteralExpression {
        items: vec![
            Expression::Remainder(RemainderExpression {
                left: Box::new(val_expr.clone()),
                right: Box::new(Expression::Number(NumberExpression { value: 256 })),
            }),
            Expression::Remainder(RemainderExpression {
                left: Box::new(Expression::Divide(DivideExpression {
                    left: Box::new(val_expr),
                    right: Box::new(Expression::Number(NumberExpression { value: 256 })),
                })),
                right: Box::new(Expression::Number(NumberExpression { value: 256 })),
            }),
            Expression::Number(NumberExpression { value: 0 }),
            Expression::Number(NumberExpression { value: 0 }),
        ],
    })
}

/// 64-bit リトルエンディアン 8 バイト列生成式 (< 65536 の非負整数)
pub fn encode_i64_le_expr(val_expr: Expression) -> Expression {
    Expression::ListLiteral(ListLiteralExpression {
        items: vec![
            Expression::Remainder(RemainderExpression {
                left: Box::new(val_expr.clone()),
                right: Box::new(Expression::Number(NumberExpression { value: 256 })),
            }),
            Expression::Remainder(RemainderExpression {
                left: Box::new(Expression::Divide(DivideExpression {
                    left: Box::new(val_expr),
                    right: Box::new(Expression::Number(NumberExpression { value: 256 })),
                })),
                right: Box::new(Expression::Number(NumberExpression { value: 256 })),
            }),
            Expression::Number(NumberExpression { value: 0 }),
            Expression::Number(NumberExpression { value: 0 }),
            Expression::Number(NumberExpression { value: 0 }),
            Expression::Number(NumberExpression { value: 0 }),
            Expression::Number(NumberExpression { value: 0 }),
            Expression::Number(NumberExpression { value: 0 }),
        ],
    })
}

/// 8 バイトアライメントに必要なゼロパディングバイト列生成式
pub fn align8_padding_expr(len_expr: Expression) -> Expression {
    let rem_expr = Expression::Remainder(RemainderExpression {
        left: Box::new(len_expr),
        right: Box::new(Expression::Number(NumberExpression { value: 8 })),
    });

    Expression::If(IfExpression {
        condition: Box::new(Expression::Equal(EqualExpression {
            left: Box::new(rem_expr.clone()),
            right: Box::new(Expression::Number(NumberExpression { value: 0 })),
        })),
        then_expr: Box::new(Expression::ListLiteral(ListLiteralExpression {
            items: vec![],
        })),
        else_expr: Box::new(Expression::If(IfExpression {
            condition: Box::new(Expression::Equal(EqualExpression {
                left: Box::new(rem_expr.clone()),
                right: Box::new(Expression::Number(NumberExpression { value: 6 })),
            })),
            then_expr: Box::new(Expression::ListLiteral(ListLiteralExpression {
                items: vec![
                    Expression::Number(NumberExpression { value: 0 }),
                    Expression::Number(NumberExpression { value: 0 }),
                ],
            })),
            else_expr: Box::new(Expression::If(IfExpression {
                condition: Box::new(Expression::Equal(EqualExpression {
                    left: Box::new(rem_expr.clone()),
                    right: Box::new(Expression::Number(NumberExpression { value: 4 })),
                })),
                then_expr: Box::new(Expression::ListLiteral(ListLiteralExpression {
                    items: vec![Expression::Number(NumberExpression { value: 0 }); 4],
                })),
                else_expr: Box::new(Expression::If(IfExpression {
                    condition: Box::new(Expression::Equal(EqualExpression {
                        left: Box::new(rem_expr.clone()),
                        right: Box::new(Expression::Number(NumberExpression { value: 2 })),
                    })),
                    then_expr: Box::new(Expression::ListLiteral(ListLiteralExpression {
                        items: vec![Expression::Number(NumberExpression { value: 0 }); 6],
                    })),
                    else_expr: Box::new(Expression::ListLiteral(ListLiteralExpression {
                        items: vec![
                            Expression::Number(NumberExpression { value: 0 }),
                            Expression::Number(NumberExpression { value: 0 }),
                        ],
                    })),
                })),
            })),
        })),
    })
}

/// 単一文字列の Data Section (Section 11) を生成
pub fn create_data_section_for_string(s_expr: Expression) -> Expression {
    let bytes_expr = Expression::StringToBytes(StringToBytesExpression {
        value: Box::new(s_expr),
    });

    Expression::Let(LetExpression {
        variable_id: 30,
        variable_name: "bytes".into(),
        value: Box::new(bytes_expr),
        body: Box::new(Expression::Let(LetExpression {
            variable_id: 31,
            variable_name: "str_len".into(),
            value: Box::new(Expression::ListLength(ListLengthExpression {
                value: Box::new(Expression::Variable(VariableExpression { variable_id: 30 })),
            })),
            body: Box::new(Expression::Let(LetExpression {
                variable_id: 32,
                variable_name: "data_len".into(),
                value: Box::new(Expression::Add(AddExpression {
                    left: Box::new(Expression::Variable(VariableExpression { variable_id: 31 })),
                    right: Box::new(Expression::Number(NumberExpression { value: 8 })),
                })),
                body: Box::new({
                    let len_bytes_expr =
                        encode_u32_le_expr(Expression::Variable(VariableExpression {
                            variable_id: 31,
                        }));

                    let static_header = Expression::ListConcat(ListConcatExpression {
                        left: Box::new(Expression::ListLiteral(ListLiteralExpression {
                            items: vec![
                                Expression::Number(NumberExpression { value: 0x02 }),
                                Expression::Number(NumberExpression { value: 0x00 }),
                                Expression::Number(NumberExpression { value: 0x00 }),
                                Expression::Number(NumberExpression { value: 0x00 }),
                            ],
                        })),
                        right: Box::new(len_bytes_expr),
                    });
                    let data_body = Expression::ListConcat(ListConcatExpression {
                        left: Box::new(static_header),
                        right: Box::new(Expression::Variable(VariableExpression {
                            variable_id: 30,
                        })),
                    });

                    wrap_in_active_data_section(
                        Expression::Variable(VariableExpression { variable_id: 32 }),
                        data_body,
                    )
                }),
            })),
        })),
    })
}

/// ペイロードを Active Data Segment (オフセット 1024) として包み、Section 11 を構築
pub fn wrap_in_active_data_section(
    data_len_expr: Expression,
    data_body_expr: Expression,
) -> Expression {
    let seg_prefix = Expression::ListLiteral(ListLiteralExpression {
        items: vec![
            Expression::Number(NumberExpression { value: 0x00 }),
            Expression::Number(NumberExpression { value: 0x41 }),
            Expression::Number(NumberExpression { value: 0x80 }),
            Expression::Number(NumberExpression { value: 0x08 }),
            Expression::Number(NumberExpression { value: 0x0b }),
        ],
    });
    let seg_header = Expression::ListConcat(ListConcatExpression {
        left: Box::new(seg_prefix),
        right: Box::new(leb128_expr(data_len_expr)),
    });
    let full_segment = Expression::ListConcat(ListConcatExpression {
        left: Box::new(seg_header),
        right: Box::new(data_body_expr),
    });

    let sec_payload = Expression::ListConcat(ListConcatExpression {
        left: Box::new(Expression::ListLiteral(ListLiteralExpression {
            items: vec![Expression::Number(NumberExpression { value: 0x01 })],
        })),
        right: Box::new(full_segment),
    });

    Expression::Let(LetExpression {
        variable_id: 33,
        variable_name: "sec_payload".into(),
        value: Box::new(sec_payload),
        body: Box::new(Expression::ListConcat(ListConcatExpression {
            left: Box::new(Expression::ListConcat(ListConcatExpression {
                left: Box::new(Expression::ListLiteral(ListLiteralExpression {
                    items: vec![Expression::Number(NumberExpression { value: 0x0b })],
                })),
                right: Box::new(leb128_expr(Expression::ListLength(ListLengthExpression {
                    value: Box::new(Expression::Variable(VariableExpression { variable_id: 33 })),
                }))),
            })),
            right: Box::new(Expression::Variable(VariableExpression { variable_id: 33 })),
        })),
    })
}

/// レコードフィールドの値オブジェクト (Number, String, Boolean) をエンコードする式
fn encode_record_field_val(val_ast: Expression) -> (Expression, Expression) {
    // 戻り値: (val_block: list<number>, val_size: number)
    let block = Expression::Match(MatchExpression {
        target: Box::new(val_ast),
        arms: vec![
            MatchArm {
                tag: "number".into(),
                variable_id: Some(50),
                variable_name: Some("n".into()),
                // Tag 0 (8 bytes) + 8 bytes i64
                body: Box::new(Expression::ListConcat(ListConcatExpression {
                    left: Box::new(Expression::ListLiteral(ListLiteralExpression {
                        items: vec![Expression::Number(NumberExpression { value: 0 }); 8],
                    })),
                    right: Box::new(encode_i64_le_expr(Expression::Variable(
                        VariableExpression { variable_id: 50 },
                    ))),
                })),
            },
            MatchArm {
                tag: "string".into(),
                variable_id: Some(51),
                variable_name: Some("s".into()),
                // Tag 2 (4 bytes) + len (4 bytes) + bytes + padding
                body: Box::new(Expression::Let(LetExpression {
                    variable_id: 52,
                    variable_name: "s_bytes".into(),
                    value: Box::new(Expression::StringToBytes(StringToBytesExpression {
                        value: Box::new(Expression::Variable(VariableExpression {
                            variable_id: 51,
                        })),
                    })),
                    body: Box::new(Expression::Let(LetExpression {
                        variable_id: 53,
                        variable_name: "s_len".into(),
                        value: Box::new(Expression::ListLength(ListLengthExpression {
                            value: Box::new(Expression::Variable(VariableExpression {
                                variable_id: 52,
                            })),
                        })),
                        body: Box::new(Expression::ListConcat(ListConcatExpression {
                            left: Box::new(Expression::ListConcat(ListConcatExpression {
                                left: Box::new(Expression::ListLiteral(ListLiteralExpression {
                                    items: vec![
                                        Expression::Number(NumberExpression { value: 0x02 }),
                                        Expression::Number(NumberExpression { value: 0x00 }),
                                        Expression::Number(NumberExpression { value: 0x00 }),
                                        Expression::Number(NumberExpression { value: 0x00 }),
                                    ],
                                })),
                                right: Box::new(encode_u32_le_expr(Expression::Variable(
                                    VariableExpression { variable_id: 53 },
                                ))),
                            })),
                            right: Box::new(Expression::ListConcat(ListConcatExpression {
                                left: Box::new(Expression::Variable(VariableExpression {
                                    variable_id: 52,
                                })),
                                right: Box::new(align8_padding_expr(Expression::Variable(
                                    VariableExpression { variable_id: 53 },
                                ))),
                            })),
                        })),
                    })),
                })),
            },
            MatchArm {
                tag: "boolean".into(),
                variable_id: Some(54),
                variable_name: Some("b".into()),
                body: Box::new(Expression::ListConcat(ListConcatExpression {
                    left: Box::new(Expression::ListLiteral(ListLiteralExpression {
                        items: vec![
                            Expression::Number(NumberExpression { value: 0x01 }),
                            Expression::Number(NumberExpression { value: 0x00 }),
                            Expression::Number(NumberExpression { value: 0x00 }),
                            Expression::Number(NumberExpression { value: 0x00 }),
                            Expression::Number(NumberExpression { value: 0x00 }),
                            Expression::Number(NumberExpression { value: 0x00 }),
                            Expression::Number(NumberExpression { value: 0x00 }),
                            Expression::Number(NumberExpression { value: 0x00 }),
                        ],
                    })),
                    right: Box::new(Expression::If(IfExpression {
                        condition: Box::new(Expression::Variable(VariableExpression {
                            variable_id: 54,
                        })),
                        then_expr: Box::new(Expression::ListLiteral(ListLiteralExpression {
                            items: vec![
                                Expression::Number(NumberExpression { value: 1 }),
                                Expression::Number(NumberExpression { value: 0 }),
                                Expression::Number(NumberExpression { value: 0 }),
                                Expression::Number(NumberExpression { value: 0 }),
                                Expression::Number(NumberExpression { value: 0 }),
                                Expression::Number(NumberExpression { value: 0 }),
                                Expression::Number(NumberExpression { value: 0 }),
                                Expression::Number(NumberExpression { value: 0 }),
                            ],
                        })),
                        else_expr: Box::new(Expression::ListLiteral(ListLiteralExpression {
                            items: vec![Expression::Number(NumberExpression { value: 0 }); 8],
                        })),
                    })),
                })),
            },
            MatchArm {
                tag: "_".into(),
                variable_id: Some(55),
                variable_name: Some("_".into()),
                body: Box::new(Expression::ListLiteral(ListLiteralExpression {
                    items: vec![],
                })),
            },
        ],
        default: None,
    });

    let size = Expression::ListLength(ListLengthExpression {
        value: Box::new(block.clone()),
    });

    (block, size)
}

/// レコードフィールドのキー文字列をエンコードする式
fn encode_record_key(key_str_expr: Expression) -> (Expression, Expression) {
    let key_bytes = Expression::StringToBytes(StringToBytesExpression {
        value: Box::new(key_str_expr),
    });

    let block = Expression::Let(LetExpression {
        variable_id: 60,
        variable_name: "k_bytes".into(),
        value: Box::new(key_bytes),
        body: Box::new(Expression::Let(LetExpression {
            variable_id: 61,
            variable_name: "k_len".into(),
            value: Box::new(Expression::ListLength(ListLengthExpression {
                value: Box::new(Expression::Variable(VariableExpression { variable_id: 60 })),
            })),
            body: Box::new(Expression::ListConcat(ListConcatExpression {
                left: Box::new(Expression::ListConcat(ListConcatExpression {
                    left: Box::new(Expression::ListLiteral(ListLiteralExpression {
                        items: vec![
                            Expression::Number(NumberExpression { value: 0x02 }),
                            Expression::Number(NumberExpression { value: 0x00 }),
                            Expression::Number(NumberExpression { value: 0x00 }),
                            Expression::Number(NumberExpression { value: 0x00 }),
                        ],
                    })),
                    right: Box::new(encode_u32_le_expr(Expression::Variable(
                        VariableExpression { variable_id: 61 },
                    ))),
                })),
                right: Box::new(Expression::ListConcat(ListConcatExpression {
                    left: Box::new(Expression::Variable(VariableExpression { variable_id: 60 })),
                    right: Box::new(align8_padding_expr(Expression::Variable(
                        VariableExpression { variable_id: 61 },
                    ))),
                })),
            })),
        })),
    });

    let size = Expression::ListLength(ListLengthExpression {
        value: Box::new(block.clone()),
    });

    (block, size)
}

/// レコード式 (TypeLiteral) の Data Section (Section 11) を生成
pub fn create_data_section_for_record(items_expr: Expression) -> Expression {
    // items は list<{ key: string, value: core.expression }>
    // 2要素のレコード ({ status, body }) または 1要素のレコード ({ body }) を動的に構築
    let item0_expr = Expression::ListGet(ListGetExpression {
        list: Box::new(items_expr.clone()),
        index: Box::new(Expression::Number(NumberExpression { value: 0 })),
    });

    let k0_expr = Expression::RecordGet(RecordGetExpression {
        record: Box::new(item0_expr.clone()),
        key: "key".into(),
    });
    let v0_expr = Expression::RecordGet(RecordGetExpression {
        record: Box::new(item0_expr),
        key: "value".into(),
    });

    let (k0_block, k0_size) = encode_record_key(k0_expr);
    let (v0_block, v0_size) = encode_record_field_val(v0_expr);

    // 2要素用: item1
    let item1_expr = Expression::ListGet(ListGetExpression {
        list: Box::new(items_expr.clone()),
        index: Box::new(Expression::Number(NumberExpression { value: 1 })),
    });
    let k1_expr = Expression::RecordGet(RecordGetExpression {
        record: Box::new(item1_expr.clone()),
        key: "key".into(),
    });
    let v1_expr = Expression::RecordGet(RecordGetExpression {
        record: Box::new(item1_expr),
        key: "value".into(),
    });
    let (k1_block, k1_size) = encode_record_key(k1_expr);
    let (v1_block, v1_size) = encode_record_field_val(v1_expr);

    // 2要素レコードのペイロード組み立て
    // record_header_len = 8 + 2 * 8 = 24
    // k0_ptr = 1024 + 24 = 1048
    // v0_ptr = 1048 + k0_size
    // k1_ptr = v0_ptr + v0_size
    // v1_ptr = k1_ptr + k1_size
    // total_data_len = v1_ptr + v1_size - 1024
    let two_items_payload = Expression::Let(LetExpression {
        variable_id: 70,
        variable_name: "k0_b".into(),
        value: Box::new(k0_block.clone()),
        body: Box::new(Expression::Let(LetExpression {
            variable_id: 71,
            variable_name: "v0_b".into(),
            value: Box::new(v0_block.clone()),
            body: Box::new(Expression::Let(LetExpression {
                variable_id: 72,
                variable_name: "k1_b".into(),
                value: Box::new(k1_block),
                body: Box::new(Expression::Let(LetExpression {
                    variable_id: 73,
                    variable_name: "v1_b".into(),
                    value: Box::new(v1_block),
                    body: Box::new(Expression::Let(LetExpression {
                        variable_id: 74,
                        variable_name: "v0_ptr".into(),
                        value: Box::new(Expression::Add(AddExpression {
                            left: Box::new(Expression::Number(NumberExpression { value: 1048 })),
                            right: Box::new(k0_size.clone()),
                        })),
                        body: Box::new(Expression::Let(LetExpression {
                            variable_id: 75,
                            variable_name: "k1_ptr".into(),
                            value: Box::new(Expression::Add(AddExpression {
                                left: Box::new(Expression::Variable(VariableExpression {
                                    variable_id: 74,
                                })),
                                right: Box::new(v0_size.clone()),
                            })),
                            body: Box::new(Expression::Let(LetExpression {
                                variable_id: 76,
                                variable_name: "v1_ptr".into(),
                                value: Box::new(Expression::Add(AddExpression {
                                    left: Box::new(Expression::Variable(VariableExpression {
                                        variable_id: 75,
                                    })),
                                    right: Box::new(k1_size),
                                })),
                                body: Box::new(Expression::Let(LetExpression {
                                    variable_id: 77,
                                    variable_name: "total_len".into(),
                                    value: Box::new(Expression::Subtract(SubtractExpression {
                                        left: Box::new(Expression::Add(AddExpression {
                                            left: Box::new(Expression::Variable(
                                                VariableExpression { variable_id: 76 },
                                            )),
                                            right: Box::new(v1_size),
                                        })),
                                        right: Box::new(Expression::Number(NumberExpression {
                                            value: 1024,
                                        })),
                                    })),
                                    body: Box::new({
                                        let rec_header =
                                            Expression::ListConcat(ListConcatExpression {
                                                left: Box::new(Expression::ListLiteral(
                                                    ListLiteralExpression {
                                                        items: vec![
                                                            Expression::Number(NumberExpression {
                                                                value: 0x04,
                                                            }),
                                                            Expression::Number(NumberExpression {
                                                                value: 0x00,
                                                            }),
                                                            Expression::Number(NumberExpression {
                                                                value: 0x00,
                                                            }),
                                                            Expression::Number(NumberExpression {
                                                                value: 0x00,
                                                            }),
                                                            Expression::Number(NumberExpression {
                                                                value: 0x02,
                                                            }),
                                                            Expression::Number(NumberExpression {
                                                                value: 0x00,
                                                            }),
                                                            Expression::Number(NumberExpression {
                                                                value: 0x00,
                                                            }),
                                                            Expression::Number(NumberExpression {
                                                                value: 0x00,
                                                            }),
                                                        ],
                                                    },
                                                )),
                                                right: Box::new(Expression::ListConcat(
                                                    ListConcatExpression {
                                                        left: Box::new(encode_u32_le_expr(
                                                            Expression::Number(NumberExpression {
                                                                value: 1048,
                                                            }),
                                                        )),
                                                        right: Box::new(Expression::ListConcat(
                                                            ListConcatExpression {
                                                                left: Box::new(encode_u32_le_expr(
                                                                    Expression::Variable(
                                                                        VariableExpression {
                                                                            variable_id: 74,
                                                                        },
                                                                    ),
                                                                )),
                                                                right: Box::new(
                                                                    Expression::ListConcat(
                                                                        ListConcatExpression {
                                                                            left: Box::new(
                                                                                encode_u32_le_expr(
                                                                                    Expression::Variable(
                                                                                        VariableExpression {
                                                                                            variable_id: 75,
                                                                                        },
                                                                                    ),
                                                                                ),
                                                                            ),
                                                                            right: Box::new(
                                                                                encode_u32_le_expr(
                                                                                    Expression::Variable(
                                                                                        VariableExpression {
                                                                                            variable_id: 76,
                                                                                        },
                                                                                    ),
                                                                                ),
                                                                            ),
                                                                        },
                                                                    ),
                                                                ),
                                                            },
                                                        )),
                                                    },
                                                )),
                                            });

                                        let full_body =
                                            Expression::ListConcat(ListConcatExpression {
                                                left: Box::new(rec_header),
                                                right: Box::new(Expression::ListConcat(
                                                    ListConcatExpression {
                                                        left: Box::new(Expression::Variable(
                                                            VariableExpression { variable_id: 70 },
                                                        )),
                                                        right: Box::new(Expression::ListConcat(
                                                            ListConcatExpression {
                                                                left: Box::new(
                                                                    Expression::Variable(
                                                                        VariableExpression {
                                                                            variable_id: 71,
                                                                        },
                                                                    ),
                                                                ),
                                                                right: Box::new(
                                                                    Expression::ListConcat(
                                                                        ListConcatExpression {
                                                                            left: Box::new(
                                                                                Expression::Variable(
                                                                                    VariableExpression {
                                                                                        variable_id: 72,
                                                                                    },
                                                                                ),
                                                                            ),
                                                                            right: Box::new(
                                                                                Expression::Variable(
                                                                                    VariableExpression {
                                                                                        variable_id: 73,
                                                                                    },
                                                                                ),
                                                                            ),
                                                                        },
                                                                    ),
                                                                ),
                                                            },
                                                        )),
                                                    },
                                                )),
                                            });

                                        wrap_in_active_data_section(
                                            Expression::Variable(VariableExpression {
                                                variable_id: 77,
                                            }),
                                            full_body,
                                        )
                                    }),
                                })),
                            })),
                        })),
                    })),
                })),
            })),
        })),
    });

    // 1要素レコードのペイロード組み立て
    // record_header_len = 8 + 1 * 8 = 16
    // k0_ptr = 1024 + 16 = 1040
    // v0_ptr = 1040 + k0_size
    let one_item_payload = Expression::Let(LetExpression {
        variable_id: 80,
        variable_name: "k0_b".into(),
        value: Box::new(k0_block),
        body: Box::new(Expression::Let(LetExpression {
            variable_id: 81,
            variable_name: "v0_b".into(),
            value: Box::new(v0_block),
            body: Box::new(Expression::Let(LetExpression {
                variable_id: 82,
                variable_name: "v0_ptr".into(),
                value: Box::new(Expression::Add(AddExpression {
                    left: Box::new(Expression::Number(NumberExpression { value: 1040 })),
                    right: Box::new(k0_size),
                })),
                body: Box::new(Expression::Let(LetExpression {
                    variable_id: 83,
                    variable_name: "total_len".into(),
                    value: Box::new(Expression::Subtract(SubtractExpression {
                        left: Box::new(Expression::Add(AddExpression {
                            left: Box::new(Expression::Variable(VariableExpression {
                                variable_id: 82,
                            })),
                            right: Box::new(v0_size),
                        })),
                        right: Box::new(Expression::Number(NumberExpression { value: 1024 })),
                    })),
                    body: Box::new({
                        let rec_header = Expression::ListConcat(ListConcatExpression {
                            left: Box::new(Expression::ListLiteral(ListLiteralExpression {
                                items: vec![
                                    Expression::Number(NumberExpression { value: 0x04 }),
                                    Expression::Number(NumberExpression { value: 0x00 }),
                                    Expression::Number(NumberExpression { value: 0x00 }),
                                    Expression::Number(NumberExpression { value: 0x00 }),
                                    Expression::Number(NumberExpression { value: 0x01 }),
                                    Expression::Number(NumberExpression { value: 0x00 }),
                                    Expression::Number(NumberExpression { value: 0x00 }),
                                    Expression::Number(NumberExpression { value: 0x00 }),
                                ],
                            })),
                            right: Box::new(Expression::ListConcat(ListConcatExpression {
                                left: Box::new(encode_u32_le_expr(Expression::Number(
                                    NumberExpression { value: 1040 },
                                ))),
                                right: Box::new(encode_u32_le_expr(Expression::Variable(
                                    VariableExpression { variable_id: 82 },
                                ))),
                            })),
                        });

                        let full_body = Expression::ListConcat(ListConcatExpression {
                            left: Box::new(rec_header),
                            right: Box::new(Expression::ListConcat(ListConcatExpression {
                                left: Box::new(Expression::Variable(VariableExpression {
                                    variable_id: 80,
                                })),
                                right: Box::new(Expression::Variable(VariableExpression {
                                    variable_id: 81,
                                })),
                            })),
                        });

                        wrap_in_active_data_section(
                            Expression::Variable(VariableExpression { variable_id: 83 }),
                            full_body,
                        )
                    }),
                })),
            })),
        })),
    });

    Expression::If(IfExpression {
        condition: Box::new(Expression::Equal(EqualExpression {
            left: Box::new(Expression::ListLength(ListLengthExpression {
                value: Box::new(items_expr),
            })),
            right: Box::new(Expression::Number(NumberExpression { value: 1 })),
        })),
        then_expr: Box::new(one_item_payload),
        else_expr: Box::new(two_items_payload),
    })
}
