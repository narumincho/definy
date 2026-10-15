use std::str::FromStr;
use std::sync::atomic::{AtomicU64, Ordering};

use definy_event::EventHashId;
use definy_event::event::{
    AddExpression, BooleanExpression, Expression, NumberExpression, StringExpression,
    TypeListExpression, TypeLiteralExpression, TypeLiteralItemExpression,
};
use dioxus::prelude::*;

use crate::app_state::{AppState, PathStep};
use crate::expression_editor::diagnostics::{
    TypeAnalysis, constructor_default_value_from_type_part,
};
use crate::expression_editor::mutation::{
    apply_selection, clear_expression_at_path, get_mut_expression_at_path, set_number_value,
    set_string_value,
};
use crate::expression_editor::{
    ExpressionType, TypeDiagnostic, analyze_expression_types, current_selection_value,
    selector_options_ranked,
};
use crate::language::Language;
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
    expression: Signal<Option<Expression>>,
    #[props(default = None)] expected_type: Option<ExpressionType>,
    #[props(default = 720.0)] max_width: f32,
    #[props(default = None)] on_change: Option<EventHandler<Expression>>,
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

    let mut diagnostics_sig = use_signal(|| analysis.diagnostics.clone());
    if *diagnostics_sig.peek() != analysis.diagnostics {
        diagnostics_sig.set(analysis.diagnostics.clone());
    }

    let mut expected_types_sig = use_signal(|| analysis.expected_types.clone());
    if *expected_types_sig.peek() != analysis.expected_types {
        expected_types_sig.set(analysis.expected_types.clone());
    }

    let is_type_editor = expected_type.as_ref() == Some(&ExpressionType::Type);

    let Some(expr) = expr_opt else {
        return render_empty_expression_editor(language, is_type_editor, expression, on_change);
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
        .map(expression_kind_label)
        .unwrap_or_default();
    let current_selection_val = selected_expr_info
        .as_ref()
        .map(|sub| current_selection_value(&state, sub))
        .unwrap_or_default();

    let slot_expected_type = sel_path_val
        .as_ref()
        .and_then(|p| analysis.expected_types.get(p));
    let slot_diagnostic = sel_path_val
        .as_ref()
        .and_then(|p| analysis.diagnostics.iter().find(|d| d.path == *p));

    let ranked_options = if let Some(target_path) = sel_path_val.as_ref() {
        let is_root = target_path.is_empty();
        let target_expected = analysis
            .expected_types
            .get(target_path)
            .or(expected_type.as_ref());
        selector_options_ranked(
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
    // 期待型に合わない選択肢は区切りの下に薄く表示する
    let type_mismatch_values: std::collections::HashSet<String> = ranked_options
        .iter()
        .filter(|option| option.is_type_mismatch)
        .map(|option| option.value.clone())
        .collect();
    let available_options: Vec<(String, String)> = ranked_options
        .into_iter()
        .map(|option| (option.value, option.label))
        .collect();

    let error_count = analysis.diagnostics.len();
    let type_errors_text = language.label("error(s)", "件のエラー", "eraro(j)");
    let active_anchor_name = selected_node_id()
        .map(|id| tree_node_anchor_name(anchor_id, &id))
        .unwrap_or_else(|| format!("--tree-node-{anchor_id}-none"));

    // 選択中の式だけを未入力にする (Delete / Backspace キー, メニューのボタン)
    let mut clear_selected = {
        let menu_panel_id = menu_panel_id.clone();
        let menu_search_input_name = menu_search_input_name.clone();
        move |path: Vec<PathStep>| {
            let mut curr = expression.read().clone();
            clear_expression_at_path(&mut curr, &path);
            commit_expression_change(expression, on_change, curr);
            menu_search_query.set(String::new());
            if path.is_empty() {
                // ルートを消すと空の式エディタになるので選択も解除する
                crate::dropdown::hide_popover(&menu_panel_id);
                selected_node_id.set(None);
                selected_path.set(None);
            } else if let Some(id) = selected_node_id.peek().clone() {
                // 未入力になった位置にすぐ別の式を選べるよう, 検索欄にフォーカスする
                crate::dropdown::show_anchored_popover(
                    &menu_panel_id,
                    &tree_node_anchor_name(anchor_id, &id),
                    Some(&menu_search_input_name),
                );
            }
        }
    };

    rsx! {
        div {
            class: "expression-tree-editor",
            style: "display: grid; gap: 0.45rem; width: 100%; box-sizing: border-box;",

            // 1. 型エラーがある場合の警告バー
            if error_count > 0 {
                div {
                    class: "tree-editor-status-bar",
                    style: "display: flex; justify-content: flex-end; align-items: center; flex-wrap: wrap; gap: 0.5rem; font-size: 0.78rem;",
                    span { style: "color: var(--red-text); background: var(--red-bg-strong); border: 1px solid var(--red); padding: 0.15rem 0.5rem; border-radius: var(--radius-full); font-weight: 600; display: inline-flex; align-items: center; gap: 0.3rem;",
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
                current_value: current_selection_val,
                options: available_options,
                search_query: menu_search_query,
                highlighted_index: menu_highlighted_index,
                secondary_values: type_mismatch_values,
                secondary_heading: language
                    .label(
                        "Other (type does not match)",
                        "その他 (型が合わない)",
                        "aliaj (tipo ne kongruas)",
                    )
                    .to_string(),
                header: render_menu_header(
                    language,
                    &current_kind_label,
                    slot_expected_type,
                    slot_diagnostic,
                    {
                        let menu_panel_id = menu_panel_id.clone();
                        move |_| {
                            crate::dropdown::hide_popover(&menu_panel_id);
                            selected_node_id.set(None);
                            selected_path.set(None);
                        }
                    },
                    {
                        let mut clear_selected = clear_selected.clone();
                        move |_| {
                            if let Some(path) = selected_path.peek().clone() {
                                clear_selected(path);
                            }
                        }
                    },
                ),
                on_delete_key: {
                    let mut clear_selected = clear_selected.clone();
                    move |_| {
                        if let Some(path) = selected_path.peek().clone() {
                            clear_selected(path);
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
                        commit_expression_change(expression, on_change, current_opt);
                    }
                },
            }

            // 3. 木構造レンダラー（インライン直接編集対応 & 型エラー可視化）
            div {
                class: "expression-tree-container",
                style: "width: 100%; max-width: 100%; overflow-x: auto; padding: 0.6rem 0.8rem; background: var(--bg-inset); border: 1px solid var(--border); border-radius: var(--radius-sm); display: flex; flex-direction: column; align-items: flex-start; box-sizing: border-box;",
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
                                    matches!(sub, Expression::Number(_) | Expression::String(_))
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
                        commit_expression_change(expression, on_change, curr);
                    },
                    on_change_string: move |(path, val): (Vec<PathStep>, String)| {
                        let mut curr = expression.read().clone();
                        set_string_value(&mut curr, &path, &val);
                        commit_expression_change(expression, on_change, curr);
                    },
                    on_clear: move |path: Vec<PathStep>| clear_selected(path),
                }
            }
        }
    }
}

fn commit_expression_change(
    mut expression: Signal<Option<Expression>>,
    on_change: Option<EventHandler<Expression>>,
    next: Option<Expression>,
) {
    expression.set(next.clone());
    if let (Some(cb), Some(expr_val)) = (on_change, next) {
        cb.call(expr_val);
    }
}

fn empty_expression_templates(is_type_editor: bool) -> Vec<(&'static str, Expression)> {
    if is_type_editor {
        vec![
            ("+ Number", Expression::TypeNumber),
            ("+ String", Expression::TypeString),
            ("+ Boolean", Expression::TypeBoolean),
            (
                "+ List<String>",
                Expression::TypeList(TypeListExpression {
                    item_type: Box::new(Expression::TypeString),
                }),
            ),
            (
                "+ Record",
                Expression::TypeLiteral(TypeLiteralExpression {
                    items: vec![TypeLiteralItemExpression {
                        key: "id".into(),
                        value: Box::new(Expression::TypeNumber),
                    }],
                }),
            ),
        ]
    } else {
        vec![
            (
                "+ 0 (Number)",
                Expression::Number(NumberExpression { value: 0 }),
            ),
            (
                "+ \"\" (String)",
                Expression::String(StringExpression { value: "".into() }),
            ),
            (
                "+ true (Boolean)",
                Expression::Boolean(BooleanExpression { value: true }),
            ),
            (
                "+ plus 1 2",
                Expression::Add(AddExpression {
                    left: Box::new(Expression::Number(NumberExpression { value: 1 })),
                    right: Box::new(Expression::Number(NumberExpression { value: 2 })),
                }),
            ),
        ]
    }
}

fn render_empty_expression_editor(
    language: Language,
    is_type_editor: bool,
    expression: Signal<Option<Expression>>,
    on_change: Option<EventHandler<Expression>>,
) -> Element {
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
    let templates = empty_expression_templates(is_type_editor);

    rsx! {
        div { style: "display: grid; gap: 0.6rem; padding: 0.85rem 1rem; background: var(--bg-inset); border: 1.5px dashed var(--border); border-radius: var(--radius-sm); width: 100%; box-sizing: border-box;",
            div { style: "display: flex; justify-content: space-between; align-items: center; gap: 0.6rem; flex-wrap: wrap;",
                div { style: "font-size: 0.82rem; color: var(--text-secondary);", "{empty_text}" }
            }
            div { style: "display: flex; gap: 0.45rem; flex-wrap: wrap;",
                for (label, template_expr) in templates {
                    button {
                        key: "{label}",
                        r#type: "button",
                        class: "btn-secondary",
                        style: "padding: 0.22rem 0.55rem; font-size: 0.78rem;",
                        onclick: move |_| {
                            commit_expression_change(expression, on_change, Some(template_expr.clone()));
                        },
                        "{label}"
                    }
                }
            }
        }
    }
}

fn render_menu_header(
    language: Language,
    current_kind_label: &str,
    slot_expected_type: Option<&ExpressionType>,
    slot_diagnostic: Option<&TypeDiagnostic>,
    on_deselect: impl FnMut(MouseEvent) + 'static,
    on_clear: impl FnMut(MouseEvent) + 'static,
) -> Element {
    let clear_label = language.label(
        "Clear (Delete)",
        "未入力にする (Delete)",
        "Malplenigi (Delete)",
    );
    let selected_label = language.label("Selected:", "選択中:", "Elektita:");
    let expects_label = language.label("Expects:", "期待:", "Atendas:");
    let deselect_label = language.label("Deselect", "選択解除", "Malelekti");
    rsx! {
        div { style: "display: flex; align-items: center; gap: 0.45rem; flex-wrap: wrap; padding: 0.4rem 0.6rem; border-bottom: 1px solid var(--border); font-size: 0.76rem;",
            span { style: "font-weight: 600; color: var(--accent); white-space: nowrap;",
                "{selected_label}"
            }
            span {
                class: "mono",
                style: "background: var(--bg-inset); padding: 0.08rem 0.45rem; border-radius: var(--radius-full); color: var(--green); border: 1px solid var(--overlay-3); max-width: 14rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; vertical-align: middle; display: inline-block;",
                title: "{current_kind_label}",
                "{current_kind_label}"
            }
            if let Some(exp) = slot_expected_type {
                span { style: "color: var(--text-secondary); white-space: nowrap; display: inline-flex; align-items: center; gap: 0.2rem;",
                    "{expects_label} "
                    span {
                        class: "mono",
                        style: "color: var(--blue-text); font-weight: 600; max-width: 10rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; display: inline-block;",
                        title: "{exp.text()}",
                        "{exp.text()}"
                    }
                }
            }
            button {
                r#type: "button",
                title: "{clear_label}",
                style: "margin-left: auto; padding: 0.05rem 0.4rem; font-size: 0.72rem; border-radius: var(--radius-full); border: 1px solid var(--border); background: transparent; color: var(--text-secondary); cursor: pointer; line-height: 1.4;",
                onclick: on_clear,
                "⌫"
            }
            button {
                r#type: "button",
                title: "{deselect_label}",
                style: "padding: 0.05rem 0.4rem; font-size: 0.72rem; border-radius: var(--radius-full); border: 1px solid var(--border); background: transparent; color: var(--text-secondary); cursor: pointer; line-height: 1.4;",
                onclick: on_deselect,
                "✕"
            }
            if let Some(diag) = slot_diagnostic {
                div { style: "flex-basis: 100%; color: var(--red-text); background: var(--red-bg-strong); border: 1px solid var(--red); padding: 0.1rem 0.45rem; border-radius: var(--radius-sm);",
                    "⚠ {diag.message}"
                }
            }
        }
    }
}

fn expression_kind_label(expr: &Expression) -> String {
    match expr {
        Expression::Number(n) => format!("number ({})", n.value),
        Expression::String(s) => format!("string (\"{}\")", s.value),
        Expression::Boolean(b) => format!("boolean ({})", b.value),
        Expression::TypeNumber => "type:Number".to_string(),
        Expression::TypeString => "type:String".to_string(),
        Expression::TypeBoolean => "type:Boolean".to_string(),
        Expression::TypeList(_) => "type:List".to_string(),
        Expression::TypeLiteral(_) => "type:Record".to_string(),
        Expression::TypeFunction(_) => "type:Function".to_string(),
        Expression::TypeUnion(_) => "type:Union".to_string(),
        Expression::Add(_) => "plus".to_string(),
        Expression::Subtract(_) => "minus".to_string(),
        Expression::Multiply(_) => "multiply".to_string(),
        Expression::Divide(_) => "divide".to_string(),
        Expression::Remainder(_) => "remainder".to_string(),
        Expression::BitAnd(_) => "bit_and".to_string(),
        Expression::BitOr(_) => "bit_or".to_string(),
        Expression::BitXor(_) => "bit_xor".to_string(),
        Expression::ShiftLeft(_) => "shift_left".to_string(),
        Expression::ShiftRight(_) => "shift_right".to_string(),
        Expression::Equal(_) => "equal".to_string(),
        Expression::NotEqual(_) => "not-equal".to_string(),
        Expression::LessThan(_) => "less-than".to_string(),
        Expression::LessThanOrEqual(_) => "less-than-or-equal".to_string(),
        Expression::GreaterThan(_) => "greater-than".to_string(),
        Expression::GreaterThanOrEqual(_) => "greater-than-or-equal".to_string(),
        Expression::And(_) => "and".to_string(),
        Expression::Or(_) => "or".to_string(),
        Expression::Not(_) => "not".to_string(),
        Expression::Let(_) => "let".to_string(),
        Expression::ListLiteral(_) => "list".to_string(),
        Expression::RecordGet(_) => "record_get".to_string(),
        Expression::Function(_) => "function".to_string(),
        Expression::Call(_) => "call".to_string(),
        Expression::Match(_) => "match".to_string(),
        Expression::Variant(v) => format!("variant ({})", v.tag),
        Expression::Variable(v) => format!("local (#{})", v.variable_id),
        Expression::PartReference(_) => "part_ref".to_string(),
        Expression::Constructor(_) => "constructor".to_string(),
        Expression::Hole => "unfilled".to_string(),
        _ => "expression".to_string(),
    }
}
