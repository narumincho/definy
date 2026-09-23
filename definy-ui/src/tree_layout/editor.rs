use dioxus::prelude::*;

use crate::app_state::{AppState, PathStep};
use crate::expression_editor::mutation::{
    build_expression_from_selection, get_mut_expression_at_path, set_boolean_value,
    set_number_value, set_string_value,
};

use super::engine::{compute_layout, expression_to_layout_node};
use super::types::LayoutOptions;
use super::view::TreeLayoutRenderer;

#[component]
pub fn ExpressionTreeEditor(
    mut expression: Signal<Option<definy_event::event::Expression>>,
    #[props(default = 720.0)] max_width: f32,
    #[props(default = None)] on_change: Option<EventHandler<definy_event::event::Expression>>,
) -> Element {
    let mut selected_node_id = use_signal(|| None::<String>);
    let hovered_node_id = use_signal(|| None::<String>);
    let mut selected_path = use_signal(|| None::<Vec<PathStep>>);

    let expr_opt = expression();

    let expr = match expr_opt {
        Some(e) => e,
        None => {
            return rsx! {
                div { style: "display: grid; gap: 0.5rem; padding: 0.8rem; background: rgb(0 0 0 / 0.15); border: 1px dashed var(--border); border-radius: var(--radius-sm);",
                    div { style: "font-size: 0.82rem; color: var(--text-secondary);",
                        "(式が設定されていません)"
                    }
                    div { style: "display: flex; gap: 0.4rem; flex-wrap: wrap;",
                        button {
                            r#type: "button",
                            style: "padding: 0.25rem 0.6rem; font-size: 0.78rem; border-radius: var(--radius-sm); border: 1px solid var(--border); background: var(--surface); color: var(--text); cursor: pointer;",
                            onclick: move |_| {
                                let new_expr = definy_event::event::Expression::Number(definy_event::event::NumberExpression {
                                    value: 0,
                                });
                                expression.set(Some(new_expr.clone()));
                                if let Some(cb) = on_change {
                                    cb.call(new_expr);
                                }
                            },
                            "+ 数値 (0) を作成"
                        }
                        button {
                            r#type: "button",
                            style: "padding: 0.25rem 0.6rem; font-size: 0.78rem; border-radius: var(--radius-sm); border: 1px solid var(--border); background: var(--surface); color: var(--text); cursor: pointer;",
                            onclick: move |_| {
                                let new_expr = definy_event::event::Expression::Add(definy_event::event::AddExpression {
                                    left: Box::new(
                                        definy_event::event::Expression::Number(definy_event::event::NumberExpression {
                                            value: 1,
                                        }),
                                    ),
                                    right: Box::new(
                                        definy_event::event::Expression::Number(definy_event::event::NumberExpression {
                                            value: 2,
                                        }),
                                    ),
                                });
                                expression.set(Some(new_expr.clone()));
                                if let Some(cb) = on_change {
                                    cb.call(new_expr);
                                }
                            },
                            "+ plus 1 2 を作成"
                        }
                    }
                }
            };
        }
    };

    // レイアウト計算
    let layout_options = LayoutOptions {
        max_width: (max_width - 16.0).max(100.0),
        ..Default::default()
    };
    let root_layout_node = expression_to_layout_node(&expr, "root");
    let layout_result = compute_layout(&root_layout_node, &layout_options);

    // 選択中のサブ式の情報を取得
    let sel_path_val = selected_path();
    let selected_expr_info = sel_path_val.as_ref().and_then(|p| {
        let mut cloned = expr.clone();
        get_mut_expression_at_path(&mut cloned, p).cloned()
    });

    let current_kind_label = selected_expr_info
        .as_ref()
        .map(|sub| match sub {
            definy_event::event::Expression::Number(n) => format!("Number ({})", n.value),
            definy_event::event::Expression::String(s) => format!("String (\"{}\")", s.value),
            definy_event::event::Expression::Boolean(b) => format!("Boolean ({})", b.value),
            definy_event::event::Expression::Add(_) => "plus".to_string(),
            definy_event::event::Expression::Subtract(_) => "minus".to_string(),
            definy_event::event::Expression::Multiply(_) => "multiply".to_string(),
            definy_event::event::Expression::Divide(_) => "divide".to_string(),
            definy_event::event::Expression::Remainder(_) => "remainder".to_string(),
            definy_event::event::Expression::Equal(_) => "equal".to_string(),
            definy_event::event::Expression::NotEqual(_) => "not_equal".to_string(),
            definy_event::event::Expression::LessThan(_) => "less_than".to_string(),
            definy_event::event::Expression::LessThanOrEqual(_) => "less_than_or_equal".to_string(),
            definy_event::event::Expression::GreaterThan(_) => "greater_than".to_string(),
            definy_event::event::Expression::GreaterThanOrEqual(_) => {
                "greater_than_or_equal".to_string()
            }
            definy_event::event::Expression::And(_) => "and".to_string(),
            definy_event::event::Expression::Or(_) => "or".to_string(),
            definy_event::event::Expression::Not(_) => "not".to_string(),
            definy_event::event::Expression::If(_) => "if".to_string(),
            definy_event::event::Expression::Let(_) => "let".to_string(),
            definy_event::event::Expression::ListLiteral(_) => "list".to_string(),
            definy_event::event::Expression::TypeLiteral(_) => "record".to_string(),
            _ => "expression".to_string(),
        })
        .unwrap_or_default();
    let on_inspector_change = {
        let sel_path_val = sel_path_val.clone();
        move |evt: FormEvent| {
            if let Some(target_path) = sel_path_val.as_ref() {
                let sel = evt.value();
                let default_expr = definy_event::event::Expression::Number(
                    definy_event::event::NumberExpression { value: 0 },
                );
                let mut current = expression.read().clone().unwrap_or(default_expr);
                let next_var_id = 1;
                let state = get_context_or_empty_state();
                let new_sub =
                    build_expression_from_selection(&state, &sel, next_var_id, None, &current);
                if let Some(target_slot) = get_mut_expression_at_path(&mut current, target_path) {
                    *target_slot = new_sub;
                    expression.set(Some(current.clone()));
                    if let Some(cb) = on_change {
                        cb.call(current);
                    }
                }
            }
        }
    };

    rsx! {
        div {
            class: "expression-tree-editor",
            style: "display: grid; gap: 0.45rem; width: 100%; box-sizing: border-box;",

            // ノード・インスペクタ / ツールバー（ノード選択時に表示）
            if let Some(_target_path) = sel_path_val {
                div {
                    class: "node-inspector-bar",
                    style: "display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.5rem; padding: 0.35rem 0.65rem; background: rgb(124 192 216 / 0.1); border: 1px solid var(--accent); border-radius: var(--radius-sm); font-size: 0.8rem;",
                    div { style: "display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;",
                        span { style: "font-weight: 600; color: var(--accent);", "選択中:" }
                        span {
                            class: "mono",
                            style: "background: rgb(0 0 0 / 0.25); padding: 0.1rem 0.35rem; border-radius: var(--radius-xs); color: #86efac;",
                            "{current_kind_label}"
                        }

                        // 式の種類・演算子切り替えセレクトボックス
                        select {
                            style: "padding: 0.2rem 0.45rem; font-size: 0.78rem; border-radius: var(--radius-sm); border: 1px solid var(--border); background: var(--surface); color: var(--text); cursor: pointer;",
                            onchange: on_inspector_change,
                            option { value: "", disabled: true, selected: true,
                                "式・演算子を変更..."
                            }
                            optgroup { label: "演算子",
                                option { value: "expr:add", "plus (+)" }
                                option { value: "expr:subtract", "minus (-)" }
                                option { value: "expr:multiply", "multiply (*)" }
                                option { value: "expr:divide", "divide (/)" }
                                option { value: "expr:remainder", "remainder (%)" }
                                option { value: "expr:equal", "equal (==)" }
                                option { value: "expr:not_equal", "not_equal (!=)" }
                                option { value: "expr:less_than", "less_than (<)" }
                                option { value: "expr:less_than_or_equal", "less_than_or_equal (<=)" }
                                option { value: "expr:greater_than", "greater_than (>)" }
                                option { value: "expr:greater_than_or_equal", "greater_than_or_equal (>=)" }
                                option { value: "expr:and", "and (&&)" }
                                option { value: "expr:or", "or (||)" }
                                option { value: "expr:not", "not (!)" }
                            }
                            optgroup { label: "リテラル・構文",
                                option { value: "expr:number", "Number (数値)" }
                                option { value: "expr:string", "String (文字列)" }
                                option { value: "expr:boolean", "Boolean (真偽値)" }
                                option { value: "expr:list", "List (配列)" }
                                option { value: "expr:if", "If (条件分岐)" }
                                option { value: "expr:let", "Let (変数束縛)" }
                            }
                        }
                    }

                    // 選択解除ボタン
                    button {
                        r#type: "button",
                        style: "padding: 0.15rem 0.45rem; font-size: 0.75rem; border-radius: var(--radius-sm); border: 1px solid var(--border); background: transparent; color: var(--text-secondary); cursor: pointer;",
                        onclick: move |_| {
                            selected_node_id.set(None);
                            selected_path.set(None);
                        },
                        "✕ 選択解除"
                    }
                }
            }

            // 木構造レンダラー（インライン直接編集対応）
            div {
                class: "expression-tree-container",
                style: "width: 100%; max-width: 100%; overflow-x: auto; padding: 0.45rem 0.6rem; background: rgb(0 0 0 / 0.12); border: 1px solid var(--border); border-radius: var(--radius-sm); display: flex; flex-direction: column; align-items: flex-start; box-sizing: border-box;",
                TreeLayoutRenderer {
                    node: layout_result.root,
                    selected_node_id,
                    hovered_node_id,
                    editable: true,
                    on_select_node: move |(id, path): (String, Vec<PathStep>)| {
                        selected_node_id.set(Some(id));
                        selected_path.set(Some(path));
                    },
                    on_change_number: move |(path, val): (Vec<PathStep>, i64)| {
                        let mut curr = expression.read().clone();
                        set_number_value(&mut curr, &path, val);
                        expression.set(curr.clone());
                        if let (Some(cb), Some(expr_val)) = (on_change, curr) {
                            cb.call(expr_val);
                        }
                    },
                    on_change_string: move |(path, val): (Vec<PathStep>, String)| {
                        let mut curr = expression.read().clone();
                        set_string_value(&mut curr, &path, &val);
                        expression.set(curr.clone());
                        if let (Some(cb), Some(expr_val)) = (on_change, curr) {
                            cb.call(expr_val);
                        }
                    },
                    on_change_boolean: move |(path, val): (Vec<PathStep>, bool)| {
                        let mut curr = expression.read().clone();
                        set_boolean_value(&mut curr, &path, val);
                        expression.set(curr.clone());
                        if let (Some(cb), Some(expr_val)) = (on_change, curr) {
                            cb.call(expr_val);
                        }
                    },
                }
            }
        }
    }
}

fn get_context_or_empty_state() -> AppState {
    if let Some(state_sig) = try_use_context::<Signal<AppState>>() {
        state_sig.read().clone()
    } else {
        AppState {
            connection_status: crate::app_state::ConnectionStatus::Connected,
            is_db_connected: false,
            event_cache: std::collections::HashMap::new(),
            event_list_state: crate::app_state::EventListState {
                event_hashes: Vec::new(),
                current_offset: 0,
                page_size: 20,
                is_loading: false,
                has_more: false,
                filter_event_type: None,
            },
            current_key: None,
            force_offline: false,
            local_event_queue: crate::app_state::LocalEventQueueState {
                items: Vec::new(),
                is_loading: false,
                last_error: None,
            },
            focused_path: None,
        }
    }
}
