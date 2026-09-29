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
