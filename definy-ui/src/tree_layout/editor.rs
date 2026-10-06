use std::str::FromStr;

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
use super::view::TreeLayoutRenderer;

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

    let expr_opt = expression();

    // 型解析の実行
    let analysis = if let Some(expr) = &expr_opt {
        analyze_expression_types(&state, expr, expected_type.clone())
    } else {
        TypeAnalysis::default()
    };

    let diagnostics_sig = use_signal(|| analysis.diagnostics.clone());
    let mut d_sig = diagnostics_sig;
    d_sig.set(analysis.diagnostics.clone());

    let expected_types_sig = use_signal(|| analysis.expected_types.clone());
    let mut e_sig = expected_types_sig;
    e_sig.set(analysis.expected_types.clone());

    let expected_type_text = match &expected_type {
        Some(t) => t.text(),
        None => language
            .label(
                "Any (no type constraint)",
                "指定なし (Any)",
                "Ĉiu (sen tipo)",
            )
            .to_string(),
    };

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
            let expected_label = language.label("Expected:", "期待する型:", "Atendita:");
            return rsx! {
                div { style: "display: grid; gap: 0.6rem; padding: 0.85rem 1rem; background: rgb(0 0 0 / 0.15); border: 1.5px dashed var(--border); border-radius: var(--radius-sm); width: 100%; box-sizing: border-box;",
                    div { style: "display: flex; justify-content: space-between; align-items: center; gap: 0.6rem; flex-wrap: wrap;",
                        div { style: "font-size: 0.82rem; color: var(--text-secondary);",
                            "{empty_text}"
                        }
                        span { style: "font-size: 0.74rem; color: var(--text-secondary); background: rgb(255 255 255 / 0.04); padding: 0.12rem 0.45rem; border-radius: var(--radius-xs);",
                            "{expected_label} "
                            strong { style: "color: #93c5fd;", "{expected_type_text}" }
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
    let expected_type_header = language.label("Expected Type:", "期待する型:", "Atendita tipo:");
    let type_check_ok_text = language.label(
        "Type check passed",
        "型チェック合格",
        "Tipkontrolo sukcesis",
    );
    let type_errors_text = language.label("type error(s)", "件の型不一致", "tip-eraro(j)");
    let selected_label = language.label("Selected:", "選択中:", "Elektita:");
    let expects_label = language.label("Expects:", "期待:", "Atendas:");
    let deselect_label = language.label("Deselect", "選択解除", "Malelekti");

    rsx! {
        div {
            class: "expression-tree-editor",
            style: "display: grid; gap: 0.45rem; width: 100%; box-sizing: border-box;",

            // 1. トップステータスバー（期待する型の表示 & 型エラーサマリー）
            div {
                class: "tree-editor-status-bar",
                style: "display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem; padding: 0.35rem 0.65rem; background: rgb(0 0 0 / 0.2); border: 1px solid var(--border); border-radius: var(--radius-sm); font-size: 0.78rem;",
                div { style: "display: flex; align-items: center; gap: 0.6rem; flex-wrap: wrap;",
                    span { style: "color: var(--text-secondary);", "{expected_type_header}" }
                    span {
                        class: "mono",
                        style: "background: rgba(56, 189, 248, 0.12); border: 1px solid rgba(56, 189, 248, 0.3); color: #93c5fd; padding: 0.12rem 0.45rem; border-radius: var(--radius-xs); font-weight: 600;",
                        "{expected_type_text}"
                    }
                }
                div { style: "display: flex; align-items: center; gap: 0.5rem;",
                    if error_count == 0 {
                        span { style: "color: #86efac; font-weight: 600; display: inline-flex; align-items: center; gap: 0.25rem;",
                            span { "✓" }
                            span { "{type_check_ok_text}" }
                        }
                    } else {
                        span { style: "color: #fca5a5; background: rgba(239, 68, 68, 0.18); border: 1px solid #ef4444; padding: 0.15rem 0.5rem; border-radius: var(--radius-xs); font-weight: 600; display: inline-flex; align-items: center; gap: 0.3rem;",
                            span { "⚠" }
                            span { "{error_count} {type_errors_text}" }
                        }
                    }
                }
            }

            // 2. ノード・インスペクタ / ツールバー（ノード選択時に表示）
            if let Some(target_path) = sel_path_val {
                div {
                    class: "node-inspector-bar",
                    style: "display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.6rem; padding: 0.4rem 0.75rem; background: rgb(124 192 216 / 0.12); border: 1.5px solid var(--accent); border-radius: var(--radius-sm); font-size: 0.8rem; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);",
                    div { style: "display: flex; align-items: center; gap: 0.6rem; flex-wrap: wrap; min-width: 0;",
                        span { style: "font-weight: 600; color: var(--accent); white-space: nowrap;",
                            "{selected_label}"
                        }
                        span {
                            class: "mono",
                            style: "background: rgb(0 0 0 / 0.3); padding: 0.12rem 0.4rem; border-radius: var(--radius-xs); color: #86efac; border: 1px solid rgb(255 255 255 / 0.1);",
                            "{current_kind_label}"
                        }
                        if let Some(exp) = slot_expected_type {
                            span { style: "color: var(--text-secondary); font-size: 0.76rem; white-space: nowrap;",
                                "{expects_label} "
                                span {
                                    class: "mono",
                                    style: "color: #93c5fd; font-weight: 600;",
                                    "{exp.text()}"
                                }
                            }
                        }
                        if let Some(diag) = slot_diagnostic {
                            span { style: "color: #fca5a5; font-size: 0.76rem; background: rgba(239, 68, 68, 0.2); border: 1px solid #ef4444; padding: 0.1rem 0.4rem; border-radius: var(--radius-xs);",
                                "⚠ {diag.message}"
                            }
                        }
                        // SearchableDropdown による式・演算子の検索切り替え
                        div { style: "min-width: 140px; max-width: 240px;",
                            crate::dropdown::SearchableDropdown {
                                name: format!("tree-edit-sel-{}", target_path.len()),
                                current_value: "式・演算子を変更...".to_string(),
                                options: available_options,
                                compact: true,
                                on_change: {
                                    let target_path = target_path.clone();
                                    let state = state.clone();
                                    move |selected_value: String| {
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
                        }
                    }

                    // 選択解除ボタン
                    button {
                        r#type: "button",
                        style: "padding: 0.18rem 0.5rem; font-size: 0.74rem; border-radius: var(--radius-sm); border: 1px solid var(--border); background: var(--surface); color: var(--text-secondary); cursor: pointer; white-space: nowrap;",
                        onclick: move |_| {
                            selected_node_id.set(None);
                            selected_path.set(None);
                        },
                        "✕ {deselect_label}"
                    }
                }
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
