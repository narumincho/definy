use definy_event::EventHashId;
use definy_event::event::{
    AddExpression, CallExpression, Description, Expression, FunctionExpression, IfExpression,
    LessThanExpression, ListAppendExpression, ListConcatExpression, ListLengthExpression,
    ListLiteralExpression, MatchArm, MatchExpression, ModulePartEntry, NumberExpression,
    PartReferenceExpression, PartType, RecordGetExpression, VariableExpression,
    derive_module_part_id,
};

/// WebAssembly 式命令列コンパイラ (`core.compile-expr-instructions`):
/// `expression -> list<number>`
/// 各種式をスタックマシンの Wasm バイトコード列に変換します。
pub fn create_compile_expr_instructions_part(core_module_id: &EventHashId) -> ModulePartEntry {
    let expr_type_part_hash = derive_module_part_id(core_module_id, "expression");
    let compile_instr_hash = derive_module_part_id(core_module_id, "compile-expr-instructions");

    fn compile_sub(compile_hash: &EventHashId, sub_expr: Expression) -> Expression {
        Expression::Call(CallExpression {
            function: Box::new(Expression::PartReference(PartReferenceExpression::new(
                compile_hash.clone(),
            ))),
            argument: Box::new(sub_expr),
        })
    }

    fn concat2(a: Expression, b: Expression) -> Expression {
        Expression::ListConcat(ListConcatExpression {
            left: Box::new(a),
            right: Box::new(b),
        })
    }

    fn concat3(a: Expression, b: Expression, c: Expression) -> Expression {
        concat2(concat2(a, b), c)
    }

    let binary_op = |tag: &'static str, compile_hash: &EventHashId, var_id: i64, op_byte: i64| {
        let left_expr = Expression::RecordGet(RecordGetExpression {
            record: Box::new(Expression::Variable(VariableExpression {
                variable_id: var_id,
            })),
            key: "left".into(),
        });
        let right_expr = Expression::RecordGet(RecordGetExpression {
            record: Box::new(Expression::Variable(VariableExpression {
                variable_id: var_id,
            })),
            key: "right".into(),
        });

        let left_code = compile_sub(compile_hash, left_expr);
        let right_code = compile_sub(compile_hash, right_expr);
        let op_list = Expression::ListLiteral(ListLiteralExpression {
            items: vec![Expression::Number(NumberExpression { value: op_byte })],
        });

        MatchArm {
            tag: tag.into(),
            variable_id: Some(var_id),
            variable_name: Some("bin".into()),
            body: Box::new(concat3(left_code, right_code, op_list)),
        }
    };

    let mut arms = Vec::new();

    // 1. Number literal: i64.const (0x42) + byte
    {
        let num_var_id = 10;
        let num_val = Expression::Variable(VariableExpression {
            variable_id: num_var_id,
        });

        let byte_code = Expression::If(IfExpression {
            condition: Box::new(Expression::LessThan(LessThanExpression {
                left: Box::new(num_val.clone()),
                right: Box::new(Expression::Number(NumberExpression { value: 64 })),
            })),
            then_expr: Box::new(Expression::If(IfExpression {
                condition: Box::new(Expression::LessThan(LessThanExpression {
                    left: Box::new(Expression::Number(NumberExpression { value: -1 })),
                    right: Box::new(num_val.clone()),
                })),
                then_expr: Box::new(Expression::ListLiteral(ListLiteralExpression {
                    items: vec![
                        Expression::Number(NumberExpression { value: 0x42 }),
                        num_val,
                    ],
                })),
                else_expr: Box::new(Expression::ListLiteral(ListLiteralExpression {
                    items: vec![
                        Expression::Number(NumberExpression { value: 0x42 }),
                        Expression::Number(NumberExpression { value: 0x7f }),
                    ],
                })),
            })),
            else_expr: Box::new(Expression::ListLiteral(ListLiteralExpression {
                items: vec![
                    Expression::Number(NumberExpression { value: 0x42 }),
                    Expression::Number(NumberExpression { value: 0x80 }),
                    Expression::Number(NumberExpression { value: 0x01 }),
                ],
            })),
        });

        arms.push(MatchArm {
            tag: "number".into(),
            variable_id: Some(num_var_id),
            variable_name: Some("n".into()),
            body: Box::new(byte_code),
        });
    }

    // 2. Boolean literal: i64.const 1 or 0
    {
        let bool_var_id = 11;
        let bool_val = Expression::Variable(VariableExpression {
            variable_id: bool_var_id,
        });
        let code = Expression::If(IfExpression {
            condition: Box::new(bool_val),
            then_expr: Box::new(Expression::ListLiteral(ListLiteralExpression {
                items: vec![
                    Expression::Number(NumberExpression { value: 0x42 }),
                    Expression::Number(NumberExpression { value: 1 }),
                ],
            })),
            else_expr: Box::new(Expression::ListLiteral(ListLiteralExpression {
                items: vec![
                    Expression::Number(NumberExpression { value: 0x42 }),
                    Expression::Number(NumberExpression { value: 0 }),
                ],
            })),
        });

        arms.push(MatchArm {
            tag: "boolean".into(),
            variable_id: Some(bool_var_id),
            variable_name: Some("b".into()),
            body: Box::new(code),
        });
    }

    // 3. Arithmetic operations
    arms.push(binary_op("add", &compile_instr_hash, 12, 0x7c));
    arms.push(binary_op("subtract", &compile_instr_hash, 13, 0x7d));
    arms.push(binary_op("multiply", &compile_instr_hash, 14, 0x7e));
    arms.push(binary_op("divide", &compile_instr_hash, 15, 0x7f));
    arms.push(binary_op("remainder", &compile_instr_hash, 16, 0x81));

    // 4. Comparison
    arms.push(binary_op("equal", &compile_instr_hash, 17, 0x51));
    arms.push(binary_op("less_than", &compile_instr_hash, 18, 0x53));

    // 5. Conditional: if (result i64) ... else ... end
    {
        let if_var_id = 19;
        let cond_expr = Expression::RecordGet(RecordGetExpression {
            record: Box::new(Expression::Variable(VariableExpression {
                variable_id: if_var_id,
            })),
            key: "condition".into(),
        });
        let then_sub = Expression::RecordGet(RecordGetExpression {
            record: Box::new(Expression::Variable(VariableExpression {
                variable_id: if_var_id,
            })),
            key: "then_expr".into(),
        });
        let else_sub = Expression::RecordGet(RecordGetExpression {
            record: Box::new(Expression::Variable(VariableExpression {
                variable_id: if_var_id,
            })),
            key: "else_expr".into(),
        });

        let cond_code = compile_sub(&compile_instr_hash, cond_expr);
        let then_code = compile_sub(&compile_instr_hash, then_sub);
        let else_code = compile_sub(&compile_instr_hash, else_sub);

        let if_head = Expression::ListLiteral(ListLiteralExpression {
            items: vec![
                Expression::Number(NumberExpression { value: 0x04 }),
                Expression::Number(NumberExpression { value: 0x7e }),
            ],
        });
        let else_sep = Expression::ListLiteral(ListLiteralExpression {
            items: vec![Expression::Number(NumberExpression { value: 0x05 })],
        });
        let end_tail = Expression::ListLiteral(ListLiteralExpression {
            items: vec![Expression::Number(NumberExpression { value: 0x0b })],
        });

        let if_body = concat2(
            cond_code,
            concat2(
                if_head,
                concat2(then_code, concat2(else_sep, concat2(else_code, end_tail))),
            ),
        );

        arms.push(MatchArm {
            tag: "if".into(),
            variable_id: Some(if_var_id),
            variable_name: Some("if_e".into()),
            body: Box::new(if_body),
        });
    }

    // Default: i64.const 0
    arms.push(MatchArm {
        tag: "_".into(),
        variable_id: Some(99),
        variable_name: Some("_".into()),
        body: Box::new(Expression::ListLiteral(ListLiteralExpression {
            items: vec![
                Expression::Number(NumberExpression { value: 0x42 }),
                Expression::Number(NumberExpression { value: 0 }),
            ],
        })),
    });

    let main_expr = Expression::Function(FunctionExpression {
        parameter_id: 0,
        parameter_name: "expr".into(),
        body: Box::new(Expression::Match(MatchExpression {
            target: Box::new(Expression::Variable(VariableExpression { variable_id: 0 })),
            arms,
            default: None,
        })),
    });

    ModulePartEntry {
        name: "compile-expr-instructions".into(),
        part_type: Some(PartType::Function {
            parameter: Box::new(PartType::TypePart(expr_type_part_hash)),
            return_type: Box::new(PartType::List(Box::new(PartType::Number))),
        }),
        description: Description::localized(vec![
            (
                "en",
                "Compile AST expression to WebAssembly stack instructions",
            ),
            (
                "ja",
                "AST 式を WebAssembly スタックマシン命令バイト列にコンパイル",
            ),
        ]),
        content_hash: None,
        expression: Some(main_expr),
    }
}

/// WebAssembly モジュール生成関数 (`core.compile-to-wasm`):
/// `expression -> list<number>`
pub fn create_compile_to_wasm_part(core_module_id: &EventHashId) -> ModulePartEntry {
    let expr_type_part_hash = derive_module_part_id(core_module_id, "expression");
    let compile_instr_hash = derive_module_part_id(core_module_id, "compile-expr-instructions");

    // Wasm Header: [0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00]
    let wasm_header = Expression::ListLiteral(ListLiteralExpression {
        items: vec![
            Expression::Number(NumberExpression { value: 0x00 }),
            Expression::Number(NumberExpression { value: 0x61 }),
            Expression::Number(NumberExpression { value: 0x73 }),
            Expression::Number(NumberExpression { value: 0x6d }),
            Expression::Number(NumberExpression { value: 0x01 }),
            Expression::Number(NumberExpression { value: 0x00 }),
            Expression::Number(NumberExpression { value: 0x00 }),
            Expression::Number(NumberExpression { value: 0x00 }),
        ],
    });

    // Type Section (1): 1 type, () -> i64
    let type_section = Expression::ListLiteral(ListLiteralExpression {
        items: vec![
            Expression::Number(NumberExpression { value: 0x01 }),
            Expression::Number(NumberExpression { value: 0x05 }),
            Expression::Number(NumberExpression { value: 0x01 }),
            Expression::Number(NumberExpression { value: 0x60 }),
            Expression::Number(NumberExpression { value: 0x00 }),
            Expression::Number(NumberExpression { value: 0x01 }),
            Expression::Number(NumberExpression { value: 0x7e }),
        ],
    });

    // Function Section (3): 1 func of type 0
    let func_section = Expression::ListLiteral(ListLiteralExpression {
        items: vec![
            Expression::Number(NumberExpression { value: 0x03 }),
            Expression::Number(NumberExpression { value: 0x02 }),
            Expression::Number(NumberExpression { value: 0x01 }),
            Expression::Number(NumberExpression { value: 0x00 }),
        ],
    });

    // Export Section (7): 1 export "main" pointing to func 0
    let export_section = Expression::ListLiteral(ListLiteralExpression {
        items: vec![
            Expression::Number(NumberExpression { value: 0x07 }),
            Expression::Number(NumberExpression { value: 0x08 }),
            Expression::Number(NumberExpression { value: 0x01 }),
            Expression::Number(NumberExpression { value: 0x04 }),
            Expression::Number(NumberExpression { value: 0x6d }),
            Expression::Number(NumberExpression { value: 0x61 }),
            Expression::Number(NumberExpression { value: 0x69 }),
            Expression::Number(NumberExpression { value: 0x6e }),
            Expression::Number(NumberExpression { value: 0x00 }),
            Expression::Number(NumberExpression { value: 0x00 }),
        ],
    });

    let raw_instructions = Expression::Call(CallExpression {
        function: Box::new(Expression::PartReference(PartReferenceExpression::new(
            compile_instr_hash,
        ))),
        argument: Box::new(Expression::Variable(VariableExpression { variable_id: 0 })),
    });

    let full_instructions = Expression::ListAppend(ListAppendExpression {
        list: Box::new(raw_instructions),
        item: Box::new(Expression::Number(NumberExpression { value: 0x0b })),
    });

    let body = Expression::Let(definy_event::event::LetExpression {
        variable_id: 1,
        variable_name: "full_instr".into(),
        value: Box::new(full_instructions),
        body: Box::new(Expression::Let(definy_event::event::LetExpression {
            variable_id: 2,
            variable_name: "body_len".into(),
            value: Box::new(Expression::Add(AddExpression {
                left: Box::new(Expression::ListLength(ListLengthExpression {
                    value: Box::new(Expression::Variable(VariableExpression { variable_id: 1 })),
                })),
                right: Box::new(Expression::Number(NumberExpression { value: 1 })),
            })),
            body: Box::new(Expression::Let(definy_event::event::LetExpression {
                variable_id: 3,
                variable_name: "code_payload".into(),
                value: Box::new(Expression::ListConcat(ListConcatExpression {
                    left: Box::new(Expression::ListLiteral(ListLiteralExpression {
                        items: vec![
                            Expression::Number(NumberExpression { value: 0x01 }),
                            Expression::Variable(VariableExpression { variable_id: 2 }),
                            Expression::Number(NumberExpression { value: 0x00 }),
                        ],
                    })),
                    right: Box::new(Expression::Variable(VariableExpression { variable_id: 1 })),
                })),
                body: Box::new(Expression::Let(definy_event::event::LetExpression {
                    variable_id: 4,
                    variable_name: "code_section".into(),
                    value: Box::new(Expression::ListConcat(ListConcatExpression {
                        left: Box::new(Expression::ListLiteral(ListLiteralExpression {
                            items: vec![
                                Expression::Number(NumberExpression { value: 0x0a }),
                                Expression::ListLength(ListLengthExpression {
                                    value: Box::new(Expression::Variable(VariableExpression {
                                        variable_id: 3,
                                    })),
                                }),
                            ],
                        })),
                        right: Box::new(Expression::Variable(VariableExpression {
                            variable_id: 3,
                        })),
                    })),
                    body: Box::new(Expression::ListConcat(ListConcatExpression {
                        left: Box::new(wasm_header),
                        right: Box::new(Expression::ListConcat(ListConcatExpression {
                            left: Box::new(type_section),
                            right: Box::new(Expression::ListConcat(ListConcatExpression {
                                left: Box::new(func_section),
                                right: Box::new(Expression::ListConcat(ListConcatExpression {
                                    left: Box::new(export_section),
                                    right: Box::new(Expression::Variable(VariableExpression {
                                        variable_id: 4,
                                    })),
                                })),
                            })),
                        })),
                    })),
                })),
            })),
        })),
    });

    let main_expr = Expression::Function(FunctionExpression {
        parameter_id: 0,
        parameter_name: "expr".into(),
        body: Box::new(body),
    });

    ModulePartEntry {
        name: "compile-to-wasm".into(),
        part_type: Some(PartType::Function {
            parameter: Box::new(PartType::TypePart(expr_type_part_hash)),
            return_type: Box::new(PartType::List(Box::new(PartType::Number))),
        }),
        description: Description::localized(vec![
            (
                "en",
                "Self-hosted WebAssembly compiler compiling expressions to executable Wasm binary",
            ),
            (
                "ja",
                "式 AST を実行可能 Wasm バイナリにコンパイルする自己ホスト WebAssembly コンパイラ",
            ),
        ]),
        content_hash: None,
        expression: Some(main_expr),
    }
}
