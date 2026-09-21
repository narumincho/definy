use definy_event::event::Expression;

use super::types::{LayoutMode, LayoutNode, LayoutOptions, LayoutResult, NodeKind};

/// AST (Expression) をレイアウトノード木に変換する
pub fn expression_to_layout_node(expr: &Expression, id_prefix: &str) -> LayoutNode {
    match expr {
        Expression::Number(num) => {
            LayoutNode::new(id_prefix, num.value.to_string(), NodeKind::LiteralNumber)
        }
        Expression::String(str_expr) => LayoutNode::new(
            id_prefix,
            format!("\"{}\"", str_expr.value),
            NodeKind::LiteralString,
        ),
        Expression::Boolean(b) => LayoutNode::new(
            id_prefix,
            if b.value { "true" } else { "false" },
            NodeKind::LiteralBoolean,
        ),
        Expression::TypeNumber => LayoutNode::new(id_prefix, "Number", NodeKind::Keyword),
        Expression::TypeString => LayoutNode::new(id_prefix, "String", NodeKind::Keyword),
        Expression::TypeBoolean => LayoutNode::new(id_prefix, "Boolean", NodeKind::Keyword),
        Expression::Variable(var) => LayoutNode::new(
            id_prefix,
            format!("var_{}", var.variable_id),
            NodeKind::Identifier,
        ),
        Expression::PartReference(part) => LayoutNode::new(
            id_prefix,
            format!(
                "@part:{}",
                &part.part_definition_event_hash.to_string()[..6]
            ),
            NodeKind::Identifier,
        ),
        Expression::Compiler(builtin) => LayoutNode::new(
            id_prefix,
            format!("[builtin: {:?}]", builtin),
            NodeKind::Keyword,
        ),
        Expression::Add(add) => create_binary_op_node(id_prefix, "+", &add.left, &add.right),
        Expression::Subtract(sub) => create_binary_op_node(id_prefix, "-", &sub.left, &sub.right),
        Expression::Multiply(mul) => create_binary_op_node(id_prefix, "*", &mul.left, &mul.right),
        Expression::Divide(div) => create_binary_op_node(id_prefix, "/", &div.left, &div.right),
        Expression::Remainder(rem) => create_binary_op_node(id_prefix, "%", &rem.left, &rem.right),
        Expression::Equal(eq) => create_binary_op_node(id_prefix, "==", &eq.left, &eq.right),
        Expression::NotEqual(ne) => create_binary_op_node(id_prefix, "!=", &ne.left, &ne.right),
        Expression::LessThan(lt) => create_binary_op_node(id_prefix, "<", &lt.left, &lt.right),
        Expression::LessThanOrEqual(le) => {
            create_binary_op_node(id_prefix, "<=", &le.left, &le.right)
        }
        Expression::GreaterThan(gt) => create_binary_op_node(id_prefix, ">", &gt.left, &gt.right),
        Expression::GreaterThanOrEqual(ge) => {
            create_binary_op_node(id_prefix, ">=", &ge.left, &ge.right)
        }
        Expression::And(and) => create_binary_op_node(id_prefix, "&&", &and.left, &and.right),
        Expression::Or(or) => create_binary_op_node(id_prefix, "||", &or.left, &or.right),
        Expression::StringConcat(concat) => {
            create_binary_op_node(id_prefix, "++", &concat.left, &concat.right)
        }
        Expression::ListConcat(concat) => {
            create_binary_op_node(id_prefix, "concat", &concat.left, &concat.right)
        }
        Expression::Not(not_expr) => {
            let child = expression_to_layout_node(&not_expr.value, &format!("{}.val", id_prefix));
            LayoutNode::new(id_prefix, "!", NodeKind::Operator).with_children(vec![child])
        }
        Expression::StringLength(len_expr) => {
            let child = expression_to_layout_node(&len_expr.value, &format!("{}.val", id_prefix));
            LayoutNode::new(id_prefix, "string_length", NodeKind::Identifier)
                .with_children(vec![child])
        }
        Expression::ListLength(len_expr) => {
            let child = expression_to_layout_node(&len_expr.value, &format!("{}.val", id_prefix));
            LayoutNode::new(id_prefix, "list_length", NodeKind::Identifier)
                .with_children(vec![child])
        }
        Expression::StringSlice(slice) => {
            let target = expression_to_layout_node(&slice.value, &format!("{}.target", id_prefix));
            let start = expression_to_layout_node(&slice.start, &format!("{}.start", id_prefix));
            let end = expression_to_layout_node(&slice.end, &format!("{}.end", id_prefix));
            LayoutNode::new(id_prefix, "slice", NodeKind::Identifier)
                .with_children(vec![target, start, end])
        }
        Expression::ListGet(get_expr) => {
            let list = expression_to_layout_node(&get_expr.list, &format!("{}.list", id_prefix));
            let index = expression_to_layout_node(&get_expr.index, &format!("{}.index", id_prefix));
            LayoutNode::new(id_prefix, "get", NodeKind::Identifier).with_children(vec![list, index])
        }
        Expression::ListAppend(append_expr) => {
            let list = expression_to_layout_node(&append_expr.list, &format!("{}.list", id_prefix));
            let item = expression_to_layout_node(&append_expr.item, &format!("{}.item", id_prefix));
            LayoutNode::new(id_prefix, "append", NodeKind::Identifier)
                .with_children(vec![list, item])
        }
        Expression::If(if_expr) => {
            let cond =
                expression_to_layout_node(&if_expr.condition, &format!("{}.cond", id_prefix));
            let then_n =
                expression_to_layout_node(&if_expr.then_expr, &format!("{}.then", id_prefix));
            let else_n =
                expression_to_layout_node(&if_expr.else_expr, &format!("{}.else", id_prefix));
            LayoutNode::new(id_prefix, "if", NodeKind::Block)
                .with_children(vec![cond, then_n, else_n])
        }
        Expression::Let(let_expr) => {
            let name_node = LayoutNode::new(
                format!("{}.var", id_prefix),
                let_expr.variable_name.as_ref(),
                NodeKind::Identifier,
            );
            let val_node =
                expression_to_layout_node(&let_expr.value, &format!("{}.val", id_prefix));
            let body_node =
                expression_to_layout_node(&let_expr.body, &format!("{}.body", id_prefix));
            LayoutNode::new(id_prefix, "let", NodeKind::Block)
                .with_children(vec![name_node, val_node, body_node])
        }
        Expression::Function(func) => {
            let param_node = LayoutNode::new(
                format!("{}.param", id_prefix),
                func.parameter_name.as_ref(),
                NodeKind::Identifier,
            );
            let body_node = expression_to_layout_node(&func.body, &format!("{}.body", id_prefix));
            LayoutNode::new(id_prefix, "fn", NodeKind::Block)
                .with_children(vec![param_node, body_node])
        }
        Expression::Call(call) => {
            let fn_node = expression_to_layout_node(&call.function, &format!("{}.func", id_prefix));
            let arg_node = expression_to_layout_node(&call.argument, &format!("{}.arg", id_prefix));
            LayoutNode::new(id_prefix, "call", NodeKind::Group)
                .with_children(vec![fn_node, arg_node])
        }
        Expression::TypeList(type_list) => {
            let item_type =
                expression_to_layout_node(&type_list.item_type, &format!("{}.item", id_prefix));
            LayoutNode::new(id_prefix, "List", NodeKind::Keyword).with_children(vec![item_type])
        }
        Expression::TypeLiteral(record) => {
            let children = record
                .items
                .iter()
                .enumerate()
                .map(|(i, item)| {
                    let key_prefix = format!("{}.item_{}", id_prefix, i);
                    let val_node = expression_to_layout_node(&item.value, &key_prefix);
                    LayoutNode::new(&key_prefix, item.key.as_ref(), NodeKind::Identifier)
                        .with_children(vec![val_node])
                })
                .collect();
            LayoutNode::new(id_prefix, "record", NodeKind::Group).with_children(children)
        }
        Expression::ListLiteral(list_expr) => {
            // docs/dynamic-layout.md 要件:
            // 全アイテムが同じキー構成のレコードである場合、スプレッドシート（Table）として最適化
            if let Some((headers, table_node)) = try_build_table_node(list_expr, id_prefix) {
                let mut node = table_node;
                node.table_headers = headers;
                node
            } else {
                let children = list_expr
                    .items
                    .iter()
                    .enumerate()
                    .map(|(i, item)| {
                        expression_to_layout_node(item, &format!("{}.item_{}", id_prefix, i))
                    })
                    .collect();
                LayoutNode::new(id_prefix, "list", NodeKind::Group).with_children(children)
            }
        }
        Expression::Constructor(ctor) => {
            let val_node = expression_to_layout_node(&ctor.value, &format!("{}.val", id_prefix));
            let type_hash = ctor.type_part_definition_event_hash.to_string();
            let label = format!("new:{}", &type_hash[..type_hash.len().min(6)]);
            LayoutNode::new(id_prefix, label, NodeKind::Group).with_children(vec![val_node])
        }
        Expression::Variant(variant) => {
            let label = variant.tag.to_string();
            let children = if let Some(payload) = &variant.payload {
                vec![expression_to_layout_node(
                    payload,
                    &format!("{}.payload", id_prefix),
                )]
            } else {
                Vec::new()
            };
            LayoutNode::new(id_prefix, label, NodeKind::Group).with_children(children)
        }
        Expression::TypeFunction(type_func) => {
            let param_node =
                expression_to_layout_node(&type_func.parameter, &format!("{}.param", id_prefix));
            let ret_node =
                expression_to_layout_node(&type_func.return_type, &format!("{}.ret", id_prefix));
            LayoutNode::new(id_prefix, "->", NodeKind::Operator)
                .with_children(vec![param_node, ret_node])
        }
        Expression::TypeUnion(union_expr) => {
            let children = union_expr
                .variants
                .iter()
                .enumerate()
                .map(|(i, v)| {
                    let v_prefix = format!("{}.var_{}", id_prefix, i);
                    if let Some(payload) = &v.payload_type {
                        let p_node = expression_to_layout_node(payload, &v_prefix);
                        LayoutNode::new(&v_prefix, v.tag.as_ref(), NodeKind::Identifier)
                            .with_children(vec![p_node])
                    } else {
                        LayoutNode::new(&v_prefix, v.tag.as_ref(), NodeKind::Identifier)
                    }
                })
                .collect();
            LayoutNode::new(id_prefix, "union", NodeKind::Group).with_children(children)
        }
        Expression::Match(match_expr) => {
            let target_node =
                expression_to_layout_node(&match_expr.target, &format!("{}.target", id_prefix));
            let mut children = vec![target_node];
            for (i, arm) in match_expr.arms.iter().enumerate() {
                let arm_prefix = format!("{}.arm_{}", id_prefix, i);
                let body_node = expression_to_layout_node(&arm.body, &arm_prefix);
                let arm_label = format!("{} =>", arm.tag);
                children.push(
                    LayoutNode::new(&arm_prefix, arm_label, NodeKind::Block)
                        .with_children(vec![body_node]),
                );
            }
            if let Some(default_body) = &match_expr.default {
                let def_prefix = format!("{}.default", id_prefix);
                let body_node = expression_to_layout_node(default_body, &def_prefix);
                children.push(
                    LayoutNode::new(&def_prefix, "_ =>", NodeKind::Block)
                        .with_children(vec![body_node]),
                );
            }
            LayoutNode::new(id_prefix, "match", NodeKind::Block).with_children(children)
        }
    }
}

fn create_binary_op_node(
    id_prefix: &str,
    op: &str,
    left: &Expression,
    right: &Expression,
) -> LayoutNode {
    let left_node = expression_to_layout_node(left, &format!("{}.left", id_prefix));
    let right_node = expression_to_layout_node(right, &format!("{}.right", id_prefix));
    LayoutNode::new(id_prefix, op, NodeKind::Operator).with_children(vec![left_node, right_node])
}

fn try_build_table_node(
    list_expr: &definy_event::event::ListLiteralExpression,
    id_prefix: &str,
) -> Option<(Vec<String>, LayoutNode)> {
    if list_expr.items.is_empty() {
        return None;
    }
    // 最初の要素が TypeLiteral か？
    let first_record = match list_expr.items.first()? {
        Expression::TypeLiteral(rec) => rec,
        _ => return None,
    };
    if first_record.items.is_empty() {
        return None;
    }
    let headers: Vec<String> = first_record
        .items
        .iter()
        .map(|item| item.key.to_string())
        .collect();

    // 他の全要素も同じキー構成か確認
    let mut rows = Vec::new();
    for (row_idx, item) in list_expr.items.iter().enumerate() {
        let rec = match item {
            Expression::TypeLiteral(r) => r,
            _ => return None,
        };
        if rec.items.len() != headers.len() {
            return None;
        }
        let mut row_cells = Vec::new();
        for (col_idx, key) in headers.iter().enumerate() {
            let field = rec.items.iter().find(|f| f.key.as_ref() == key)?;
            let cell_node = expression_to_layout_node(
                &field.value,
                &format!("{}.r{}.c{}", id_prefix, row_idx, col_idx),
            );
            row_cells.push(cell_node);
        }
        let row_node = LayoutNode::new(
            format!("{}.row_{}", id_prefix, row_idx),
            format!("row {}", row_idx),
            NodeKind::Group,
        )
        .with_children(row_cells);
        rows.push(row_node);
    }

    let table_node = LayoutNode::new(id_prefix, "table", NodeKind::Table).with_children(rows);
    Some((headers, table_node))
}

/// レイアウト計算エンジン本体
/// 指定された制約 (max_widthなど) をもとに、ノードの幅・高さ、Inline vs Multiline、テーブル列幅を決定する
pub fn compute_layout(root: &LayoutNode, options: &LayoutOptions) -> LayoutResult {
    let mut computed_root = root.clone();
    layout_recursive(&mut computed_root, options.max_width, options, 0);

    let (node_count, max_depth) = measure_tree_stats(&computed_root, 1);
    let total_width = computed_root.computed_width;
    let total_height = computed_root.computed_height;

    LayoutResult {
        root: computed_root,
        total_width,
        total_height,
        node_count,
        max_depth,
    }
}

fn estimate_text_width(text: &str, char_width: f32) -> f32 {
    let char_count = text.chars().count() as f32;
    // 日本語・全角文字は幅2倍として概算
    let wide_count = text.chars().filter(|c| !c.is_ascii()).count() as f32;
    (char_count + wide_count) * char_width
}

fn layout_recursive(
    node: &mut LayoutNode,
    available_width: f32,
    options: &LayoutOptions,
    depth: usize,
) {
    let label_width =
        estimate_text_width(&node.label, options.char_width) + options.chip_padding_x * 2.0;

    if node.children.is_empty() {
        node.computed_width = label_width.max(20.0);
        node.computed_height = options.line_height;
        node.layout_mode = LayoutMode::Inline;
        return;
    }

    // テーブルノードの場合の特殊処理
    if node.kind == NodeKind::Table {
        layout_table_node(node, available_width, options, depth);
        return;
    }

    // まず「すべて1行（インライン）に並べた場合の必要幅」を試算する
    let mut inline_children_widths = Vec::with_capacity(node.children.len());
    let mut total_inline_child_width = 0.0;
    for child in &node.children {
        let child_inline_w = estimate_inline_width(child, options);
        inline_children_widths.push(child_inline_w);
        total_inline_child_width += child_inline_w;
    }

    // 間隔 (gap: 6px) + 記号・括弧分のマージン
    let gap = 6.0;
    let gaps_total = gap * (node.children.len() as f32);
    let total_inline_width = label_width + total_inline_child_width + gaps_total + 12.0;

    // 幅に収まり、かつ明示的な Block ではない場合は Inline
    let can_fit_inline = total_inline_width <= available_width && node.kind != NodeKind::Block;

    if can_fit_inline {
        node.layout_mode = LayoutMode::Inline;
        node.computed_width = total_inline_width;
        node.computed_height = options.line_height;

        // 各子要素を Inline モードでレイアウト
        for child in &mut node.children {
            layout_recursive(child, available_width, options, depth + 1);
        }
    } else {
        // 収まらない場合は Multiline に切り替え
        node.layout_mode = LayoutMode::Multiline;

        let child_available_width = (available_width - options.indent_size).max(100.0);
        let mut max_child_width: f32 = 0.0;
        let mut total_children_height: f32 = 0.0;

        for child in &mut node.children {
            layout_recursive(child, child_available_width, options, depth + 1);
            max_child_width = max_child_width.max(child.computed_width);
            total_children_height += child.computed_height + 4.0; // 行間 4px
        }

        node.computed_width = (label_width + 10.0).max(max_child_width + options.indent_size);
        node.computed_height = options.line_height + total_children_height + 6.0;
    }
}

/// インラインで配置したときの合計幅を再帰的に試算する
fn estimate_inline_width(node: &LayoutNode, options: &LayoutOptions) -> f32 {
    let label_w =
        estimate_text_width(&node.label, options.char_width) + options.chip_padding_x * 2.0;
    if node.children.is_empty() {
        return label_w.max(20.0);
    }
    let mut sum = label_w + 12.0;
    for child in &node.children {
        sum += estimate_inline_width(child, options) + 6.0;
    }
    sum
}

/// スプレッドシート型（Table）のレイアウト計算
fn layout_table_node(
    node: &mut LayoutNode,
    available_width: f32,
    options: &LayoutOptions,
    depth: usize,
) {
    node.layout_mode = LayoutMode::Multiline;
    let num_columns = node.table_headers.len();
    if num_columns == 0 {
        node.computed_width = 100.0;
        node.computed_height = options.line_height;
        return;
    }

    // 各カラムごとの最大幅を計算（ヘッダー文字列の幅を含む）
    let mut max_col_widths = vec![0.0f32; num_columns];
    for (i, header) in node.table_headers.iter().enumerate() {
        let h_width = estimate_text_width(header, options.char_width) + 16.0;
        max_col_widths[i] = max_col_widths[i].max(h_width);
    }

    for row in &node.children {
        for (col_idx, cell) in row.children.iter().enumerate() {
            if col_idx < num_columns {
                let cell_w = estimate_inline_width(cell, options) + 12.0;
                max_col_widths[col_idx] = max_col_widths[col_idx].max(cell_w);
            }
        }
    }

    // 最小セル幅 60px
    for w in &mut max_col_widths {
        *w = (*w).max(60.0);
    }

    let table_width: f32 = max_col_widths.iter().sum::<f32>() + (num_columns as f32 * 8.0) + 16.0;
    node.columns_width = max_col_widths;
    node.computed_width = table_width.min(available_width.max(table_width));

    // 各セルの再帰レイアウト
    let row_height = options.line_height + 8.0;
    let header_height = options.line_height + 4.0;
    let total_rows_height = header_height + (node.children.len() as f32 * row_height);

    for row in &mut node.children {
        row.computed_height = row_height;
        row.computed_width = table_width;
        row.layout_mode = LayoutMode::Inline;
        for (col_idx, cell) in row.children.iter_mut().enumerate() {
            let col_w = node.columns_width.get(col_idx).copied().unwrap_or(80.0);
            layout_recursive(cell, col_w, options, depth + 1);
        }
    }

    node.computed_height = total_rows_height + 12.0;
}

fn measure_tree_stats(node: &LayoutNode, current_depth: usize) -> (usize, usize) {
    let mut count = 1;
    let mut max_d = current_depth;
    for child in &node.children {
        let (c, d) = measure_tree_stats(child, current_depth + 1);
        count += c;
        max_d = max_d.max(d);
    }
    (count, max_d)
}

#[cfg(test)]
mod tests {
    use super::*;
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
}
