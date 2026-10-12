use std::str::FromStr;
use std::sync::atomic::{AtomicU64, Ordering};

use definy_event::EventHashId;
use dioxus::prelude::*;

use crate::app_state::{AppState, PathStep};
use crate::expression_editor::diagnostics::{
    TypeAnalysis, constructor_default_value_from_type_part,
};
use crate::expression_editor::mutation::{
    apply_selection, get_mut_expression_at_path, set_boolean_value, set_number_value,
    set_string_value,
};
use crate::expression_editor::view::selector::selector_options;
use crate::expression_editor::{ExpressionType, analyze_expression_types};
use crate::page_context::PageContext;

use super::engine::{compute_layout, expression_to_layout_node};
use super::types::LayoutOptions;
use super::view::{TreeLayoutRenderer, tree_node_anchor_name};

/// ページ内に複数のツリーエディタがあってもメニューのアンカー名が衝突しないようにするための連番
static NEXT_TREE_EDITOR_ANCHOR_ID: AtomicU64 = AtomicU64::new(0);

#[component]
pub fn ExpressionTreeEditor(
    state: AppState,
    context: PageContext,
    mut expression: Signal<Option<definy_event::event::Expression>>,
    #[props(default = None)] expected_type: Option<ExpressionType>,
    #[props(default = 720.0)] max_width: f32,
    #[props(default = None)] on_change: Option<EventHandler<definy_event::event::Expression>>,
) -> Element {
    let language = context.language;
    let mut selected_node_id = use_signal(|| None::<String>);
    let hovered_node_id = use_signal(|| None::<String>);
    let mut selected_path = use_signal(|| None::<Vec<PathStep>>);

    // 選択ノード直下に表示するドロップダウンメニュー (popover) 用の状態
    let anchor_id = use_hook(|| NEXT_TREE_EDITOR_ANCHOR_ID.fetch_add(1, Ordering::Relaxed));
    let menu_panel_id = format!("tree-editor-menu-{anchor_id}");
    let menu_search_input_name = format!("tree-editor-menu-search-{anchor_id}");
    let mut menu_search_query = use_signal(String::new);
    let mut menu_highlighted_index = use_signal(|| None::<usize>);

    let expr_opt = expression();

    // 型解析の実行
    let analysis = if let Some(expr) = &expr_opt {
        analyze_expression_types(&state, expr, expected_type.clone())
    } else {
        TypeAnalysis::default()
    };

    let diagnostics_sig = use_signal(|| analysis.diagnostics.clone());
    let mut d_sig = diagnostics_sig;
    if *d_sig.peek() != analysis.diagnostics {
        d_sig.set(analysis.diagnostics.clone());
    }

    let expected_types_sig = use_signal(|| analysis.expected_types.clone());
    let mut e_sig = expected_types_sig;
    if *e_sig.peek() != analysis.expected_types {
        e_sig.set(analysis.expected_types.clone());
    }

    let is_type_editor = expected_type.as_ref() == Some(&ExpressionType::Type);

    let expr = match expr_opt {
        Some(e) => e,
        None => {
            let empty_text = if is_type_editor {
                language.label(
                    "(No type specified)",
                    "(型が指定されていません)",
                    "(Neniu tipo difinita)",
                )
            } else {
                language.label(
                    "(No expression specified)",
                    "(式が設定されていません)",
                    "(Neniu esprimo difinita)",
                )
            };
            return rsx! {
                div { style: "display: grid; gap: 0.6rem; padding: 0.85rem 1rem; background: rgb(0 0 0 / 0.15); border: 1.5px dashed var(--border); border-radius: var(--radius-sm); width: 100%; box-sizing: border-box;",
                    div { style: "display: flex; justify-content: space-between; align-items: center; gap: 0.6rem; flex-wrap: wrap;",
                        div { style: "font-size: 0.82rem; color: var(--text-secondary);",
                            "{empty_text}"
                        }
                    }
                    div { style: "display: flex; gap: 0.45rem; flex-wrap: wrap;",
                        if is_type_editor {
                            button {
                                r#type: "button",
                                class: "btn-secondary",
                                style: "padding: 0.22rem 0.55rem; font-size: 0.78rem;",
                                onclick: move |_| {
                                    let new_expr = definy_event::event::Expression::TypeNumber;
                                    expression.set(Some(new_expr.clone()));
                                    if let Some(cb) = on_change {
                                        cb.call(new_expr);
                                    }
                                },
                                "+ Number"
                            }
                            button {
                                r#type: "button",
                                class: "btn-secondary",
                                style: "padding: 0.22rem 0.55rem; font-size: 0.78rem;",
                                onclick: move |_| {
                                    let new_expr = definy_event::event::Expression::TypeString;
                                    expression.set(Some(new_expr.clone()));
                                    if let Some(cb) = on_change {
                                        cb.call(new_expr);
                                    }
                                },
                                "+ String"
                            }
                            button {
                                r#type: "button",
                                class: "btn-secondary",
                                style: "padding: 0.22rem 0.55rem; font-size: 0.78rem;",
                                onclick: move |_| {
                                    let new_expr = definy_event::event::Expression::TypeBoolean;
                                    expression.set(Some(new_expr.clone()));
                                    if let Some(cb) = on_change {
                                        cb.call(new_expr);
                                    }
                                },
                                "+ Boolean"
                            }
                            button {
                                r#type: "button",
                                class: "btn-secondary",
                                style: "padding: 0.22rem 0.55rem; font-size: 0.78rem;",
                                onclick: move |_| {
                                    let new_expr = definy_event::event::Expression::TypeList(definy_event::event::TypeListExpression {
                                        item_type: Box::new(definy_event::event::Expression::TypeString),
                                    });
                                    expression.set(Some(new_expr.clone()));
                                    if let Some(cb) = on_change {
                                        cb.call(new_expr);
                                    }
                                },
                                "+ List<String>"
                            }
                            button {
                                r#type: "button",
                                class: "btn-secondary",
                                style: "padding: 0.22rem 0.55rem; font-size: 0.78rem;",
                                onclick: move |_| {
                                    let new_expr = definy_event::event::Expression::TypeLiteral(definy_event::event::TypeLiteralExpression {
                                        items: vec![
                                            definy_event::event::TypeLiteralItemExpression {
                                                key: "id".into(),
                                                value: Box::new(definy_event::event::Expression::TypeNumber),
                                            },
                                        ],
                                    });
                                    expression.set(Some(new_expr.clone()));
                                    if let Some(cb) = on_change {
                                        cb.call(new_expr);
                                    }
                                },
                                "+ Record"
                            }
                        } else {
                            button {
                                r#type: "button",
                                class: "btn-secondary",
                                style: "padding: 0.22rem 0.55rem; font-size: 0.78rem;",
                                onclick: move |_| {
                                    let new_expr = definy_event::event::Expression::Number(definy_event::event::NumberExpression {
                                        value: 0,
                                    });
                                    expression.set(Some(new_expr.clone()));
                                    if let Some(cb) = on_change {
                                        cb.call(new_expr);
                                    }
                                },
                                "+ 0 (Number)"
                            }
                            button {
                                r#type: "button",
                                class: "btn-secondary",
                                style: "padding: 0.22rem 0.55rem; font-size: 0.78rem;",
                                onclick: move |_| {
                                    let new_expr = definy_event::event::Expression::String(definy_event::event::StringExpression {
                                        value: "".into(),
                                    });
                                    expression.set(Some(new_expr.clone()));
                                    if let Some(cb) = on_change {
                                        cb.call(new_expr);
                                    }
                                },
                                "+ \"\" (String)"
                            }
                            button {
                                r#type: "button",
                                class: "btn-secondary",
                                style: "padding: 0.22rem 0.55rem; font-size: 0.78rem;",
                                onclick: move |_| {
                                    let new_expr = definy_event::event::Expression::Boolean(definy_event::event::BooleanExpression {
                                        value: true,
                                    });
                                    expression.set(Some(new_expr.clone()));
                                    if let Some(cb) = on_change {
                                        cb.call(new_expr);
                                    }
                                },
                                "+ true (Boolean)"
                            }
                            button {
                                r#type: "button",
                                class: "btn-secondary",
                                style: "padding: 0.22rem 0.55rem; font-size: 0.78rem;",
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
                                "+ plus 1 2"
                            }
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
            definy_event::event::Expression::Number(n) => format!("number ({})", n.value),
            definy_event::event::Expression::String(s) => format!("string (\"{}\")", s.value),
            definy_event::event::Expression::Boolean(b) => format!("boolean ({})", b.value),
            definy_event::event::Expression::TypeNumber => "type:Number".to_string(),
            definy_event::event::Expression::TypeString => "type:String".to_string(),
            definy_event::event::Expression::TypeBoolean => "type:Boolean".to_string(),
            definy_event::event::Expression::TypeList(_) => "type:List".to_string(),
            definy_event::event::Expression::TypeLiteral(_) => "type:Record".to_string(),
            definy_event::event::Expression::TypeFunction(_) => "type:Function".to_string(),
            definy_event::event::Expression::TypeUnion(_) => "type:Union".to_string(),
            definy_event::event::Expression::Add(_) => "plus".to_string(),
            definy_event::event::Expression::Subtract(_) => "minus".to_string(),
            definy_event::event::Expression::Multiply(_) => "multiply".to_string(),
            definy_event::event::Expression::Divide(_) => "divide".to_string(),
            definy_event::event::Expression::Remainder(_) => "remainder".to_string(),
            definy_event::event::Expression::Equal(_) => "equal".to_string(),
            definy_event::event::Expression::NotEqual(_) => "not-equal".to_string(),
            definy_event::event::Expression::LessThan(_) => "less-than".to_string(),
            definy_event::event::Expression::LessThanOrEqual(_) => "less-than-or-equal".to_string(),
            definy_event::event::Expression::GreaterThan(_) => "greater-than".to_string(),
            definy_event::event::Expression::GreaterThanOrEqual(_) => {
                "greater-than-or-equal".to_string()
            }
            definy_event::event::Expression::And(_) => "and".to_string(),
            definy_event::event::Expression::Or(_) => "or".to_string(),
            definy_event::event::Expression::Not(_) => "not".to_string(),
            definy_event::event::Expression::If(_) => "if".to_string(),
            definy_event::event::Expression::Let(_) => "let".to_string(),
            definy_event::event::Expression::ListLiteral(_) => "list".to_string(),
            definy_event::event::Expression::RecordGet(_) => "record_get".to_string(),
            _ => "expression".to_string(),
        })
        .unwrap_or_default();

    let slot_expected_type = sel_path_val
        .as_ref()
        .and_then(|p| analysis.expected_types.get(p));
    let slot_diagnostic = sel_path_val
        .as_ref()
        .and_then(|p| analysis.diagnostics.iter().find(|d| d.path == *p));

    let available_options = if let Some(target_path) = sel_path_val.as_ref() {
        let is_root = target_path.is_empty();
        let target_expected = analysis
            .expected_types
            .get(target_path)
            .or(expected_type.as_ref());
        selector_options(
            &state,
            language,
            &[],
            is_root,
            target_expected,
            &analysis.variable_types,
        )
    } else {
        Vec::new()
    };

    let error_count = analysis.diagnostics.len();
    let type_errors_text = language.label("type error(s)", "件の型不一致", "tip-eraro(j)");
    let selected_label = language.label("Selected:", "選択中:", "Elektita:");
    let expects_label = language.label("Expects:", "期待:", "Atendas:");
    let deselect_label = language.label("Deselect", "選択解除", "Malelekti");
    let active_anchor_name = selected_node_id()
        .map(|id| tree_node_anchor_name(anchor_id, &id))
        .unwrap_or_else(|| format!("--tree-node-{anchor_id}-none"));

    rsx! {
        div {
            class: "expression-tree-editor",
            style: "display: grid; gap: 0.45rem; width: 100%; box-sizing: border-box;",

            // 1. 型エラーがある場合の警告バー
            if error_count > 0 {
                div {
                    class: "tree-editor-status-bar",
                    style: "display: flex; justify-content: flex-end; align-items: center; flex-wrap: wrap; gap: 0.5rem; font-size: 0.78rem;",
                    span { style: "color: #fca5a5; background: rgba(239, 68, 68, 0.18); border: 1px solid #ef4444; padding: 0.15rem 0.5rem; border-radius: var(--radius-full); font-weight: 600; display: inline-flex; align-items: center; gap: 0.3rem;",
                        span { "⚠" }
                        span { "{error_count} {type_errors_text}" }
                    }
                }
            }

            // 2. 選択ノード直下に表示するドロップダウンメニュー（式・演算子の検索切り替え）
            crate::dropdown::SearchableDropdownPanel {
                panel_id: menu_panel_id.clone(),
                anchor_name: active_anchor_name,
                search_input_name: menu_search_input_name.clone(),
                current_value: String::new(),
                options: available_options,
                search_query: menu_search_query,
                highlighted_index: menu_highlighted_index,
                header: rsx! {
                    div { style: "display: flex; align-items: center; gap: 0.45rem; flex-wrap: wrap; padding: 0.4rem 0.6rem; border-bottom: 1px solid var(--border); font-size: 0.76rem;",
                        span { style: "font-weight: 600; color: var(--accent); white-space: nowrap;", "{selected_label}" }
                        span {
                            class: "mono",
                            style: "background: rgb(0 0 0 / 0.3); padding: 0.08rem 0.45rem; border-radius: var(--radius-full); color: #86efac; border: 1px solid rgb(255 255 255 / 0.1);",
                            "{current_kind_label}"
                        }
                        if let Some(exp) = slot_expected_type {
                            span { style: "color: var(--text-secondary); white-space: nowrap;",
                                "{expects_label} "
                                span {
                                    class: "mono",
                                    style: "color: #93c5fd; font-weight: 600;",
                                    "{exp.text()}"
                                }
                            }
                        }
                        // 選択解除ボタン
                        button {
                            r#type: "button",
                            title: "{deselect_label}",
                            style: "margin-left: auto; padding: 0.05rem 0.4rem; font-size: 0.72rem; border-radius: var(--radius-full); border: 1px solid var(--border); background: transparent; color: var(--text-secondary); cursor: pointer; line-height: 1.4;",
                            onclick: {
                                let menu_panel_id = menu_panel_id.clone();
                                move |_| {
                                    crate::dropdown::hide_popover(&menu_panel_id);
                                    selected_node_id.set(None);
                                    selected_path.set(None);
                                }
                            },
                            "✕"
                        }
                        if let Some(diag) = slot_diagnostic {
                            div { style: "flex-basis: 100%; color: #fca5a5; background: rgba(239, 68, 68, 0.2); border: 1px solid #ef4444; padding: 0.1rem 0.45rem; border-radius: var(--radius-sm);",
                                "⚠ {diag.message}"
                            }
                        }
                    }
                },
                on_change: {
                    let state = state.clone();
                    move |selected_value: String| {
                        let Some(target_path) = selected_path.read().clone() else {
                            return;
                        };
                        let constructor_default = selected_value
                            .strip_prefix("expr:constructor:")
                            .and_then(|val| EventHashId::from_str(val).ok())
                            .map(|hash| {
                                (
                                    hash.clone(),
                                    constructor_default_value_from_type_part(&state, &hash),
                                )
                            });
                        let mut current_opt = expression.read().clone();
                        apply_selection(
                            &state,
                            &mut current_opt,
                            &target_path,
                            &selected_value,
                            constructor_default,
                        );
                        expression.set(current_opt.clone());
                        if let (Some(cb), Some(expr_val)) = (on_change, current_opt) {
                            cb.call(expr_val);
                        }
                    }
                },
            }

            // 3. 木構造レンダラー（インライン直接編集対応 & 型エラー可視化）
            div {
                class: "expression-tree-container",
                style: "width: 100%; max-width: 100%; overflow-x: auto; padding: 0.6rem 0.8rem; background: rgb(0 0 0 / 0.12); border: 1px solid var(--border); border-radius: var(--radius-sm); display: flex; flex-direction: column; align-items: flex-start; box-sizing: border-box;",
                TreeLayoutRenderer {
                    node: layout_result.root,
                    selected_node_id,
                    hovered_node_id,
                    diagnostics: diagnostics_sig,
                    expected_types: expected_types_sig,
                    editable: true,
                    selection_anchor_id: Some(anchor_id),
                    on_select_node: {
                        let menu_panel_id = menu_panel_id.clone();
                        let menu_search_input_name = menu_search_input_name.clone();
                        move |(id, path): (String, Vec<PathStep>)| {
                            // 数値・文字列リテラルはノード上で直接編集するので検索欄にフォーカスを移さない
                            let mut cloned = expression.read().clone();
                            let is_inline_editable_literal = cloned
                                .as_mut()
                                .and_then(|e| get_mut_expression_at_path(e, &path))
                                .is_some_and(|sub| {
                                    matches!(
                                        sub,
                                        definy_event::event::Expression::Number(_)
                                        | definy_event::event::Expression::String(_)
                                    )
                                });
                            let node_anchor = tree_node_anchor_name(anchor_id, &id);
                            selected_node_id.set(Some(id));
                            selected_path.set(Some(path));
                            menu_search_query.set(String::new());
                            menu_highlighted_index.set(None);
                            crate::dropdown::show_anchored_popover(
                                &menu_panel_id,
                                &node_anchor,
                                (!is_inline_editable_literal)
                                    .then_some(menu_search_input_name.as_str()),
                            );
                        }
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
