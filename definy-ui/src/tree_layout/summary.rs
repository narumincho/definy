use definy_event::event::Expression;
use dioxus::prelude::*;

use super::engine::{compute_layout, expression_to_layout_node};
use super::types::{LayoutNode, LayoutOptions};
use super::view::{TreeLayoutRenderer, node_badge_style};

/// 式（Expression）をツリー構造として表現するコンポーネント。
/// 通常時は「木構造の外側（ルートノードと直下の子の骨格）」をコンパクトに表示し、
/// クリックすることで詳細な完全木構造（TreeLayoutRenderer）を展開・閲覧できます。
#[component]
pub fn ExpressionTreeSummary(
    expression: Option<Expression>,
    #[props(default = false)] initial_expanded: bool,
    #[props(default = 700.0)] max_width: f32,
    #[props(default = true)] show_expand_button: bool,
) -> Element {
    let mut is_expanded = use_signal(|| initial_expanded);
    let selected_node_id = use_signal(|| None::<String>);
    let hovered_node_id = use_signal(|| None::<String>);

    let expr = match expression {
        Some(e) => e,
        None => {
            return rsx! {
                div {
                    class: "mono",
                    style: "font-size: 0.78rem; color: var(--text-secondary); opacity: 0.6; padding: 0.2rem 0.4rem; display: inline-flex; align-items: center;",
                    "(none)"
                }
            };
        }
    };

    let layout_options = LayoutOptions {
        max_width: (max_width - 24.0).max(120.0),
        ..Default::default()
    };
    let root_layout_node = expression_to_layout_node(&expr, "root");
    let layout_result = compute_layout(&root_layout_node, &layout_options);

    let is_leaf = root_layout_node.children.is_empty();
    let node_count = layout_result.node_count;
    let max_depth = layout_result.max_depth;

    let outer_bar_style = outer_bar_container_style(is_leaf, is_expanded());
    let (expand_btn_bg, expand_btn_color, expand_btn_border) = expand_button_style(is_expanded());

    rsx! {
        div {
            class: "expression-tree-summary-wrapper",
            style: "display: flex; flex-direction: column; gap: 0.35rem; width: fit-content; max-width: 100%; box-sizing: border-box;",

            // 外側プレビュー表示（クリックで展開・折りたたみ）
            div {
                class: "expression-tree-outer-bar",
                style: "{outer_bar_style}",
                onclick: move |evt: MouseEvent| {
                    if !is_leaf && show_expand_button {
                        evt.stop_propagation();
                        is_expanded.set(!is_expanded());
                    }
                },
                title: if is_leaf { format!("ID: {} (Leaf node)", root_layout_node.id) } else if is_expanded() { "クリックして折りたたむ".to_string() } else { format!(
                    "クリックして木構造を展開 (全 {} ノード, 深さ {})",
                    node_count,
                    max_depth,
                ) },

                // ルートノードのバッジ（外枠の骨格）
                div { style: "{node_badge_style(&root_layout_node.kind, false, false, false)}",
                    "{root_layout_node.label}"
                }

                // 直下の子要素たちのプレビューチップ（外側ノード）
                if !is_leaf {
                    for (idx, child) in root_layout_node.children.iter().enumerate() {
                        {
                            rsx! {
                                if idx > 0 {
                                    span { style: "color: var(--text-secondary); opacity: 0.4; font-size: 0.72rem; margin: 0 -0.1rem;",
                                        "·"
                                    }
                                }
                                {render_child_summary_chip(child)}
                            }
                        }
                    }

                    if show_expand_button {
                        div { style: "margin-left: 0.2rem; display: inline-flex; align-items: center; gap: 0.2rem; font-size: 0.72rem; padding: 0.08rem 0.35rem; border-radius: 3px; font-family: monospace; line-height: 1; transition: all 0.12s ease; background: {expand_btn_bg}; color: {expand_btn_color}; border: {expand_btn_border};",
                            span {
                                if is_expanded() {
                                    "▲"
                                } else {
                                    "▼"
                                }
                            }
                            span {
                                if is_expanded() {
                                    "閉じる"
                                } else {
                                    "{node_count} nodes"
                                }
                            }
                        }
                    }
                }
            }

            // クリックして開く詳細なツリー構造ビューア
            if is_expanded() && !is_leaf {
                div {
                    class: "expression-tree-expanded-card",
                    style: "margin-top: 0.25rem; padding: 0.6rem 0.8rem; background: rgba(0, 0, 0, 0.3); border: 1.5px solid rgba(124, 192, 216, 0.35); border-radius: var(--radius-sm); display: flex; flex-direction: column; gap: 0.45rem; width: 100%; box-sizing: border-box; overflow-x: auto; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);",
                    div { style: "padding: 0.2rem 0; width: 100%; box-sizing: border-box; overflow-x: auto;",
                        TreeLayoutRenderer {
                            node: layout_result.root,
                            selected_node_id,
                            hovered_node_id,
                        }
                    }
                }
            }
        }
    }
}

fn render_child_summary_chip(child: &LayoutNode) -> Element {
    let child_kind = &child.kind;
    let child_is_leaf = child.children.is_empty();

    if child_is_leaf {
        let badge = node_badge_style(child_kind, false, false, false);
        rsx! {
            div {
                key: "{child.id}",
                style: "{badge}; font-size: 0.76rem; padding: 0.08rem 0.32rem;",
                "{child.label}"
            }
        }
    } else {
        rsx! {
            div {
                key: "{child.id}",
                style: "display: inline-flex; align-items: center; gap: 0.2rem; padding: 0.08rem 0.32rem; background: rgba(255, 255, 255, 0.04); border: 1px dashed rgba(255, 255, 255, 0.2); border-radius: var(--radius-xs); font-family: monospace; font-size: 0.74rem; color: var(--text-secondary);",
                span { style: "color: var(--accent);", "{child.label}" }
                span { style: "opacity: 0.6;", "…" }
            }
        }
    }
}

fn outer_bar_container_style(is_leaf: bool, is_expanded: bool) -> String {
    let outer_border = if is_expanded {
        "1px solid rgba(124, 192, 216, 0.45)"
    } else {
        "1px solid var(--border)"
    };

    let outer_bg = if is_expanded {
        "rgba(124, 192, 216, 0.08)"
    } else {
        "rgba(255, 255, 255, 0.03)"
    };

    let cursor_style = if is_leaf { "default" } else { "pointer" };

    format!(
        "display: inline-flex; align-items: center; gap: 0.35rem; padding: 0.2rem 0.45rem; background: {outer_bg}; border: {outer_border}; border-radius: var(--radius-sm); cursor: {cursor_style}; transition: all 0.15s ease; user-select: none; max-width: 100%; overflow-x: auto; box-sizing: border-box;"
    )
}

fn expand_button_style(is_expanded: bool) -> (&'static str, &'static str, &'static str) {
    if is_expanded {
        (
            "rgba(59, 130, 246, 0.2)",
            "#93c5fd",
            "1px solid rgba(147, 197, 253, 0.3)",
        )
    } else {
        (
            "rgba(255, 255, 255, 0.06)",
            "var(--text-secondary)",
            "1px solid transparent",
        )
    }
}
