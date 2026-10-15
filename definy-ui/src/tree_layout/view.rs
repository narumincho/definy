use std::collections::{HashMap, HashSet};

use crate::app_state::PathStep;
use crate::expression_editor::{ExpressionType, TypeDiagnostic};
use dioxus::prelude::*;

use super::types::{LayoutMode, LayoutNode, NodeKind};

#[derive(Clone, Copy)]
struct RenderContext {
    selected_node_id: Signal<Option<String>>,
    hovered_node_id: Signal<Option<String>>,
    collapsed_node_ids: Signal<HashSet<String>>,
    diagnostics: Option<Signal<Vec<TypeDiagnostic>>>,
    expected_types: Option<Signal<HashMap<Vec<PathStep>, ExpressionType>>>,
    editable: bool,
    on_select_node: Option<EventHandler<(String, Vec<PathStep>)>>,
    on_change_number: Option<EventHandler<(Vec<PathStep>, i64)>>,
    on_change_string: Option<EventHandler<(Vec<PathStep>, String)>>,
    on_clear: Option<EventHandler<Vec<PathStep>>>,
    selection_anchor_id: Option<u64>,
}

impl RenderContext {
    fn anchor_style(&self, node_id: &str) -> String {
        match self.selection_anchor_id {
            Some(anchor_id) => {
                format!(
                    " anchor-name: {};",
                    tree_node_anchor_name(anchor_id, node_id)
                )
            }
            None => String::new(),
        }
    }

    fn select_node(mut self, id: &str, path: &[PathStep]) {
        self.selected_node_id.set(Some(id.to_string()));
        if let Some(cb) = self.on_select_node {
            cb.call((id.to_string(), path.to_vec()));
        }
    }

    fn set_hovered(mut self, id: Option<String>) {
        self.hovered_node_id.set(id);
    }

    fn toggle_collapsed(mut self, id: &str) {
        let mut current = self.collapsed_node_ids.read().clone();
        if !current.remove(id) {
            current.insert(id.to_string());
        }
        self.collapsed_node_ids.set(current);
    }

    fn expand_collapsed(mut self, id: &str) {
        let mut current = self.collapsed_node_ids.read().clone();
        current.remove(id);
        self.collapsed_node_ids.set(current);
    }

    fn node_diagnostic_and_tooltip(&self, node: &LayoutNode) -> (bool, String) {
        let error_message = self.diagnostics.and_then(|sig| {
            sig.read()
                .iter()
                .find(|d| d.path == node.path)
                .map(|d| d.message.clone())
        });
        let expected_type_str = self
            .expected_types
            .and_then(|sig| sig.read().get(&node.path).map(|t| t.text()));

        let mut tooltip_parts = Vec::new();
        if let Some(err) = &error_message {
            tooltip_parts.push(format!("⚠ 型エラー: {err}"));
        }
        if let Some(exp) = &expected_type_str {
            tooltip_parts.push(format!("期待する型: {exp}"));
        }
        tooltip_parts.push(format!(
            "ID: {} ({:.0}x{:.0}px)",
            node.id, node.computed_width, node.computed_height
        ));

        (error_message.is_some(), tooltip_parts.join("\n"))
    }
}

/// ノードに付与する CSS `anchor-name`. ドロップダウンメニューをノード直下に表示するために使う
pub fn tree_node_anchor_name(anchor_id: u64, node_id: &str) -> String {
    let sanitized: String = node_id
        .chars()
        .map(|c| {
            if c.is_ascii_alphanumeric() || c == '-' || c == '_' {
                c
            } else {
                '-'
            }
        })
        .collect();
    format!("--tree-node-{anchor_id}-{sanitized}")
}

#[component]
pub fn TreeLayoutRenderer(
    node: LayoutNode,
    selected_node_id: Signal<Option<String>>,
    hovered_node_id: Signal<Option<String>>,
    #[props(default = None)] collapsed_node_ids: Option<Signal<HashSet<String>>>,
    #[props(default = None)] diagnostics: Option<Signal<Vec<TypeDiagnostic>>>,
    #[props(default = None)] expected_types: Option<Signal<HashMap<Vec<PathStep>, ExpressionType>>>,
    #[props(default = false)] editable: bool,
    #[props(default = None)] on_select_node: Option<EventHandler<(String, Vec<PathStep>)>>,
    #[props(default = None)] on_change_number: Option<EventHandler<(Vec<PathStep>, i64)>>,
    #[props(default = None)] on_change_string: Option<EventHandler<(Vec<PathStep>, String)>>,
    /// 選択中のリテラルの入力欄が空の状態で Delete / Backspace キーが押されたら呼ばれる
    #[props(default = None)]
    on_clear: Option<EventHandler<Vec<PathStep>>>,
    /// 指定すると各ノードに [`tree_node_anchor_name`] の `anchor-name` を付与する
    #[props(default = None)]
    selection_anchor_id: Option<u64>,
) -> Element {
    let internal_collapsed = use_signal(HashSet::<String>::new);
    let effective_collapsed = collapsed_node_ids.unwrap_or(internal_collapsed);

    let ctx = RenderContext {
        selected_node_id,
        hovered_node_id,
        collapsed_node_ids: effective_collapsed,
        diagnostics,
        expected_types,
        editable,
        on_select_node,
        on_change_number,
        on_change_string,
        on_clear,
        selection_anchor_id,
    };
    render_node(&node, ctx)
}

/// リテラルの入力欄が空のときの Delete / Backspace でその式を未入力にする.
/// (文字が残っている間は通常どおり文字を消す)
fn clear_literal_on_delete_key(evt: &KeyboardEvent, ctx: RenderContext, path: &[PathStep]) {
    if !matches!(evt.key(), Key::Delete | Key::Backspace) || !focused_input_is_empty() {
        return;
    }
    if let Some(on_clear) = ctx.on_clear {
        evt.prevent_default();
        on_clear.call(path.to_vec());
    }
}

fn focused_input_is_empty() -> bool {
    #[cfg(target_arch = "wasm32")]
    {
        use wasm_bindgen::JsCast;
        web_sys::window()
            .and_then(|w| w.document())
            .and_then(|d| d.active_element())
            .and_then(|e| e.dyn_into::<web_sys::HtmlInputElement>().ok())
            .is_some_and(|input| input.value().is_empty())
    }
    #[cfg(not(target_arch = "wasm32"))]
    {
        false
    }
}

fn render_node(node: &LayoutNode, ctx: RenderContext) -> Element {
    let is_selected = ctx.selected_node_id.read().as_ref() == Some(&node.id);
    let is_hovered = ctx.hovered_node_id.read().as_ref() == Some(&node.id);
    let (has_error, tooltip) = ctx.node_diagnostic_and_tooltip(node);

    if node.kind == NodeKind::Table {
        return render_table_node(node, ctx, is_selected, is_hovered, has_error, &tooltip);
    }

    if node.children.is_empty() {
        return render_leaf_node(node, ctx, is_selected, is_hovered, has_error, &tooltip);
    }

    if node.layout_mode == LayoutMode::Multiline {
        render_multiline_capsule_node(node, ctx, is_selected, is_hovered, has_error, &tooltip)
    } else {
        render_inline_capsule_node(node, ctx, is_selected, is_hovered, has_error, &tooltip)
    }
}

fn render_node_badge(
    badge_style: &str,
    tooltip: &str,
    has_error: bool,
    content: Element,
) -> Element {
    rsx! {
        div { style: "{badge_style}", title: "{tooltip}",
            if has_error {
                span { style: "color: var(--red); font-weight: bold; margin-right: 0.25rem;",
                    "⚠"
                }
            }
            {content}
        }
    }
}

fn render_leaf_node(
    node: &LayoutNode,
    ctx: RenderContext,
    is_selected: bool,
    is_hovered: bool,
    has_error: bool,
    tooltip: &str,
) -> Element {
    let node_id = node.id.clone();
    let badge_style = format!(
        "{}{}",
        node_badge_style(&node.kind, is_selected, is_hovered, has_error),
        ctx.anchor_style(&node.id)
    );
    let id_for_click = node.id.clone();
    let id_for_enter = node.id.clone();
    let path_for_click = node.path.clone();

    let inner_element = if ctx.editable && is_selected && node.kind == NodeKind::LiteralNumber {
        let p = node.path.clone();
        let raw_val = node.label.clone();
        rsx! {
            input {
                r#type: "number",
                value: "{raw_val}",
                style: "background: transparent; border: none; outline: none; box-shadow: none; border-radius: var(--radius-full); backdrop-filter: none; color: inherit; font-family: inherit; font-size: inherit; width: 3.5rem; text-align: center; padding: 0; margin: 0;",
                autofocus: true,
                onkeydown: {
                    let p = p.clone();
                    move |evt: KeyboardEvent| clear_literal_on_delete_key(&evt, ctx, &p)
                },
                oninput: move |evt: FormEvent| {
                    if let Ok(n) = evt.value().parse::<i64>()
                        && let Some(cb) = ctx.on_change_number
                    {
                        cb.call((p.clone(), n));
                    }
                },
            }
        }
    } else if ctx.editable && is_selected && node.kind == NodeKind::LiteralString {
        let p = node.path.clone();
        let raw_str = node.label.trim_matches('"').to_string();
        rsx! {
            input {
                r#type: "text",
                value: "{raw_str}",
                style: "background: transparent; border: none; outline: none; box-shadow: none; border-radius: var(--radius-full); backdrop-filter: none; color: inherit; font-family: inherit; font-size: inherit; min-width: 3.5rem; max-width: 12rem; padding: 0; margin: 0;",
                autofocus: true,
                onkeydown: {
                    let p = p.clone();
                    move |evt: KeyboardEvent| clear_literal_on_delete_key(&evt, ctx, &p)
                },
                oninput: move |evt: FormEvent| {
                    if let Some(cb) = ctx.on_change_string {
                        cb.call((p.clone(), evt.value()));
                    }
                },
            }
        }
    } else {
        rsx! { "{node.label}" }
    };

    rsx! {
        div {
            class: "tree-node-leaf",
            style: "display: inline-flex; align-items: center; vertical-align: middle; margin: 0.08rem 0.12rem;",
            "data-node-id": "{node_id}",
            onclick: move |evt: MouseEvent| {
                evt.stop_propagation();
                // Bool リテラルはクリックで反転させず, ドロップダウンの true / false から選ぶ
                ctx.select_node(&id_for_click, &path_for_click);
            },
            onmouseenter: move |evt: MouseEvent| {
                evt.stop_propagation();
                ctx.set_hovered(Some(id_for_enter.clone()));
            },
            onmouseleave: move |_| {
                ctx.set_hovered(None);
            },
            {render_node_badge(&badge_style, tooltip, has_error, inner_element)}
        }
    }
}

fn render_multiline_capsule_node(
    node: &LayoutNode,
    ctx: RenderContext,
    is_selected: bool,
    is_hovered: bool,
    has_error: bool,
    tooltip: &str,
) -> Element {
    let node_id = node.id.clone();
    let badge_style = format!(
        "{}{}",
        node_badge_style(&node.kind, is_selected, false, has_error),
        ctx.anchor_style(&node.id)
    );
    let container_style = capsule_container_style(true, is_selected, is_hovered, has_error);
    let is_collapsed = ctx.collapsed_node_ids.read().contains(&node.id);
    let id_for_click = node.id.clone();
    let id_for_enter = node.id.clone();
    let path_for_click = node.path.clone();
    let toggle_id = node.id.clone();
    let toggle_id_expand = node.id.clone();

    rsx! {
        div {
            class: "tree-node-capsule-multiline",
            style: "{container_style}",
            "data-node-id": "{node_id}",
            onclick: move |evt: MouseEvent| {
                evt.stop_propagation();
                ctx.select_node(&id_for_click, &path_for_click);
            },
            onmouseenter: move |evt: MouseEvent| {
                evt.stop_propagation();
                ctx.set_hovered(Some(id_for_enter.clone()));
            },
            onmouseleave: move |_| {
                ctx.set_hovered(None);
            },
            // ヘッダー行（演算子/キーワードラベル ＋ 折りたたみトグル）
            div { style: "display: flex; align-items: center; gap: 0.3rem;",
                button {
                    style: "background: transparent; border: none; padding: 0.05rem 0.2rem; cursor: pointer; color: var(--text-secondary); font-size: 0.72rem; line-height: 1; border-radius: var(--radius-full);",
                    title: if is_collapsed { "詳細を展開" } else { "折りたたむ" },
                    onclick: move |evt: MouseEvent| {
                        evt.stop_propagation();
                        ctx.toggle_collapsed(&toggle_id);
                    },
                    if is_collapsed {
                        "▸"
                    } else {
                        "▾"
                    }
                }
                {render_node_badge(&badge_style, tooltip, has_error, rsx! { "{node.label}" })}
                if is_collapsed {
                    span {
                        style: "font-size: 0.72rem; color: var(--text-secondary); opacity: 0.75; font-family: monospace; font-style: italic; cursor: pointer;",
                        onclick: move |evt: MouseEvent| {
                            evt.stop_propagation();
                            ctx.expand_collapsed(&toggle_id_expand);
                        },
                        "... ({node.children.len()} args)"
                    }
                }
            }
            // 各引数（独立した行としてインデント展開、展開時のみ表示）
            if !is_collapsed {
                div { style: "display: flex; flex-direction: column; gap: 0.3rem; padding-left: 0.8rem; border-left: 2px solid var(--blue-border); margin-left: 0.4rem; width: 100%; box-sizing: border-box;",
                    for child in &node.children {
                        div { style: "width: fit-content; max-width: 100%;",
                            {render_node(child, ctx)}
                        }
                    }
                }
            }
        }
    }
}

fn render_inline_capsule_node(
    node: &LayoutNode,
    ctx: RenderContext,
    is_selected: bool,
    is_hovered: bool,
    has_error: bool,
    tooltip: &str,
) -> Element {
    let node_id = node.id.clone();
    let badge_style = node_badge_style(&node.kind, is_selected, false, has_error);
    let container_style = format!(
        "{}{}",
        capsule_container_style(false, is_selected, is_hovered, has_error),
        ctx.anchor_style(&node.id)
    );
    let id_for_click = node.id.clone();
    let id_for_enter = node.id.clone();
    let path_for_click = node.path.clone();

    rsx! {
        div {
            class: "tree-node-capsule-inline",
            style: "{container_style}",
            "data-node-id": "{node_id}",
            onclick: move |evt: MouseEvent| {
                evt.stop_propagation();
                ctx.select_node(&id_for_click, &path_for_click);
            },
            onmouseenter: move |evt: MouseEvent| {
                evt.stop_propagation();
                ctx.set_hovered(Some(id_for_enter.clone()));
            },
            onmouseleave: move |_| {
                ctx.set_hovered(None);
            },
            {render_node_badge(&badge_style, tooltip, has_error, rsx! { "{node.label}" })}
            for child in &node.children {
                {render_node(child, ctx)}
            }
        }
    }
}

fn render_table_node(
    node: &LayoutNode,
    ctx: RenderContext,
    is_selected: bool,
    is_hovered: bool,
    has_error: bool,
    tooltip: &str,
) -> Element {
    let headers = &node.table_headers;
    let col_widths = &node.columns_width;
    let table_anchor_style = ctx.anchor_style(&node.id);
    let border_color = if has_error && is_selected {
        "var(--red)"
    } else if has_error {
        "var(--red-border)"
    } else if is_selected {
        "var(--primary)"
    } else if is_hovered {
        "var(--border-strong)"
    } else {
        "var(--border)"
    };

    let id_for_click = node.id.clone();
    let id_for_enter = node.id.clone();
    let path_for_click = node.path.clone();

    rsx! {
        div {
            class: "tree-node-table-wrapper",
            style: "display: flex; flex-direction: column; border: 1.5px solid {border_color}; border-radius: var(--radius-lg); background: var(--bg-inset); overflow-x: auto; max-width: 100%; margin: 0.35rem 0; box-shadow: var(--shadow-sm);{table_anchor_style}",
            title: "{tooltip}",
            onclick: move |evt: MouseEvent| {
                evt.stop_propagation();
                ctx.select_node(&id_for_click, &path_for_click);
            },
            onmouseenter: move |evt: MouseEvent| {
                evt.stop_propagation();
                ctx.set_hovered(Some(id_for_enter.clone()));
            },
            onmouseleave: move |_| {
                ctx.set_hovered(None);
            },
            // 横スクロール時はみ出しても背景・罫線が途切れないよう min-width: max-content を設定
            div { style: "display: flex; flex-direction: column; min-width: max-content; width: 100%;",
                // Table Header Row
                div { style: "display: flex; background: var(--overlay-2); border-bottom: 1px solid var(--border); padding: 0.4rem 0.6rem; font-size: 0.8rem; font-weight: 600; color: var(--text-secondary);",
                    div { style: "width: 2.2rem; min-width: 2.2rem; color: var(--text-secondary); text-align: center; opacity: 0.7;",
                        if has_error {
                            "⚠"
                        } else {
                            "#"
                        }
                    }
                    for (i, header) in headers.iter().enumerate() {
                        div {
                            key: "th-{header}",
                            style: "width: {col_widths.get(i).copied().unwrap_or(80.0)}px; min-width: {col_widths.get(i).copied().unwrap_or(80.0)}px; padding: 0 0.5rem; text-align: left;",
                            "{header}"
                        }
                    }
                }
                // Table Rows
                for (row_idx, row) in node.children.iter().enumerate() {
                    div {
                        key: "row-{row_idx}",
                        style: "display: flex; align-items: center; border-bottom: 1px solid var(--overlay-2); padding: 0.35rem 0.6rem; font-size: 0.85rem; transition: background 0.1s ease;",
                        div { style: "width: 2.2rem; min-width: 2.2rem; color: var(--text-secondary); text-align: center; font-size: 0.75rem; opacity: 0.6;",
                            "{row_idx + 1}"
                        }
                        for (col_idx, cell) in row.children.iter().enumerate() {
                            div {
                                key: "cell-{row_idx}-{col_idx}",
                                style: "width: {col_widths.get(col_idx).copied().unwrap_or(80.0)}px; min-width: {col_widths.get(col_idx).copied().unwrap_or(80.0)}px; padding: 0 0.5rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;",
                                {render_node(cell, ctx)}
                            }
                        }
                    }
                }
            }
        }
    }
}

pub fn node_badge_style(
    kind: &NodeKind,
    is_selected: bool,
    is_hovered: bool,
    has_error: bool,
) -> String {
    let (bg, text_color, border) = if has_error {
        (
            "var(--red-border)",
            "var(--red-text)",
            "1.5px solid var(--red)",
        )
    } else {
        match kind {
            NodeKind::LiteralNumber => (
                "var(--blue-bg-strong)",
                "var(--blue-text)",
                "1px solid var(--blue-border)",
            ),
            NodeKind::LiteralString => (
                "var(--green-bg-strong)",
                "var(--green)",
                "1px solid var(--green-border)",
            ),
            NodeKind::LiteralBoolean => (
                "var(--pink-bg-strong)",
                "var(--pink)",
                "1px solid var(--pink-border)",
            ),
            NodeKind::Identifier => (
                "var(--overlay-3)",
                "var(--text)",
                "1px solid var(--overlay-3)",
            ),
            NodeKind::Keyword => (
                "var(--purple-bg-strong)",
                "var(--purple)",
                "1px solid var(--purple-border)",
            ),
            NodeKind::Operator => (
                "var(--yellow-bg-strong)",
                "var(--yellow)",
                "1px solid var(--yellow-border)",
            ),
            NodeKind::Delimiter => ("transparent", "var(--text-secondary)", "none"),
            NodeKind::Group => (
                "var(--blue-bg)",
                "var(--blue)",
                "1px solid var(--blue-border)",
            ),
            NodeKind::Block => (
                "var(--text-secondary)",
                "var(--text)",
                "1px solid var(--text-secondary)",
            ),
            NodeKind::Table => (
                "var(--purple-bg-strong)",
                "var(--purple-text)",
                "1px solid var(--purple-border)",
            ),
        }
    };

    let focus_style = if has_error && is_selected {
        "box-shadow: 0 0 0 2px var(--red), 0 2px 8px var(--red-border); border-color: var(--red);"
    } else if has_error {
        "box-shadow: 0 0 0 1px var(--red);"
    } else if is_selected {
        "box-shadow: 0 0 0 2px var(--accent), 0 2px 8px var(--blue-border); border-color: var(--accent);"
    } else if is_hovered {
        "box-shadow: 0 0 0 1.5px var(--overlay-3); border-color: var(--text-primary);"
    } else {
        ""
    };

    format!(
        "display: inline-flex; align-items: center; padding: 0.12rem 0.42rem; border-radius: var(--radius-full); font-family: 'JetBrains Mono', monospace; font-size: 0.82rem; background: {}; color: {}; border: {}; cursor: pointer; user-select: none; transition: all 0.12s ease; white-space: nowrap; {}",
        bg, text_color, border, focus_style
    )
}

fn capsule_container_style(
    is_multiline: bool,
    is_selected: bool,
    is_hovered: bool,
    has_error: bool,
) -> String {
    let (bg, border) = if has_error && is_selected {
        ("var(--red-bg-strong)", "2px solid var(--red)")
    } else if has_error {
        ("var(--red-bg)", "1.5px solid var(--red)")
    } else if is_selected {
        ("var(--blue-bg)", "1.5px solid var(--accent)")
    } else if is_hovered {
        ("var(--blue-bg)", "1.5px solid var(--blue-border)")
    } else {
        ("var(--overlay-1)", "1px solid var(--text-secondary)")
    };

    if is_multiline {
        format!(
            "display: flex; flex-direction: column; align-items: flex-start; gap: 0.3rem; margin: 0.15rem 0; padding: 0.25rem 0.5rem 0.35rem 0.5rem; background: {bg}; border: {border}; border-radius: var(--radius-lg); transition: all 0.12s ease; width: fit-content; max-width: 100%; box-sizing: border-box;"
        )
    } else {
        format!(
            "display: inline-flex; align-items: center; gap: 0.28rem; vertical-align: middle; margin: 0.08rem 0.12rem; padding: 0.1rem 0.3rem; background: {bg}; border: {border}; border-radius: var(--radius-full); transition: all 0.12s ease; white-space: nowrap;"
        )
    }
}
