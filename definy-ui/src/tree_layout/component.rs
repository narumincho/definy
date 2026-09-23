use dioxus::prelude::*;

use super::engine::{compute_layout, expression_to_layout_node};
use super::types::LayoutOptions;
use super::view::TreeLayoutRenderer;

#[component]
pub fn ExpressionTreeViewer(
    expression: Option<definy_event::event::Expression>,
    #[props(default = 720.0)] max_width: f32,
    #[props(default = None)] selected_node_id: Option<Signal<Option<String>>>,
    #[props(default = None)] on_node_select: Option<EventHandler<String>>,
) -> Element {
    let internal_selected = use_signal(|| None::<String>);
    let hovered_node_id = use_signal(|| None::<String>);

    let effective_selected = selected_node_id.unwrap_or(internal_selected);

    let expr = match expression {
        Some(e) => e,
        None => {
            return rsx! {
                div {
                    class: "mono",
                    style: "font-size: 0.82rem; color: var(--text-secondary); opacity: 0.7; padding: 0.4rem 0.6rem; background: rgb(0 0 0 / 0.15); border: 1px dashed var(--border); border-radius: var(--radius-sm);",
                    "(none)"
                }
            };
        }
    };

    let layout_options = LayoutOptions {
        max_width: (max_width - 16.0).max(100.0),
        ..Default::default()
    };
    let root_layout_node = expression_to_layout_node(&expr, "root");
    let layout_result = compute_layout(&root_layout_node, &layout_options);

    rsx! {
        div {
            class: "expression-tree-container",
            style: "width: 100%; max-width: 100%; overflow-x: auto; padding: 0.35rem 0.5rem; background: rgb(0 0 0 / 0.12); border: 1px solid var(--border); border-radius: var(--radius-sm); display: flex; flex-direction: column; align-items: flex-start; box-sizing: border-box;",
            TreeLayoutRenderer {
                node: layout_result.root,
                selected_node_id: effective_selected,
                hovered_node_id,
            }
        }
    }
}
