use super::engine::*;
use super::types::*;
use crate::app_state::PathStep;
use definy_event::event::*;

#[test]
fn test_simple_number_layout() {
    let expr = Expression::Number(NumberExpression { value: 42 });
    let node = expression_to_layout_node(&expr, "root");
    let options = LayoutOptions::default();
    let result = compute_layout(&node, &options);

    assert_eq!(result.node_count, 1);
    assert_eq!(result.max_depth, 1);
    assert_eq!(result.root.layout_mode, LayoutMode::Inline);
    assert!(result.total_width > 0.0);
}

#[test]
fn test_width_constrained_multiline_switching() {
    // (1 + 2) * (3 + 4)
    let expr = Expression::Multiply(MultiplyExpression {
        left: Box::new(Expression::Add(AddExpression {
            left: Box::new(Expression::Number(NumberExpression { value: 100000 })),
            right: Box::new(Expression::Number(NumberExpression { value: 200000 })),
        })),
        right: Box::new(Expression::Add(AddExpression {
            left: Box::new(Expression::Number(NumberExpression { value: 300000 })),
            right: Box::new(Expression::Number(NumberExpression { value: 400000 })),
        })),
    });

    let node = expression_to_layout_node(&expr, "root");

    // 広い幅 (800px) ならインライン
    let wide_options = LayoutOptions {
        max_width: 800.0,
        ..Default::default()
    };
    let wide_res = compute_layout(&node, &wide_options);
    assert_eq!(wide_res.root.layout_mode, LayoutMode::Inline);

    // 狭い幅 (100px) なら複数行 (Multiline) に切り替わる
    let narrow_options = LayoutOptions {
        max_width: 100.0,
        ..Default::default()
    };
    let narrow_res = compute_layout(&node, &narrow_options);
    assert_eq!(narrow_res.root.layout_mode, LayoutMode::Multiline);
}

#[test]
fn test_spreadsheet_table_detection() {
    // [{ a: 1, b: 2 }, { a: 3, b: 4 }]
    let expr = Expression::ListLiteral(ListLiteralExpression {
        items: vec![
            Expression::TypeLiteral(TypeLiteralExpression {
                items: vec![
                    TypeLiteralItemExpression {
                        key: "a".into(),
                        value: Box::new(Expression::Number(NumberExpression { value: 1 })),
                    },
                    TypeLiteralItemExpression {
                        key: "b".into(),
                        value: Box::new(Expression::Number(NumberExpression { value: 2 })),
                    },
                ],
            }),
            Expression::TypeLiteral(TypeLiteralExpression {
                items: vec![
                    TypeLiteralItemExpression {
                        key: "a".into(),
                        value: Box::new(Expression::Number(NumberExpression { value: 3 })),
                    },
                    TypeLiteralItemExpression {
                        key: "b".into(),
                        value: Box::new(Expression::Number(NumberExpression { value: 4 })),
                    },
                ],
            }),
        ],
    });

    let node = expression_to_layout_node(&expr, "root");
    assert_eq!(node.kind, NodeKind::Table);
    assert_eq!(node.table_headers, vec!["a", "b"]);

    let options = LayoutOptions::default();
    let res = compute_layout(&node, &options);
    assert_eq!(res.root.columns_width.len(), 2);
}

#[test]
fn test_spreadsheet_table_reordered_keys() {
    // [{ a: 1, b: 2 }, { b: 4, a: 3 }] (キー順序が逆)
    let expr = Expression::ListLiteral(ListLiteralExpression {
        items: vec![
            Expression::TypeLiteral(TypeLiteralExpression {
                items: vec![
                    TypeLiteralItemExpression {
                        key: "a".into(),
                        value: Box::new(Expression::Number(NumberExpression { value: 1 })),
                    },
                    TypeLiteralItemExpression {
                        key: "b".into(),
                        value: Box::new(Expression::Number(NumberExpression { value: 2 })),
                    },
                ],
            }),
            Expression::TypeLiteral(TypeLiteralExpression {
                items: vec![
                    TypeLiteralItemExpression {
                        key: "b".into(),
                        value: Box::new(Expression::Number(NumberExpression { value: 4 })),
                    },
                    TypeLiteralItemExpression {
                        key: "a".into(),
                        value: Box::new(Expression::Number(NumberExpression { value: 3 })),
                    },
                ],
            }),
        ],
    });

    let node = expression_to_layout_node(&expr, "root");
    assert_eq!(node.kind, NodeKind::Table);
    assert_eq!(node.table_headers, vec!["a", "b"]);
    let options = LayoutOptions::default();
    let res = compute_layout(&node, &options);
    assert_eq!(res.root.columns_width.len(), 2);
}

#[test]
fn test_expression_to_layout_node_paths() {
    let expr = Expression::Add(AddExpression {
        left: Box::new(Expression::Number(NumberExpression { value: 10 })),
        right: Box::new(Expression::String(StringExpression {
            value: "hello".into(),
        })),
    });
    let node = expression_to_layout_node(&expr, "root");
    assert_eq!(node.path, Vec::<PathStep>::new());
    assert_eq!(node.children.len(), 2);
    assert_eq!(node.children[0].path, vec![PathStep::Left]);
    assert_eq!(node.children[1].path, vec![PathStep::Right]);
}

#[test]
fn test_record_get_layout_node() {
    let expr = Expression::RecordGet(RecordGetExpression {
        record: Box::new(Expression::Number(NumberExpression { value: 123 })),
        key: "field_a".into(),
    });
    let node = expression_to_layout_node(&expr, "root");
    assert_eq!(node.label, ".field_a");
    assert_eq!(node.children.len(), 1);
    assert_eq!(node.children[0].path, vec![PathStep::Record]);
}

#[test]
fn test_call_arguments_are_labeled_with_parameter_names() {
    let expr = Expression::Call(CallExpression {
        function: Box::new(Expression::Variable(VariableExpression { variable_id: 1 })),
        arguments: vec![
            CallArgument {
                name: "x".into(),
                value: Box::new(Expression::Number(NumberExpression { value: 1 })),
            },
            CallArgument {
                name: "y".into(),
                value: Box::new(Expression::Number(NumberExpression { value: 2 })),
            },
        ],
    });

    // 型情報が無いときは引数に保存された名前を表示する
    let node = expression_to_layout_node(&expr, "root");
    let labels: Vec<&str> = node.children[1..]
        .iter()
        .map(|c| c.label.as_str())
        .collect();
    assert_eq!(labels, vec!["x:", "y:"]);
    assert_eq!(node.children[1].path, vec![PathStep::CallArgument(0)]);
    assert_eq!(node.children[1].children[0].label, "1");

    // 型解析で分かった呼び出し先のパラメーター名を優先する
    let names =
        CallParameterNames::from([(Vec::new(), vec!["width".to_string(), "height".to_string()])]);
    let node = expression_to_layout_node_with_names(&expr, "root", &names, &PartNames::new());
    let labels: Vec<&str> = node.children[1..]
        .iter()
        .map(|c| c.label.as_str())
        .collect();
    assert_eq!(labels, vec!["width:", "height:"]);
}

fn var(variable_id: i64) -> Box<Expression> {
    Box::new(Expression::Variable(VariableExpression { variable_id }))
}

#[test]
fn test_variables_are_labeled_with_binding_names() {
    // fn(width) => let area = width; inner = fn(width2 は同じ ID 0 で別名) => width2 in area
    let expr = Expression::Function(FunctionExpression {
        parameters: vec![FunctionParameter {
            parameter_id: 0,
            parameter_name: "width".into(),
        }],
        body: Box::new(Expression::Let(LetExpression {
            bindings: vec![
                LetBinding {
                    variable_id: 1,
                    variable_name: "area".into(),
                    value: var(0),
                },
                LetBinding {
                    variable_id: 2,
                    variable_name: "inner".into(),
                    value: Box::new(Expression::Function(FunctionExpression {
                        parameters: vec![FunctionParameter {
                            parameter_id: 0,
                            parameter_name: "shadow".into(),
                        }],
                        body: var(0),
                    })),
                },
            ],
            body: var(1),
        })),
    });
    let node = expression_to_layout_node(&expr, "root");
    let let_node = node.children.last().unwrap();
    let bindings = &let_node.children[0].children;
    assert_eq!(bindings[0].children[1].label, "width");
    // 内側の関数のパラメーターが同じ ID の外側の変数を隠す
    assert_eq!(bindings[1].children[1].children[1].label, "shadow");
    assert_eq!(let_node.children[1].label, "area");
}

#[test]
fn test_unbound_or_unnamed_variable_falls_back_to_id() {
    let node = expression_to_layout_node(&var(7), "root");
    assert_eq!(node.label, "var_7");

    let expr = Expression::Let(LetExpression {
        bindings: vec![LetBinding {
            variable_id: 3,
            variable_name: "".into(),
            value: Box::new(Expression::Number(NumberExpression { value: 0 })),
        }],
        body: var(3),
    });
    let node = expression_to_layout_node(&expr, "root");
    assert_eq!(node.children[1].label, "var_3");
}

#[test]
fn test_match_arm_variable_is_labeled() {
    let expr = Expression::Match(MatchExpression {
        target: var(0),
        arms: vec![
            MatchArm {
                tag: "some".into(),
                variable_id: Some(5),
                variable_name: Some("value".into()),
                body: var(5),
            },
            MatchArm {
                tag: "none".into(),
                variable_id: None,
                variable_name: None,
                body: Box::new(Expression::Number(NumberExpression { value: 0 })),
            },
        ],
        default: None,
    });
    let node = expression_to_layout_node(&expr, "root");
    assert_eq!(node.children[1].label, "some(value) =>");
    assert_eq!(node.children[1].children[0].label, "value");
    assert_eq!(node.children[2].label, "none =>");
}

#[test]
fn test_part_reference_is_labeled_with_part_name() {
    let hash = definy_event::EventHashId::from_bytes(b"part");
    let expr = Expression::PartReference(PartReferenceExpression::new(hash.clone()));

    let node = expression_to_layout_node(&expr, "root");
    assert!(node.label.starts_with("@part:"));

    let part_names = PartNames::from([(hash, "type-check".to_string())]);
    let node = expression_to_layout_node_with_names(
        &expr,
        "root",
        &CallParameterNames::new(),
        &part_names,
    );
    assert_eq!(node.label, "type-check");
}

#[test]
fn test_empty_list_is_labeled_differently_from_list_variable() {
    let expr = Expression::ListLength(ListLengthExpression {
        value: Box::new(Expression::ListLiteral(ListLiteralExpression {
            items: vec![],
        })),
    });
    let node = expression_to_layout_node(&expr, "root");
    assert_eq!(node.children[0].label, "[]");
}
