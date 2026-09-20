use dioxus::prelude::*;

use crate::app_state::PathStep;
use crate::language::Language;

use super::super::mutation::{
    add_list_item, add_record_item, path_to_key, remove_list_item, remove_record_item,
    set_boolean_value, set_function_parameter_name, set_let_variable_name, set_number_value,
    set_record_item_key, set_string_value,
};

pub(crate) fn number_input(path: Vec<PathStep>, value: i64) -> Element {
    let name = format!("expr-number-{}", path_to_key(path.as_slice()));

    rsx! {
        input {
            name: "{name}",
            r#type: "number",
            value: "{value}",
            style: "padding: 0.25rem 0.5rem; font-size: 0.85rem; border: 1px solid var(--border); border-radius: var(--radius-sm); background: var(--surface); color: var(--text); width: 6rem; box-sizing: border-box;",
            oninput: move |evt: FormEvent| {
                if let Ok(val) = evt.value().parse::<i64>() {
                    let mut expr_sig = use_context::<
                        Signal<Option<definy_event::event::Expression>>,
                    >();
                    let mut expr = expr_sig.read().clone();
                    set_number_value(&mut expr, path.as_slice(), val);
                    expr_sig.set(expr);
                }
            },
        }
    }
}

pub(crate) fn string_input(path: Vec<PathStep>, value: &str) -> Element {
    let name = format!("expr-string-{}", path_to_key(path.as_slice()));

    rsx! {
        input {
            name: "{name}",
            r#type: "text",
            value: "{value}",
            style: "padding: 0.25rem 0.5rem; font-size: 0.85rem; border: 1px solid var(--border); border-radius: var(--radius-sm); background: var(--surface); color: var(--text); flex: 1; min-width: 6rem; max-width: 16rem; box-sizing: border-box;",
            oninput: move |evt: FormEvent| {
                let mut expr_sig = use_context::<
                    Signal<Option<definy_event::event::Expression>>,
                >();
                let mut expr = expr_sig.read().clone();
                set_string_value(&mut expr, path.as_slice(), &evt.value());
                expr_sig.set(expr);
            },
        }
    }
}

pub(crate) fn boolean_input(language: Language, path: Vec<PathStep>, value: bool) -> Element {
    let path_f = path.clone();
    let style_true = if value {
        "padding: 0.2rem 0.55rem; font-size: 0.8rem; border-radius: var(--radius-sm); border: 1px solid var(--border); background: var(--primary); color: #0e1720; font-weight: 600; cursor: pointer;"
    } else {
        "padding: 0.2rem 0.55rem; font-size: 0.8rem; border-radius: var(--radius-sm); border: 1px solid var(--border); background: var(--surface); color: var(--text); cursor: pointer;"
    };
    let style_false = if !value {
        "padding: 0.2rem 0.55rem; font-size: 0.8rem; border-radius: var(--radius-sm); border: 1px solid var(--border); background: var(--primary); color: #0e1720; font-weight: 600; cursor: pointer;"
    } else {
        "padding: 0.2rem 0.55rem; font-size: 0.8rem; border-radius: var(--radius-sm); border: 1px solid var(--border); background: var(--surface); color: var(--text); cursor: pointer;"
    };

    rsx! {
        div { style: "display: flex; gap: 0.35rem;",
            button {
                r#type: "button",
                style: "{style_true}",
                onclick: move |_| {
                    let mut expr_sig = use_context::<
                        Signal<Option<definy_event::event::Expression>>,
                    >();
                    let mut expr = expr_sig.read().clone();
                    set_boolean_value(&mut expr, path.as_slice(), true);
                    expr_sig.set(expr);
                },
                "{language.label(\"True\", \"真\", \"Vera\")}"
            }
            button {
                r#type: "button",
                style: "{style_false}",
                onclick: move |_| {
                    let mut expr_sig = use_context::<
                        Signal<Option<definy_event::event::Expression>>,
                    >();
                    let mut expr = expr_sig.read().clone();
                    set_boolean_value(&mut expr, path_f.as_slice(), false);
                    expr_sig.set(expr);
                },
                "{language.label(\"False\", \"偽\", \"Falsa\")}"
            }
        }
    }
}

pub(crate) fn let_name_input(path: Vec<PathStep>, value: &str) -> Element {
    let name = format!("expr-let-name-{}", path_to_key(path.as_slice()));

    rsx! {
        input {
            name: "{name}",
            r#type: "text",
            value: "{value}",
            style: "padding: 0.25rem 0.5rem; font-size: 0.85rem; border: 1px solid var(--border); border-radius: var(--radius-sm); background: var(--surface); color: var(--text); width: 7.5rem; box-sizing: border-box;",
            oninput: move |evt: FormEvent| {
                let mut expr_sig = use_context::<
                    Signal<Option<definy_event::event::Expression>>,
                >();
                let mut expr = expr_sig.read().clone();
                set_let_variable_name(&mut expr, path.as_slice(), &evt.value());
                expr_sig.set(expr);
            },
        }
    }
}

pub(crate) fn function_param_name_input(path: Vec<PathStep>, value: &str) -> Element {
    let name = format!("expr-func-param-{}", path_to_key(path.as_slice()));

    rsx! {
        input {
            name: "{name}",
            r#type: "text",
            value: "{value}",
            style: "padding: 0.25rem 0.5rem; font-size: 0.85rem; border: 1px solid var(--border); border-radius: var(--radius-sm); background: var(--surface); color: var(--text); width: 7.5rem; box-sizing: border-box;",
            oninput: move |evt: FormEvent| {
                let mut expr_sig = use_context::<
                    Signal<Option<definy_event::event::Expression>>,
                >();
                let mut expr = expr_sig.read().clone();
                set_function_parameter_name(&mut expr, path.as_slice(), &evt.value());
                expr_sig.set(expr);
            },
        }
    }
}

pub(crate) fn record_item_key_input(
    path: Vec<PathStep>,
    item_index: usize,
    value: &str,
) -> Element {
    let name = format!(
        "expr-record-key-{}-{}",
        path_to_key(path.as_slice()),
        item_index
    );

    rsx! {
        input {
            name: "{name}",
            r#type: "text",
            value: "{value}",
            style: "max-width: 12rem; padding: 0.25rem 0.5rem; font-size: 0.85rem; border: 1px solid var(--border); border-radius: var(--radius-sm); background: var(--surface); color: var(--text);",
            oninput: move |evt: FormEvent| {
                let mut expr_sig = use_context::<
                    Signal<Option<definy_event::event::Expression>>,
                >();
                let mut expr = expr_sig.read().clone();
                set_record_item_key(&mut expr, path.as_slice(), item_index, &evt.value());
                expr_sig.set(expr);
            },
        }
    }
}

pub(crate) fn add_record_item_button(language: Language, path: Vec<PathStep>) -> Element {
    rsx! {
        button {
            r#type: "button",
            style: "padding: 0.35rem 0.8rem; background: rgb(255 255 255 / 0.05); border: 1px solid var(--border); border-radius: var(--radius-sm); color: var(--text); cursor: pointer;",
            onclick: move |_| {
                let mut expr_sig = use_context::<
                    Signal<Option<definy_event::event::Expression>>,
                >();
                let mut expr = expr_sig.read().clone();
                add_record_item(&mut expr, path.as_slice());
                expr_sig.set(expr);
            },
            "{language.label(\"+ Add Item\", \"+ 追加\", \"+ Aldoni eron\")}"
        }
    }
}

pub(crate) fn remove_record_item_button(
    language: Language,
    path: Vec<PathStep>,
    item_index: usize,
) -> Element {
    rsx! {
        button {
            r#type: "button",
            style: "padding: 0.25rem 0.5rem; font-size: 0.75rem; background: rgb(255 255 255 / 0.05); border: 1px solid var(--border); border-radius: var(--radius-sm); color: var(--error); cursor: pointer;",
            onclick: move |_| {
                let mut expr_sig = use_context::<
                    Signal<Option<definy_event::event::Expression>>,
                >();
                let mut expr = expr_sig.read().clone();
                remove_record_item(&mut expr, path.as_slice(), item_index);
                expr_sig.set(expr);
            },
            "{language.label(\"Remove\", \"削除\", \"Forigi\")}"
        }
    }
}

pub(crate) fn add_list_item_button(language: Language, path: Vec<PathStep>) -> Element {
    rsx! {
        button {
            r#type: "button",
            style: "padding: 0.35rem 0.8rem; background: rgb(255 255 255 / 0.05); border: 1px solid var(--border); border-radius: var(--radius-sm); color: var(--text); cursor: pointer;",
            onclick: move |_| {
                let mut expr_sig = use_context::<
                    Signal<Option<definy_event::event::Expression>>,
                >();
                let mut expr = expr_sig.read().clone();
                add_list_item(&mut expr, path.as_slice());
                expr_sig.set(expr);
            },
            "{language.label(\"+ Add Item\", \"+ 追加\", \"+ Aldoni eron\")}"
        }
    }
}

pub(crate) fn remove_list_item_button(path: Vec<PathStep>, item_index: usize) -> Element {
    rsx! {
        button {
            r#type: "button",
            style: "padding: 0.2rem 0.5rem; font-size: 0.75rem; background: rgb(255 255 255 / 0.05); border: 1px solid var(--border); border-radius: var(--radius-sm); color: var(--error); cursor: pointer; flex-shrink: 0;",
            onclick: move |_| {
                let mut expr_sig = use_context::<
                    Signal<Option<definy_event::event::Expression>>,
                >();
                let mut expr = expr_sig.read().clone();
                remove_list_item(&mut expr, path.as_slice(), item_index);
                expr_sig.set(expr);
            },
            "×"
        }
    }
}

pub(crate) fn get_tabular_keys(
    list_expression: &definy_event::event::ListLiteralExpression,
) -> Option<Vec<String>> {
    if list_expression.items.is_empty() {
        return None;
    }
    let mut common_keys: Option<Vec<String>> = None;
    for item in &list_expression.items {
        if let definy_event::event::Expression::TypeLiteral(record) = item {
            if record.items.is_empty() {
                return None;
            }
            let keys: Vec<String> = record.items.iter().map(|i| i.key.to_string()).collect();
            if let Some(ref c) = common_keys {
                if c != &keys {
                    return None;
                }
            } else {
                common_keys = Some(keys);
            }
        } else {
            return None;
        }
    }
    common_keys
}
