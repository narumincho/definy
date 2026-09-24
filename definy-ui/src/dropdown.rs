use dioxus::prelude::*;
use std::rc::Rc;

#[cfg(target_arch = "wasm32")]
use wasm_bindgen::JsCast;

fn dom_scroll_into_view(_id: &str) {
    #[cfg(target_arch = "wasm32")]
    if let Some(window) = web_sys::window() {
        if let Some(doc) = window.document() {
            if let Some(elem) = doc.get_element_by_id(_id) {
                elem.scroll_into_view();
            }
        }
    }
}

fn dom_hide_popover(_panel_id: &str) {
    #[cfg(target_arch = "wasm32")]
    if let Some(window) = web_sys::window() {
        if let Some(doc) = window.document() {
            if let Some(elem) = doc.get_element_by_id(_panel_id) {
                let _ =
                    js_sys::Reflect::get(&elem, &wasm_bindgen::JsValue::from_str("hidePopover"))
                        .ok()
                        .and_then(|f| f.dyn_into::<js_sys::Function>().ok())
                        .and_then(|f| f.call0(&elem).ok());
            }
        }
    }
}

fn dom_show_popover_and_focus(_panel_id: &str, _search_input_name: &str) {
    #[cfg(target_arch = "wasm32")]
    if let Some(window) = web_sys::window() {
        if let Some(doc) = window.document() {
            if let Some(elem) = doc.get_element_by_id(_panel_id) {
                let _ =
                    js_sys::Reflect::get(&elem, &wasm_bindgen::JsValue::from_str("showPopover"))
                        .ok()
                        .and_then(|f| f.dyn_into::<js_sys::Function>().ok())
                        .and_then(|f| f.call0(&elem).ok());
            }
            let selector = format!("input[name=\"{}\"]", _search_input_name);
            if let Ok(Some(input)) = doc.query_selector(&selector) {
                if let Ok(html_input) = input.dyn_into::<web_sys::HtmlElement>() {
                    let _ = html_input.focus();
                }
            }
        }
    }
}

pub type DropdownOnChange = Rc<dyn Fn(String)>;

#[component]
pub fn SearchableDropdown(
    name: String,
    current_value: String,
    options: Vec<(String, String)>,
    on_change: EventHandler<String>,
    #[props(default = false)] compact: bool,
    #[props(default = true)] show_arrow: bool,
) -> Element {
    let mut search_query = use_signal(String::new);
    let mut highlighted_index = use_signal(|| None::<usize>);

    let current_label = options
        .iter()
        .find_map(|(val, label)| {
            if *val == current_value {
                let first = label.split('\t').next().unwrap_or(label.as_str());
                Some(first.to_string())
            } else {
                None
            }
        })
        .unwrap_or_else(|| "Select...".to_string());

    let panel_id = dropdown_panel_id(&name);
    let anchor_name = anchor_name_id(&name);

    let query = search_query.read().to_lowercase();
    let filtered_options: Vec<(String, String)> = options
        .iter()
        .filter(|(_, label)| {
            if query.is_empty() {
                true
            } else {
                label.to_lowercase().contains(&query)
            }
        })
        .cloned()
        .collect();

    let effective_highlighted_index = if filtered_options.is_empty() {
        None
    } else {
        match *highlighted_index.read() {
            Some(idx) if idx < filtered_options.len() => Some(idx),
            _ => {
                let cur_idx = filtered_options
                    .iter()
                    .position(|(val, _)| val == &current_value);
                Some(cur_idx.unwrap_or(0))
            }
        }
    };

    let container_style = if compact {
        "width: fit-content; min-width: 6.5rem; max-width: 100%; position: relative;"
    } else {
        "width: 100%; max-width: 100%; position: relative;"
    };

    let button_padding = if compact {
        "padding: 0.25rem 0.5rem; font-size: 0.82rem;"
    } else {
        "padding: 0.42rem 0.75rem;"
    };

    rsx! {
        div { style: "{container_style}",
            button {
                r#type: "button",
                style: "width: 100%; text-align: left; {button_padding} background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-sm); color: var(--text); cursor: pointer; display: flex; justify-content: space-between; align-items: center; gap: 0.4rem; anchor-name: {anchor_name}; box-sizing: border-box;",
                "popovertarget": "{panel_id}",
                "popovertargetaction": "show",
                onkeydown: {
                    let panel_id = panel_id.clone();
                    let name = name.clone();
                    move |evt: KeyboardEvent| {
                        if evt.key() == Key::ArrowDown {
                            evt.prevent_default();
                            dom_show_popover_and_focus(&panel_id, &format!("search-{}", name));
                        }
                    }
                },
                span { style: "white-space: nowrap; overflow: hidden; text-overflow: ellipsis;",
                    "{current_label}"
                }
                if show_arrow {
                    div { style: "opacity: 0.5; font-size: 0.75rem; flex-shrink: 0;",
                        "▼"
                    }
                }
            }
            div {
                id: "{panel_id}",
                "popover": "auto",
                style: "position-anchor: {anchor_name}; top: anchor(bottom); left: anchor(left); min-width: max(16rem, anchor-size(width)); max-width: min(90vw, 32rem); margin: 4px 0 0 0; background: var(--surface); color: var(--text); border: 1px solid var(--border); border-radius: var(--radius-sm); box-shadow: var(--shadow-lg); box-sizing: border-box;",
                input {
                    r#type: "text",
                    autofocus: true,
                    name: "search-{name}",
                    value: "{search_query}",
                    style: "width: 100%; padding: 0.4rem 0.6rem; border: none; border-bottom: 1px solid var(--border); background: transparent; color: var(--text); outline: none; box-sizing: border-box;",
                    oninput: move |evt: FormEvent| {
                        search_query.set(evt.value());
                        highlighted_index.set(Some(0));
                    },
                    onkeydown: {
                        let panel_id = panel_id.clone();
                        let filtered_options = filtered_options.clone();
                        move |evt: KeyboardEvent| {
                            match evt.key() {
                                Key::ArrowDown => {
                                    evt.prevent_default();
                                    if filtered_options.is_empty() {
                                        return;
                                    }
                                    let next_idx = match effective_highlighted_index {
                                        Some(idx) => (idx + 1).min(filtered_options.len() - 1),
                                        None => 0,
                                    };
                                    highlighted_index.set(Some(next_idx));
                                    let item_id = format!("{panel_id}-opt-{next_idx}");
                                    dom_scroll_into_view(&item_id);
                                }
                                Key::ArrowUp => {
                                    evt.prevent_default();
                                    if filtered_options.is_empty() {
                                        return;
                                    }
                                    let prev_idx = match effective_highlighted_index {
                                        Some(idx) => idx.saturating_sub(1),
                                        None => 0,
                                    };
                                    highlighted_index.set(Some(prev_idx));
                                    let item_id = format!("{panel_id}-opt-{prev_idx}");
                                    dom_scroll_into_view(&item_id);
                                }
                                Key::Enter => {
                                    evt.prevent_default();
                                    let selected_opt = effective_highlighted_index
                                        .and_then(|idx| filtered_options.get(idx));
                                    if let Some((opt_val, _)) = selected_opt {
                                        let val = opt_val.clone();
                                        search_query.set(String::new());
                                        highlighted_index.set(None);
                                        on_change.call(val);
                                        dom_hide_popover(&panel_id);
                                    }
                                }
                                Key::Escape => {
                                    search_query.set(String::new());
                                    highlighted_index.set(None);
                                    dom_hide_popover(&panel_id);
                                }
                                _ => {}
                            }
                        }
                    },
                }
                div { style: "display: flex; flex-direction: column; max-height: 15rem; overflow-y: auto;",
                    for (idx, (opt_val, opt_label)) in filtered_options.iter().enumerate() {
                        {
                            let is_selected = opt_val == &current_value;
                            let is_highlighted = effective_highlighted_index == Some(idx);
                            let parts: Vec<&str> = opt_label.split('\t').collect();
                            let opt_val_clone = opt_val.clone();
                            let item_id = format!("{panel_id}-opt-{idx}");
                            let bg = if is_highlighted {
                                "rgb(124 192 216 / 0.18)"
                            } else if is_selected {
                                "rgb(255 255 255 / 0.08)"
                            } else {
                                "transparent"
                            };
                            let color = if is_selected || is_highlighted {
                                "var(--text)"
                            } else {
                                "var(--text-secondary)"
                            };

                            rsx! {
                                button {
                                    key: "{opt_val}",
                                    id: "{item_id}",
                                    r#type: "button",
                                    style: "width: 100%; display: flex; justify-content: space-between; align-items: center; text-align: left; box-sizing: border-box; padding: 0.45rem 0.65rem; border: none; border-bottom: 1px solid rgb(255 255 255 / 0.04); cursor: pointer; background: {bg}; color: {color}; transition: background 0.08s ease;",
                                    "popovertarget": "{panel_id}",
                                    "popovertargetaction": "hide",
                                    onmouseenter: move |_| {
                                        highlighted_index.set(Some(idx));
                                    },
                                    onclick: {
                                        let opt_val_clone = opt_val_clone.clone();
                                        move |_| {
                                            search_query.set(String::new());
                                            highlighted_index.set(None);
                                            on_change.call(opt_val_clone.clone());
                                        }
                                    },
                                    div { style: "display: flex; align-items: center; gap: 0.4rem; overflow: hidden;",
                                        if is_selected {
                                            span { style: "font-size: 0.75rem; color: var(--accent); flex-shrink: 0;",
                                                "✓"
                                            }
                                        } else {
                                            span { style: "display: inline-block; width: 0.75rem; flex-shrink: 0;" }
                                        }
                                        if parts.len() > 1 {
                                            div { style: "font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;",
                                                "{parts[0]}"
                                            }
                                        } else {
                                            div { style: "font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;",
                                                "{opt_label}"
                                            }
                                        }
                                    }
                                    if parts.len() > 1 {
                                        div {
                                            class: "mono",
                                            style: "font-size: 0.72rem; opacity: 0.65; margin-left: 0.8rem; flex-shrink: 0; white-space: nowrap; text-align: right;",
                                            "{parts[1..].join(\" · \")}"
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

fn dropdown_panel_id(name: &str) -> String {
    format!("dropdown-panel-{}", name)
}

fn anchor_name_id(name: &str) -> String {
    format!("--dropdown-{}", name)
}
