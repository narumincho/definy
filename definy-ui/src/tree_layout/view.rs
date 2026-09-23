use crate::app_state::PathStep;
use dioxus::prelude::*;

use super::types::{LayoutMode, LayoutNode, NodeKind};

#[derive(Clone, Copy)]
struct RenderContext {
    selected_node_id: Signal<Option<String>>,
    hovered_node_id: Signal<Option<String>>,
    editable: bool,
    on_select_node: Option<EventHandler<(String, Vec<PathStep>)>>,
    on_change_number: Option<EventHandler<(Vec<PathStep>, i64)>>,
    on_change_string: Option<EventHandler<(Vec<PathStep>, String)>>,
    on_change_boolean: Option<EventHandler<(Vec<PathStep>, bool)>>,
}

#[component]
pub fn TreeLayoutRenderer(
    node: LayoutNode,
    selected_node_id: Signal<Option<String>>,
    hovered_node_id: Signal<Option<String>>,
    #[props(default = false)] editable: bool,
    #[props(default = None)] on_select_node: Option<EventHandler<(String, Vec<PathStep>)>>,
    #[props(default = None)] on_change_number: Option<EventHandler<(Vec<PathStep>, i64)>>,
    #[props(default = None)] on_change_string: Option<EventHandler<(Vec<PathStep>, String)>>,
    #[props(default = None)] on_change_boolean: Option<EventHandler<(Vec<PathStep>, bool)>>,
) -> Element {
    let ctx = RenderContext {
        selected_node_id,
        hovered_node_id,
        editable,
        on_select_node,
        on_change_number,
        on_change_string,
        on_change_boolean,
    };
    render_node(&node, ctx)
}

fn render_node(node: &LayoutNode, ctx: RenderContext) -> Element {
    let node_id = node.id.clone();
    let is_selected = ctx.selected_node_id.read().as_ref() == Some(&node_id);
    let is_hovered = ctx.hovered_node_id.read().as_ref() == Some(&node_id);

    // テーブル（スプレッドシート型）の場合は専用レンダラー
    if node.kind == NodeKind::Table {
        return render_table_node(node, ctx);
    }

    // 葉ノード（子要素なし：数値・文字列・識別子など）
    if node.children.is_empty() {
        let badge_style = node_badge_style(&node.kind, is_selected, is_hovered);
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
                    style: "background: transparent; border: none; outline: none; color: inherit; font-family: inherit; font-size: inherit; width: 3.5rem; text-align: center; padding: 0; margin: 0;",
                    autofocus: true,
                    onclick: move |evt: MouseEvent| evt.stop_propagation(),
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
                    style: "background: transparent; border: none; outline: none; color: inherit; font-family: inherit; font-size: inherit; min-width: 3.5rem; max-width: 12rem; padding: 0; margin: 0;",
                    autofocus: true,
                    onclick: move |evt: MouseEvent| evt.stop_propagation(),
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

        let is_boolean = node.kind == NodeKind::LiteralBoolean;
        let is_bool_true = node.label == "true";

        return rsx! {
            div {
                class: "tree-node-leaf",
                style: "display: inline-flex; align-items: center; vertical-align: middle; margin: 0.08rem 0.12rem;",
                "data-node-id": "{node_id}",
                onclick: move |evt: MouseEvent| {
                    evt.stop_propagation();
                    let mut sel = ctx.selected_node_id;
                    sel.set(Some(id_for_click.clone()));
                    if let Some(cb) = ctx.on_select_node {
                        cb.call((id_for_click.clone(), path_for_click.clone()));
                    }
                    if ctx.editable && is_boolean
                        && let Some(cb) = ctx.on_change_boolean
                    {
                        cb.call((path_for_click.clone(), !is_bool_true));
                    }
                },
                onmouseenter: move |evt: MouseEvent| {
                    evt.stop_propagation();
                    let mut hov = ctx.hovered_node_id;
                    hov.set(Some(id_for_enter.clone()));
                },
                onmouseleave: move |_| {
                    let mut hov = ctx.hovered_node_id;
                    hov.set(None);
                },
                div {
                    style: "{badge_style}",
                    title: "ID: {node.id} ({node.computed_width:.0}x{node.computed_height:.0}px)",
                    {inner_element}
                }
            }
        };
    }

    // 子要素がある複合ノード（Operator, Group, Block）
    let is_multiline = node.layout_mode == LayoutMode::Multiline;
    let badge_style = node_badge_style(&node.kind, is_selected, false);

    // カプセル枠のスタイル（入れ子関係が視覚的に明確にわかるようにする）
    let capsule_border = if is_selected {
        "1.5px solid var(--accent)"
    } else if is_hovered {
        "1.5px solid rgb(124 192 216 / 0.6)"
    } else {
        "1px solid rgb(160 176 192 / 0.22)"
    };

    let capsule_bg = if is_selected {
        "rgb(124 192 216 / 0.1)"
    } else if is_hovered {
        "rgb(124 192 216 / 0.05)"
    } else {
        "rgb(255 255 255 / 0.02)"
    };

    let id_for_click = node.id.clone();
    let id_for_enter = node.id.clone();
    let path_for_click = node.path.clone();

    if is_multiline {
        // 複数行（Multiline）展開：ヘッダー行＋インデントされた各引数スロット
        let container_style = format!(
            "display: flex; flex-direction: column; align-items: flex-start; gap: 0.3rem; margin: 0.15rem 0; padding: 0.25rem 0.5rem 0.35rem 0.5rem; background: {}; border: {}; border-radius: var(--radius-sm); transition: all 0.12s ease; width: fit-content; max-width: 100%; box-sizing: border-box;",
            capsule_bg, capsule_border
        );

        rsx! {
            div {
                class: "tree-node-capsule-multiline",
                style: "{container_style}",
                "data-node-id": "{node_id}",
                onclick: move |evt: MouseEvent| {
                    evt.stop_propagation();
                    let mut sel = ctx.selected_node_id;
                    sel.set(Some(id_for_click.clone()));
                    if let Some(cb) = ctx.on_select_node {
                        cb.call((id_for_click.clone(), path_for_click.clone()));
                    }
                },
                onmouseenter: move |evt: MouseEvent| {
                    evt.stop_propagation();
                    let mut hov = ctx.hovered_node_id;
                    hov.set(Some(id_for_enter.clone()));
                },
                onmouseleave: move |_| {
                    let mut hov = ctx.hovered_node_id;
                    hov.set(None);
                },
                // ヘッダー行（演算子/キーワードラベル）
                div { style: "display: flex; align-items: center;",
                    div {
                        style: "{badge_style}",
                        title: "ID: {node.id} ({node.computed_width:.0}x{node.computed_height:.0}px)",
                        "{node.label}"
                    }
                }
                // 各引数（独立した行としてインデント展開）
                div { style: "display: flex; flex-direction: column; gap: 0.3rem; padding-left: 0.8rem; border-left: 2px solid rgb(124 192 216 / 0.3); margin-left: 0.4rem; width: 100%; box-sizing: border-box;",
                    for child in &node.children {
                        div { style: "width: fit-content; max-width: 100%;",
                            {render_node(child, ctx)}
                        }
                    }
                }
            }
        }
    } else {
        // インライン（Inline）展開：薄いカプセル枠で囲むことで入れ子関係が一目瞭然（括弧テキストは不要）
        let container_style = format!(
            "display: inline-flex; align-items: center; gap: 0.28rem; vertical-align: middle; margin: 0.08rem 0.12rem; padding: 0.1rem 0.3rem; background: {}; border: {}; border-radius: var(--radius-sm); transition: all 0.12s ease; white-space: nowrap;",
            capsule_bg, capsule_border
        );

        rsx! {
            div {
                class: "tree-node-capsule-inline",
                style: "{container_style}",
                "data-node-id": "{node_id}",
                onclick: move |evt: MouseEvent| {
                    evt.stop_propagation();
                    let mut sel = ctx.selected_node_id;
                    sel.set(Some(id_for_click.clone()));
                    if let Some(cb) = ctx.on_select_node {
                        cb.call((id_for_click.clone(), path_for_click.clone()));
                    }
                },
                onmouseenter: move |evt: MouseEvent| {
                    evt.stop_propagation();
                    let mut hov = ctx.hovered_node_id;
                    hov.set(Some(id_for_enter.clone()));
                },
                onmouseleave: move |_| {
                    let mut hov = ctx.hovered_node_id;
                    hov.set(None);
                },
                div {
                    style: "{badge_style}",
                    title: "ID: {node.id} ({node.computed_width:.0}x{node.computed_height:.0}px)",
                    "{node.label}"
                }
                for child in &node.children {
                    {render_node(child, ctx)}
                }
            }
        }
    }
}

fn render_table_node(node: &LayoutNode, ctx: RenderContext) -> Element {
    let headers = &node.table_headers;
    let col_widths = &node.columns_width;
    let is_selected = ctx.selected_node_id.read().as_ref() == Some(&node.id);
    let is_hovered = ctx.hovered_node_id.read().as_ref() == Some(&node.id);

    let border_color = if is_selected {
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
            style: "display: flex; flex-direction: column; border: 1px solid {border_color}; border-radius: var(--radius-md); background: rgb(0 0 0 / 0.25); overflow-x: auto; max-width: 100%; margin: 0.35rem 0; box-shadow: var(--shadow-sm);",
            onclick: move |evt: MouseEvent| {
                evt.stop_propagation();
                let mut sel = ctx.selected_node_id;
                sel.set(Some(id_for_click.clone()));
                if let Some(cb) = ctx.on_select_node {
                    cb.call((id_for_click.clone(), path_for_click.clone()));
                }
            },
            onmouseenter: move |evt: MouseEvent| {
                evt.stop_propagation();
                let mut hov = ctx.hovered_node_id;
                hov.set(Some(id_for_enter.clone()));
            },
            onmouseleave: move |_| {
                let mut hov = ctx.hovered_node_id;
                hov.set(None);
            },
            // 横スクロール時はみ出しても背景・罫線が途切れないよう min-width: max-content を設定
            div { style: "display: flex; flex-direction: column; min-width: max-content; width: 100%;",
                // Table Header Row
                div { style: "display: flex; background: rgb(255 255 255 / 0.06); border-bottom: 1px solid var(--border); padding: 0.4rem 0.6rem; font-size: 0.8rem; font-weight: 600; color: var(--text-secondary);",
                    div { style: "width: 2.2rem; min-width: 2.2rem; color: var(--text-secondary); text-align: center; opacity: 0.7;",
                        "#"
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
                        style: "display: flex; align-items: center; border-bottom: 1px solid rgb(255 255 255 / 0.04); padding: 0.35rem 0.6rem; font-size: 0.85rem; transition: background 0.1s ease;",
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

fn node_badge_style(kind: &NodeKind, is_selected: bool, is_hovered: bool) -> String {
    let (bg, text_color, border) = match kind {
        NodeKind::LiteralNumber => (
            "rgb(180 215 255 / 0.14)",
            "#93c5fd",
            "1px solid rgb(147 197 253 / 0.3)",
        ),
        NodeKind::LiteralString => (
            "rgb(134 239 172 / 0.14)",
            "#86efac",
            "1px solid rgb(134 239 172 / 0.3)",
        ),
        NodeKind::LiteralBoolean => (
            "rgb(244 114 182 / 0.14)",
            "#f472b6",
            "1px solid rgb(244 114 182 / 0.3)",
        ),
        NodeKind::Identifier => (
            "rgb(255 255 255 / 0.08)",
            "#e2e8f0",
            "1px solid rgb(255 255 255 / 0.2)",
        ),
        NodeKind::Keyword => (
            "rgb(192 132 252 / 0.16)",
            "#c084fc",
            "1px solid rgb(192 132 252 / 0.38)",
        ),
        NodeKind::Operator => (
            "rgb(251 191 36 / 0.16)",
            "#fbbf24",
            "1px solid rgb(251 191 36 / 0.38)",
        ),
        NodeKind::Delimiter => ("transparent", "#94a3b8", "none"),
        NodeKind::Group => (
            "rgb(124 192 216 / 0.1)",
            "#7cc0d8",
            "1px solid rgb(124 192 216 / 0.3)",
        ),
        NodeKind::Block => (
            "rgb(148 163 184 / 0.14)",
            "#cbd5e1",
            "1px solid rgb(148 163 184 / 0.32)",
        ),
        NodeKind::Table => (
            "rgb(167 139 250 / 0.14)",
            "#c4b5fd",
            "1px solid rgb(167 139 250 / 0.32)",
        ),
    };

    let focus_style = if is_selected {
        "box-shadow: 0 0 0 2px var(--accent), 0 2px 8px rgb(124 192 216 / 0.3); border-color: var(--accent);"
    } else if is_hovered {
        "box-shadow: 0 0 0 1.5px rgb(255 255 255 / 0.4); border-color: #fff;"
    } else {
        ""
    };

    format!(
        "display: inline-flex; align-items: center; padding: 0.12rem 0.42rem; border-radius: var(--radius-sm); font-family: 'JetBrains Mono', monospace; font-size: 0.82rem; background: {}; color: {}; border: {}; cursor: pointer; user-select: none; transition: all 0.12s ease; white-space: nowrap; {}",
        bg, text_color, border, focus_style
    )
}
