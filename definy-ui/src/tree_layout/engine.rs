use std::collections::HashMap;

use crate::app_state::PathStep;
use definy_event::EventHashId;
use definy_event::event::Expression;

use super::types::{LayoutMode, LayoutNode, LayoutOptions, LayoutResult, NodeKind};

fn child_path(base: &[PathStep], step: PathStep) -> Vec<PathStep> {
    let mut p = base.to_vec();
    p.push(step);
    p
}

/// AST (Expression) をレイアウトノード木に変換する
pub fn expression_to_layout_node(expr: &Expression, id_prefix: &str) -> LayoutNode {
    expression_to_layout_node_with_path(expr, id_prefix, &[])
}

/// 関数呼び出しのパスごとの, 各引数に対応するパラメーター名
/// (型解析の [`crate::expression_editor::diagnostics::TypeAnalysis::call_parameter_names`])
pub type CallParameterNames = HashMap<Vec<PathStep>, Vec<String>>;

/// パーツ参照の表示名 (パーツ定義イベントのハッシュ → パーツ名)
/// (型解析の [`crate::expression_editor::diagnostics::TypeAnalysis::part_names`])
pub type PartNames = HashMap<EventHashId, String>;

/// 呼び出し先のパラメーター名とパーツ名を使って AST をレイアウトノード木に変換する.
/// 変数は束縛している関数のパラメーター・let・match の名前で表示する
pub fn expression_to_layout_node_with_names(
    expr: &Expression,
    id_prefix: &str,
    call_parameter_names: &CallParameterNames,
    part_names: &PartNames,
) -> LayoutNode {
    let scope = NameScope::new(call_parameter_names, part_names);
    build_layout_node(expr, id_prefix, &[], &scope)
}

/// 指定したパスにある部分木を, そのパスを持つレイアウトノード木に変換する
pub fn expression_to_layout_node_with_path(
    expr: &Expression,
    id_prefix: &str,
    current_path: &[PathStep],
) -> LayoutNode {
    let call_parameter_names = CallParameterNames::new();
    let part_names = PartNames::new();
    let scope = NameScope::new(&call_parameter_names, &part_names);
    build_layout_node(expr, id_prefix, current_path, &scope)
}

/// レイアウトで ID の代わりに名前を表示するための情報.
/// `variables` はその位置から見える変数 ID → 変数名 (内側の束縛が外側を隠す)
struct NameScope<'a> {
    call_parameter_names: &'a CallParameterNames,
    part_names: &'a PartNames,
    variables: HashMap<i64, Box<str>>,
}

impl<'a> NameScope<'a> {
    fn new(call_parameter_names: &'a CallParameterNames, part_names: &'a PartNames) -> Self {
        Self {
            call_parameter_names,
            part_names,
            variables: HashMap::new(),
        }
    }

    fn get(&self, path: &[PathStep]) -> Option<&Vec<String>> {
        self.call_parameter_names.get(path)
    }

    /// 変数を束縛した内側のスコープを作る
    fn with_variables<'b>(&self, bindings: impl IntoIterator<Item = (i64, &'b str)>) -> Self {
        let mut variables = self.variables.clone();
        for (id, name) in bindings {
            variables.insert(id, name.into());
        }
        Self {
            call_parameter_names: self.call_parameter_names,
            part_names: self.part_names,
            variables,
        }
    }

    /// 変数の表示名. 名前が無い (空文字) かスコープ外なら `var_{id}`
    fn variable_label(&self, variable_id: i64) -> String {
        match self.variables.get(&variable_id) {
            Some(name) if !name.is_empty() => name.to_string(),
            _ => format!("var_{}", variable_id),
        }
    }

    /// パーツ参照の表示名. パーツが見つからなければハッシュの先頭を出す
    fn part_label(&self, hash: &EventHashId) -> String {
        match self.part_names.get(hash) {
            Some(name) => name.clone(),
            None => format!("@part:{}", &hash.to_string()[..6]),
        }
    }
}

fn build_layout_node(
    expr: &Expression,
    id_prefix: &str,
    current_path: &[PathStep],
    names: &NameScope,
) -> LayoutNode {
    let p = current_path.to_vec();
    match expr {
        Expression::Number(num) => {
            LayoutNode::new(id_prefix, num.value.to_string(), NodeKind::LiteralNumber).with_path(p)
        }
        Expression::String(str_expr) => LayoutNode::new(
            id_prefix,
            format!("\"{}\"", str_expr.value),
            NodeKind::LiteralString,
        )
        .with_path(p),
        Expression::Boolean(b) => LayoutNode::new(
            id_prefix,
            if b.value { "true" } else { "false" },
            NodeKind::LiteralBoolean,
        )
        .with_path(p),
        Expression::TypeNumber => {
            LayoutNode::new(id_prefix, "Number", NodeKind::Keyword).with_path(p)
        }
        Expression::TypeString => {
            LayoutNode::new(id_prefix, "String", NodeKind::Keyword).with_path(p)
        }
        Expression::TypeBoolean => {
            LayoutNode::new(id_prefix, "Boolean", NodeKind::Keyword).with_path(p)
        }
        Expression::Variable(var) => LayoutNode::new(
            id_prefix,
            names.variable_label(var.variable_id),
            NodeKind::Identifier,
        )
        .with_path(p),
        Expression::PartReference(part) => LayoutNode::new(
            id_prefix,
            names.part_label(&part.part_definition_event_hash),
            NodeKind::Identifier,
        )
        .with_path(p),
        // 未入力の式
        Expression::Hole => {
            LayoutNode::new(id_prefix, "□".to_string(), NodeKind::Identifier).with_path(p)
        }
        Expression::Compiler(builtin) => LayoutNode::new(
            id_prefix,
            format!("[builtin: {:?}]", builtin),
            NodeKind::Keyword,
        )
        .with_path(p),
        Expression::Add(add) => create_binary_op_node(
            id_prefix,
            "plus",
            &add.left,
            &add.right,
            current_path,
            names,
        ),
        Expression::Subtract(sub) => create_binary_op_node(
            id_prefix,
            "minus",
            &sub.left,
            &sub.right,
            current_path,
            names,
        ),
        Expression::Multiply(mul) => create_binary_op_node(
            id_prefix,
            "multiply",
            &mul.left,
            &mul.right,
            current_path,
            names,
        ),
        Expression::Divide(div) => create_binary_op_node(
            id_prefix,
            "divide",
            &div.left,
            &div.right,
            current_path,
            names,
        ),
        Expression::Remainder(rem) => create_binary_op_node(
            id_prefix,
            "remainder",
            &rem.left,
            &rem.right,
            current_path,
            names,
        ),
        Expression::BitAnd(bit_and) => create_binary_op_node(
            id_prefix,
            "bit-and",
            &bit_and.left,
            &bit_and.right,
            current_path,
            names,
        ),
        Expression::BitOr(bit_or) => create_binary_op_node(
            id_prefix,
            "bit-or",
            &bit_or.left,
            &bit_or.right,
            current_path,
            names,
        ),
        Expression::BitXor(bit_xor) => create_binary_op_node(
            id_prefix,
            "bit-xor",
            &bit_xor.left,
            &bit_xor.right,
            current_path,
            names,
        ),
        Expression::ShiftLeft(shl) => create_binary_op_node(
            id_prefix,
            "shift-left",
            &shl.left,
            &shl.right,
            current_path,
            names,
        ),
        Expression::ShiftRight(shr) => create_binary_op_node(
            id_prefix,
            "shift-right",
            &shr.left,
            &shr.right,
            current_path,
            names,
        ),
        Expression::Equal(eq) => {
            create_binary_op_node(id_prefix, "equal", &eq.left, &eq.right, current_path, names)
        }
        Expression::NotEqual(ne) => create_binary_op_node(
            id_prefix,
            "not-equal",
            &ne.left,
            &ne.right,
            current_path,
            names,
        ),
        Expression::LessThan(lt) => create_binary_op_node(
            id_prefix,
            "less-than",
            &lt.left,
            &lt.right,
            current_path,
            names,
        ),
        Expression::LessThanOrEqual(le) => create_binary_op_node(
            id_prefix,
            "less-than-or-equal",
            &le.left,
            &le.right,
            current_path,
            names,
        ),
        Expression::GreaterThan(gt) => create_binary_op_node(
            id_prefix,
            "greater-than",
            &gt.left,
            &gt.right,
            current_path,
            names,
        ),
        Expression::GreaterThanOrEqual(ge) => create_binary_op_node(
            id_prefix,
            "greater-than-or-equal",
            &ge.left,
            &ge.right,
            current_path,
            names,
        ),
        Expression::And(and) => {
            create_binary_op_node(id_prefix, "and", &and.left, &and.right, current_path, names)
        }
        Expression::Or(or) => {
            create_binary_op_node(id_prefix, "or", &or.left, &or.right, current_path, names)
        }
        Expression::StringConcat(concat) => create_binary_op_node(
            id_prefix,
            "string-concat",
            &concat.left,
            &concat.right,
            current_path,
            names,
        ),
        Expression::ListConcat(concat) => create_binary_op_node(
            id_prefix,
            "list-concat",
            &concat.left,
            &concat.right,
            current_path,
            names,
        ),
        Expression::Not(not_expr) => {
            let child = build_layout_node(
                &not_expr.value,
                &format!("{}.val", id_prefix),
                &child_path(current_path, PathStep::Condition),
                names,
            );
            LayoutNode::new(id_prefix, "not", NodeKind::Operator)
                .with_path(p)
                .with_children(vec![child])
        }
        Expression::StringLength(len_expr) => {
            let child = build_layout_node(
                &len_expr.value,
                &format!("{}.val", id_prefix),
                &child_path(current_path, PathStep::Condition),
                names,
            );
            LayoutNode::new(id_prefix, "string_length", NodeKind::Identifier)
                .with_path(p)
                .with_children(vec![child])
        }
        Expression::ListLength(len_expr) => {
            let child = build_layout_node(
                &len_expr.value,
                &format!("{}.val", id_prefix),
                &child_path(current_path, PathStep::Condition),
                names,
            );
            LayoutNode::new(id_prefix, "list_length", NodeKind::Identifier)
                .with_path(p)
                .with_children(vec![child])
        }
        Expression::StringSlice(slice) => {
            let target = build_layout_node(
                &slice.value,
                &format!("{}.target", id_prefix),
                &child_path(current_path, PathStep::Condition),
                names,
            );
            let start = build_layout_node(
                &slice.start,
                &format!("{}.start", id_prefix),
                &child_path(current_path, PathStep::Start),
                names,
            );
            let end = build_layout_node(
                &slice.end,
                &format!("{}.end", id_prefix),
                &child_path(current_path, PathStep::End),
                names,
            );
            LayoutNode::new(id_prefix, "slice", NodeKind::Identifier)
                .with_path(p)
                .with_children(vec![target, start, end])
        }
        Expression::StringToBytes(stb) => {
            let child = build_layout_node(
                &stb.value,
                &format!("{}.value", id_prefix),
                &child_path(current_path, PathStep::Condition),
                names,
            );
            LayoutNode::new(id_prefix, "string_to_bytes", NodeKind::Identifier)
                .with_path(p)
                .with_children(vec![child])
        }
        Expression::ListGet(get_expr) => {
            let list = build_layout_node(
                &get_expr.list,
                &format!("{}.list", id_prefix),
                &child_path(current_path, PathStep::Left),
                names,
            );
            let index = build_layout_node(
                &get_expr.index,
                &format!("{}.index", id_prefix),
                &child_path(current_path, PathStep::Index),
                names,
            );
            LayoutNode::new(id_prefix, "get", NodeKind::Identifier)
                .with_path(p)
                .with_children(vec![list, index])
        }
        Expression::RecordGet(get_expr) => {
            let record = build_layout_node(
                &get_expr.record,
                &format!("{}.record", id_prefix),
                &child_path(current_path, PathStep::Record),
                names,
            );
            LayoutNode::new(
                id_prefix,
                format!(".{}", get_expr.key),
                NodeKind::Identifier,
            )
            .with_path(p)
            .with_children(vec![record])
        }
        Expression::ListAppend(append_expr) => {
            let list = build_layout_node(
                &append_expr.list,
                &format!("{}.list", id_prefix),
                &child_path(current_path, PathStep::Left),
                names,
            );
            let item = build_layout_node(
                &append_expr.item,
                &format!("{}.item", id_prefix),
                &child_path(current_path, PathStep::Item),
                names,
            );
            LayoutNode::new(id_prefix, "append", NodeKind::Identifier)
                .with_path(p)
                .with_children(vec![list, item])
        }
        Expression::Let(let_expr) => {
            // let の束縛は前から順に見える (後の束縛の値と本体から, それより前の束縛を参照できる)
            let mut scope = names.with_variables([]);
            let mut binding_nodes: Vec<LayoutNode> = Vec::new();
            for (idx, binding) in let_expr.bindings.iter().enumerate() {
                let name_node = LayoutNode::new(
                    format!("{}.b_{}.var", id_prefix, idx),
                    binding.variable_name.as_ref(),
                    NodeKind::Identifier,
                );
                let val_node = build_layout_node(
                    &binding.value,
                    &format!("{}.b_{}.val", id_prefix, idx),
                    &child_path(current_path, PathStep::LetBindingValue(idx)),
                    &scope,
                );
                binding_nodes.push(
                    LayoutNode::new(format!("{}.b_{}", id_prefix, idx), "=", NodeKind::Operator)
                        .with_children(vec![name_node, val_node]),
                );
                scope =
                    scope.with_variables([(binding.variable_id, binding.variable_name.as_ref())]);
            }
            let bindings_list_node =
                LayoutNode::new(format!("{}.bindings", id_prefix), "list", NodeKind::Block)
                    .with_children(binding_nodes);

            let body_node = build_layout_node(
                &let_expr.body,
                &format!("{}.body", id_prefix),
                &child_path(current_path, PathStep::LetBody),
                &scope,
            );
            LayoutNode::new(id_prefix, "let", NodeKind::Block)
                .with_path(p)
                .with_children(vec![bindings_list_node, body_node])
        }
        Expression::Function(func) => {
            let mut children: Vec<LayoutNode> = func
                .parameters
                .iter()
                .enumerate()
                .map(|(idx, param)| {
                    LayoutNode::new(
                        format!("{}.param_{}", id_prefix, idx),
                        param.parameter_name.as_ref(),
                        NodeKind::Identifier,
                    )
                })
                .collect();
            let body_scope = names.with_variables(
                func.parameters
                    .iter()
                    .map(|param| (param.parameter_id, param.parameter_name.as_ref())),
            );
            let body_node = build_layout_node(
                &func.body,
                &format!("{}.body", id_prefix),
                &child_path(current_path, PathStep::FunctionBody),
                &body_scope,
            );
            children.push(body_node);
            LayoutNode::new(id_prefix, "fn", NodeKind::Block)
                .with_path(p)
                .with_children(children)
        }
        Expression::Call(call) => {
            let fn_node = build_layout_node(
                &call.function,
                &format!("{}.func", id_prefix),
                &child_path(current_path, PathStep::CallFunction),
                names,
            );
            let mut children = vec![fn_node];
            let parameter_names = names.get(current_path);
            for (idx, arg) in call.arguments.iter().enumerate() {
                let arg_path = child_path(current_path, PathStep::CallArgument(idx));
                let arg_node = build_layout_node(
                    &arg.value,
                    &format!("{}.arg_{}", id_prefix, idx),
                    &arg_path,
                    names,
                );
                // 名前付きパラメーター表示: 呼び出し先関数のパラメーター名 (分からなければ引数に保存された名前) を付ける
                let parameter_name = parameter_names
                    .and_then(|names| names.get(idx))
                    .map(String::as_str)
                    .unwrap_or(arg.name.as_ref());
                children.push(
                    LayoutNode::new(
                        format!("{}.arg_{}.param", id_prefix, idx),
                        format!("{}:", parameter_name),
                        NodeKind::Identifier,
                    )
                    .with_path(arg_path)
                    .with_children(vec![arg_node]),
                );
            }
            LayoutNode::new(id_prefix, "call", NodeKind::Group)
                .with_path(p)
                .with_children(children)
        }
        Expression::TypeList(type_list) => {
            let item_type = build_layout_node(
                &type_list.item_type,
                &format!("{}.item", id_prefix),
                &child_path(current_path, PathStep::TypeListItem),
                names,
            );
            LayoutNode::new(id_prefix, "List", NodeKind::Keyword)
                .with_path(p)
                .with_children(vec![item_type])
        }
        Expression::TypeLiteral(record) => {
            let children = record
                .items
                .iter()
                .enumerate()
                .map(|(i, item)| {
                    let key_prefix = format!("{}.item_{}", id_prefix, i);
                    let val_node = build_layout_node(
                        &item.value,
                        &key_prefix,
                        &child_path(current_path, PathStep::RecordItemValue(i)),
                        names,
                    );
                    LayoutNode::new(&key_prefix, item.key.as_ref(), NodeKind::Identifier)
                        .with_path(child_path(current_path, PathStep::RecordItemValue(i)))
                        .with_children(vec![val_node])
                })
                .collect();
            LayoutNode::new(id_prefix, "record", NodeKind::Group)
                .with_path(p)
                .with_children(children)
        }
        Expression::ListLiteral(list_expr) => {
            // docs/dynamic-layout.md 要件:
            // 全アイテムが同じキー構成のレコードである場合、スプレッドシート（Table）として最適化
            if let Some((headers, table_node)) =
                try_build_table_node(list_expr, id_prefix, current_path, names)
            {
                let mut node = table_node;
                node.table_headers = headers;
                node
            } else {
                let children = list_expr
                    .items
                    .iter()
                    .enumerate()
                    .map(|(i, item)| {
                        build_layout_node(
                            item,
                            &format!("{}.item_{}", id_prefix, i),
                            &child_path(current_path, PathStep::ListItemValue(i)),
                            names,
                        )
                    })
                    .collect();
                LayoutNode::new(id_prefix, "list", NodeKind::Group)
                    .with_path(p)
                    .with_children(children)
            }
        }
        Expression::Constructor(ctor) => {
            let val_node = build_layout_node(
                &ctor.value,
                &format!("{}.val", id_prefix),
                &child_path(current_path, PathStep::ConstructorValue),
                names,
            );
            let type_hash = ctor.type_part_definition_event_hash.to_string();
            let label = format!("new:{}", &type_hash[..type_hash.len().min(6)]);
            LayoutNode::new(id_prefix, label, NodeKind::Group)
                .with_path(p)
                .with_children(vec![val_node])
        }
        Expression::Variant(variant) => {
            let label = variant.tag.to_string();
            let children = if let Some(payload) = &variant.payload {
                vec![build_layout_node(
                    payload,
                    &format!("{}.payload", id_prefix),
                    &child_path(current_path, PathStep::VariantPayload),
                    names,
                )]
            } else {
                Vec::new()
            };
            LayoutNode::new(id_prefix, label, NodeKind::Group)
                .with_path(p)
                .with_children(children)
        }
        Expression::TypeFunction(type_func) => {
            let mut children: Vec<LayoutNode> = type_func
                .parameters
                .iter()
                .enumerate()
                .map(|(idx, param)| {
                    build_layout_node(
                        &param.r#type,
                        &format!("{}.param_{}", id_prefix, idx),
                        &child_path(current_path, PathStep::TypeFunctionParameter(idx)),
                        names,
                    )
                })
                .collect();
            let ret_node = build_layout_node(
                &type_func.return_type,
                &format!("{}.ret", id_prefix),
                &child_path(current_path, PathStep::TypeFunctionReturn),
                names,
            );
            children.push(ret_node);
            LayoutNode::new(id_prefix, "type_function", NodeKind::Operator)
                .with_path(p)
                .with_children(children)
        }
        Expression::TypeUnion(union_expr) => {
            let children = union_expr
                .variants
                .iter()
                .enumerate()
                .map(|(i, v)| {
                    let v_prefix = format!("{}.var_{}", id_prefix, i);
                    if let Some(payload) = &v.payload_type {
                        let p_node = build_layout_node(
                            payload,
                            &v_prefix,
                            &child_path(current_path, PathStep::TypeUnionVariant(i)),
                            names,
                        );
                        LayoutNode::new(&v_prefix, v.tag.as_ref(), NodeKind::Identifier)
                            .with_path(child_path(current_path, PathStep::TypeUnionVariant(i)))
                            .with_children(vec![p_node])
                    } else {
                        LayoutNode::new(&v_prefix, v.tag.as_ref(), NodeKind::Identifier)
                            .with_path(child_path(current_path, PathStep::TypeUnionVariant(i)))
                    }
                })
                .collect();
            LayoutNode::new(id_prefix, "union", NodeKind::Group)
                .with_path(p)
                .with_children(children)
        }
        Expression::Match(match_expr) => {
            let target_node = build_layout_node(
                &match_expr.target,
                &format!("{}.target", id_prefix),
                &child_path(current_path, PathStep::MatchTarget),
                names,
            );
            let mut children = vec![target_node];
            for (i, arm) in match_expr.arms.iter().enumerate() {
                let arm_prefix = format!("{}.arm_{}", id_prefix, i);
                // アームが値を束縛していれば, 本体からその名前で見えるようにする
                let arm_variable = arm.variable_id.map(|variable_id| {
                    (
                        variable_id,
                        arm.variable_name.as_deref().unwrap_or_default(),
                    )
                });
                let arm_scope = names.with_variables(arm_variable);
                let body_node = build_layout_node(
                    &arm.body,
                    &arm_prefix,
                    &child_path(current_path, PathStep::MatchArmBody(i)),
                    &arm_scope,
                );
                let arm_label = match arm_variable {
                    Some((variable_id, _)) => {
                        format!("{}({}) =>", arm.tag, arm_scope.variable_label(variable_id))
                    }
                    None => format!("{} =>", arm.tag),
                };
                children.push(
                    LayoutNode::new(&arm_prefix, arm_label, NodeKind::Block)
                        .with_path(child_path(current_path, PathStep::MatchArmBody(i)))
                        .with_children(vec![body_node]),
                );
            }
            if let Some(default_body) = &match_expr.default {
                let def_prefix = format!("{}.default", id_prefix);
                let body_node = build_layout_node(
                    default_body,
                    &def_prefix,
                    &child_path(current_path, PathStep::MatchDefault),
                    names,
                );
                children.push(
                    LayoutNode::new(&def_prefix, "_ =>", NodeKind::Block)
                        .with_path(child_path(current_path, PathStep::MatchDefault))
                        .with_children(vec![body_node]),
                );
            }
            LayoutNode::new(id_prefix, "match", NodeKind::Block)
                .with_path(p)
                .with_children(children)
        }
    }
}

fn create_binary_op_node(
    id_prefix: &str,
    op: &str,
    left: &Expression,
    right: &Expression,
    current_path: &[PathStep],
    names: &NameScope,
) -> LayoutNode {
    let left_node = build_layout_node(
        left,
        &format!("{}.left", id_prefix),
        &child_path(current_path, PathStep::Left),
        names,
    );
    let right_node = build_layout_node(
        right,
        &format!("{}.right", id_prefix),
        &child_path(current_path, PathStep::Right),
        names,
    );
    LayoutNode::new(id_prefix, op, NodeKind::Operator)
        .with_path(current_path.to_vec())
        .with_children(vec![left_node, right_node])
}

fn try_build_table_node(
    list_expr: &definy_event::event::ListLiteralExpression,
    id_prefix: &str,
    base_path: &[PathStep],
    names: &NameScope,
) -> Option<(Vec<String>, LayoutNode)> {
    if list_expr.items.is_empty() {
        return None;
    }

    // 全ての要素が TypeLiteral であることを確認し、出現するすべてのキー（ユニオン）を収集
    let mut all_keys = Vec::new();
    for item in &list_expr.items {
        let rec = match item {
            Expression::TypeLiteral(r) => r,
            _ => return None,
        };
        for field in &rec.items {
            let key = field.key.to_string();
            if !all_keys.contains(&key) {
                all_keys.push(key);
            }
        }
    }
    if all_keys.is_empty() {
        return None;
    }

    let headers = all_keys;
    let mut rows = Vec::new();
    for (row_idx, item) in list_expr.items.iter().enumerate() {
        let rec = match item {
            Expression::TypeLiteral(r) => r,
            _ => return None,
        };
        let mut row_cells = Vec::new();
        for (col_idx, key) in headers.iter().enumerate() {
            let cell_node = if let Some((field_idx, field)) = rec
                .items
                .iter()
                .enumerate()
                .find(|(_, f)| f.key.as_ref() == key)
            {
                let mut cell_p = base_path.to_vec();
                cell_p.push(PathStep::ListItemValue(row_idx));
                cell_p.push(PathStep::RecordItemValue(field_idx));
                build_layout_node(
                    &field.value,
                    &format!("{}.r{}.c{}", id_prefix, row_idx, col_idx),
                    &cell_p,
                    names,
                )
            } else {
                LayoutNode::new(
                    format!("{}.r{}.c{}.none", id_prefix, row_idx, col_idx),
                    "-",
                    NodeKind::Delimiter,
                )
            };
            row_cells.push(cell_node);
        }
        let row_node = LayoutNode::new(
            format!("{}.row_{}", id_prefix, row_idx),
            format!("row {}", row_idx),
            NodeKind::Group,
        )
        .with_path(child_path(base_path, PathStep::ListItemValue(row_idx)))
        .with_children(row_cells);
        rows.push(row_node);
    }

    let table_node = LayoutNode::new(id_prefix, "table", NodeKind::Table)
        .with_path(base_path.to_vec())
        .with_children(rows);
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
    let total_inline_width = estimate_inline_width(node, options);

    // 幅に収まり、かつ明示的な Block ではない場合は Inline
    // ブラウザのレンダリング誤差やフォント差異による意図しないスクロールを防ぐため 4px の安全マージンを考慮
    let can_fit_inline =
        (total_inline_width <= available_width - 4.0) && node.kind != NodeKind::Block;

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
    // 複合ノード: カプセルのパディング・ボーダー・マージン (約 16px) + ラベル幅 + 各子要素 (gap: 5px)
    let mut sum = label_w + 16.0;
    for child in &node.children {
        sum += estimate_inline_width(child, options) + 5.0;
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
