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

fn dom_show_popover_and_focus(
    _panel_id: &str,
    _anchor_name: Option<&str>,
    _search_input_name: Option<&str>,
) {
    #[cfg(target_arch = "wasm32")]
    if let Some(window) = web_sys::window() {
        if let Some(doc) = window.document() {
            if let Some(elem) = doc.get_element_by_id(_panel_id) {
                if let Ok(style) =
                    js_sys::Reflect::get(&elem, &wasm_bindgen::JsValue::from_str("style"))
                    && let Ok(set_prop) = js_sys::Reflect::get(
                        &style,
                        &wasm_bindgen::JsValue::from_str("setProperty"),
                    )
                    && let Ok(set_prop_fn) = set_prop.dyn_into::<js_sys::Function>()
                {
                    let _ = set_prop_fn.call2(
                        &style,
                        &wasm_bindgen::JsValue::from_str("inset"),
                        &wasm_bindgen::JsValue::from_str("auto"),
                    );
                    let _ = set_prop_fn.call2(
                        &style,
                        &wasm_bindgen::JsValue::from_str("background-color"),
                        &wasm_bindgen::JsValue::from_str("var(--surface-opaque)"),
                    );
                    let _ = set_prop_fn.call2(
                        &style,
                        &wasm_bindgen::JsValue::from_str("color"),
                        &wasm_bindgen::JsValue::from_str("var(--text)"),
                    );

                    let supports_anchor =
                        js_sys::Reflect::get(&window, &wasm_bindgen::JsValue::from_str("CSS"))
                            .ok()
                            .and_then(|css| {
                                js_sys::Reflect::get(
                                    &css,
                                    &wasm_bindgen::JsValue::from_str("supports"),
                                )
                                .ok()
                            })
                            .and_then(|f| f.dyn_into::<js_sys::Function>().ok())
                            .and_then(|f| {
                                f.call2(
                                    &wasm_bindgen::JsValue::NULL,
                                    &wasm_bindgen::JsValue::from_str("position-area"),
                                    &wasm_bindgen::JsValue::from_str("bottom span-right"),
                                )
                                .ok()
                            })
                            .and_then(|v| v.as_bool())
                            .unwrap_or(false);

                    if let Some(anchor_name) = _anchor_name {
                        let _ = set_prop_fn.call2(
                            &style,
                            &wasm_bindgen::JsValue::from_str("position-anchor"),
                            &wasm_bindgen::JsValue::from_str(anchor_name),
                        );
                        let _ = set_prop_fn.call2(
                            &style,
                            &wasm_bindgen::JsValue::from_str("position-area"),
                            &wasm_bindgen::JsValue::from_str("bottom span-right"),
                        );
                        let _ = set_prop_fn.call2(
                            &style,
                            &wasm_bindgen::JsValue::from_str("position-try-fallbacks"),
                            &wasm_bindgen::JsValue::from_str("flip-block, flip-inline"),
                        );

                        if !supports_anchor {
                            // Safari や CSS Anchor Positioning 未対応環境向けのフォールバック座標計算
                            let selector = format!("[style*=\"anchor-name: {}\"]", anchor_name);
                            if let Ok(Some(anchor_el)) = doc.query_selector(&selector) {
                                let rect = anchor_el.get_bounding_client_rect();
                                let win_h = window
                                    .inner_height()
                                    .ok()
                                    .and_then(|v| v.as_f64())
                                    .unwrap_or(900.0);
                                let win_w = window
                                    .inner_width()
                                    .ok()
                                    .and_then(|v| v.as_f64())
                                    .unwrap_or(1200.0);
                                let menu_h = 320.0;
                                let top = if rect.bottom() + menu_h > win_h && rect.top() > menu_h {
                                    (rect.top() - menu_h - 4.0).max(4.0)
                                } else {
                                    (rect.bottom() + 4.0).min(win_h - 40.0)
                                };
                                let left = rect.left().max(4.0).min((win_w - 340.0).max(4.0));
                                let _ = set_prop_fn.call2(
                                    &style,
                                    &wasm_bindgen::JsValue::from_str("top"),
                                    &wasm_bindgen::JsValue::from_str(&format!("{top}px")),
                                );
                                let _ = set_prop_fn.call2(
                                    &style,
                                    &wasm_bindgen::JsValue::from_str("left"),
                                    &wasm_bindgen::JsValue::from_str(&format!("{left}px")),
                                );
                                let _ = set_prop_fn.call2(
                                    &style,
                                    &wasm_bindgen::JsValue::from_str("position"),
                                    &wasm_bindgen::JsValue::from_str("fixed"),
                                );
                            }
                        } else if let Ok(rem_prop) = js_sys::Reflect::get(
                            &style,
                            &wasm_bindgen::JsValue::from_str("removeProperty"),
                        ) && let Ok(rem_prop_fn) = rem_prop.dyn_into::<js_sys::Function>()
                        {
                            let _ =
                                rem_prop_fn.call1(&style, &wasm_bindgen::JsValue::from_str("top"));
                            let _ =
                                rem_prop_fn.call1(&style, &wasm_bindgen::JsValue::from_str("left"));
                        }
                    }
                }

                let is_open =
                    js_sys::Reflect::get(&elem, &wasm_bindgen::JsValue::from_str("matches"))
                        .ok()
                        .and_then(|f| f.dyn_into::<js_sys::Function>().ok())
                        .and_then(|f| {
                            f.call1(&elem, &wasm_bindgen::JsValue::from_str(":popover-open"))
                                .ok()
                        })
                        .and_then(|v| v.as_bool())
                        .unwrap_or(false);

                if !is_open {
                    let _ = js_sys::Reflect::get(
                        &elem,
                        &wasm_bindgen::JsValue::from_str("showPopover"),
                    )
                    .ok()
                    .and_then(|f| f.dyn_into::<js_sys::Function>().ok())
                    .and_then(|f| f.call0(&elem).ok());
                }
            }
            if let Some(search_input_name) = _search_input_name {
                let selector = format!("input[name=\"{}\"]", search_input_name);
                if let Ok(Some(input)) = doc.query_selector(&selector) {
                    if let Ok(html_input) = input.dyn_into::<web_sys::HtmlElement>() {
                        let _ = html_input.focus();
                    }
                }
            }
        }
    }
}

pub type DropdownOnChange = Rc<dyn Fn(String)>;

fn get_current_label(options: &[(String, String)], current_value: &str) -> String {
    options
        .iter()
        .find_map(|(val, label)| {
            if val == current_value {
                let first = label.split('\t').next().unwrap_or(label.as_str());
                Some(first.to_string())
            } else {
                None
            }
        })
        .unwrap_or_else(|| "Select...".to_string())
}

fn initial_search_query_for_label(label: &str) -> String {
    if label != "Select..." {
        label.to_string()
    } else {
        String::new()
    }
}

/// アンカー要素を指定して popover を表示し、必要であれば検索入力欄にフォーカスする
pub fn show_anchored_popover(
    panel_id: &str,
    anchor_name: &str,
    focus_search_input_name: Option<&str>,
) {
    dom_show_popover_and_focus(panel_id, Some(anchor_name), focus_search_input_name);
}

/// popover を閉じる
pub fn hide_popover(panel_id: &str) {
    dom_hide_popover(panel_id);
}

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

    let current_label = get_current_label(&options, &current_value);
    let panel_id = dropdown_panel_id(&name);
    let anchor_name = anchor_name_id(&name);

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

    let open_and_focus = {
        let current_label = current_label.clone();
        let panel_id = panel_id.clone();
        let name = name.clone();
        move || {
            search_query.set(initial_search_query_for_label(&current_label));
            highlighted_index.set(None);
            dom_show_popover_and_focus(
                &panel_id,
                Some(&anchor_name_id(&name)),
                Some(&format!("search-{}", name)),
            );
        }
    };

    rsx! {
        div { style: "{container_style}",
            button {
                r#type: "button",
                style: "width: 100%; text-align: left; {button_padding} background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-sm); color: var(--text); cursor: pointer; display: flex; justify-content: space-between; align-items: center; gap: 0.4rem; anchor-name: {anchor_name}; box-sizing: border-box;",
                "popovertarget": "{panel_id}",
                "popovertargetaction": "show",
                onclick: {
                    let mut open_and_focus = open_and_focus.clone();
                    move |_| open_and_focus()
                },
                onkeydown: {
                    let mut open_and_focus = open_and_focus.clone();
                    move |evt: KeyboardEvent| {
                        if evt.key() == Key::ArrowDown {
                            evt.prevent_default();
                            open_and_focus();
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
            SearchableDropdownPanel {
                panel_id: panel_id.clone(),
                anchor_name: anchor_name.clone(),
                search_input_name: format!("search-{name}"),
                current_value,
                options,
                search_query,
                highlighted_index,
                initial_query: initial_search_query_for_label(&current_label),
                on_change,
            }
        }
    }
}

/// 検索付き選択肢パネル (popover). `anchor_name` で指定した CSS アンカー要素の直下に表示される.
///
/// 表示は [`show_anchored_popover`] で行う.
#[component]
pub fn SearchableDropdownPanel(
    panel_id: String,
    anchor_name: String,
    search_input_name: String,
    current_value: String,
    options: Vec<(String, String)>,
    mut search_query: Signal<String>,
    mut highlighted_index: Signal<Option<usize>>,
    on_change: EventHandler<String>,
    #[props(default)] initial_query: String,
    #[props(default = None)] header: Option<Element>,
) -> Element {
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

    rsx! {
        div {
            id: "{panel_id}",
            "popover": "auto",
            class: "dropdown-popover-panel",
            style: "position: absolute; inset: auto; position-anchor: {anchor_name}; position-area: bottom span-right; position-try-fallbacks: flip-block, flip-inline; min-width: max(16rem, anchor-size(width)); max-width: min(90vw, 32rem); margin: 4px 0; background-color: var(--surface-opaque); color: var(--text); border: 1px solid var(--border); border-radius: var(--radius-sm); box-shadow: var(--shadow-lg); box-sizing: border-box;",
            {header}
            input {
                r#type: "text",
                name: "{search_input_name}",
                value: "{search_query}",
                style: "width: 100%; padding: 0.4rem 0.6rem; border: none; border-bottom: 1px solid var(--border); border-radius: 0; background: transparent; color: var(--text); outline: none; box-shadow: none; backdrop-filter: none; box-sizing: border-box;",
                onfocus: {
                    let initial_query = initial_query.clone();
                    move |_| {
                        if search_query.read().is_empty() {
                            search_query.set(initial_query.clone());
                        }
                    }
                },
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
                    DropdownOptionItem {
                        key: "{opt_val}",
                        idx,
                        opt_val: opt_val.clone(),
                        opt_label: opt_label.clone(),
                        panel_id: panel_id.clone(),
                        is_selected: opt_val == &current_value,
                        is_highlighted: effective_highlighted_index == Some(idx),
                        on_highlight: move |i| highlighted_index.set(Some(i)),
                        on_select: {
                            let panel_id = panel_id.clone();
                            move |val| {
                                search_query.set(String::new());
                                highlighted_index.set(None);
                                on_change.call(val);
                                dom_hide_popover(&panel_id);
                            }
                        },
                    }
                }
            }
        }
    }
}

#[component]
fn DropdownOptionItem(
    idx: usize,
    opt_val: String,
    opt_label: String,
    panel_id: String,
    is_selected: bool,
    is_highlighted: bool,
    on_highlight: EventHandler<usize>,
    on_select: EventHandler<String>,
) -> Element {
    let parts: Vec<&str> = opt_label.split('\t').collect();
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

    let part_detail_url = resolve_part_detail_url(&opt_val, &parts);
    let display_meta = if parts.len() > 1 {
        let meta_parts: Vec<&str> = parts
            .iter()
            .skip(1)
            .filter(|p| !p.is_empty() && !is_hash_str(p))
            .copied()
            .collect();
        if meta_parts.is_empty() {
            None
        } else {
            Some(meta_parts.join(" · "))
        }
    } else {
        None
    };

    rsx! {
        div {
            style: "width: 100%; display: flex; align-items: center; box-sizing: border-box; border-bottom: 1px solid rgb(255 255 255 / 0.04); background: {bg}; transition: background 0.08s ease;",
            onmouseenter: move |_| on_highlight.call(idx),
            button {
                id: "{item_id}",
                r#type: "button",
                style: "flex: 1; min-width: 0; display: flex; justify-content: space-between; align-items: center; text-align: left; box-sizing: border-box; padding: 0.45rem 0.65rem; border: none; background: transparent; cursor: pointer; color: {color}; font-family: inherit;",
                "popovertarget": "{panel_id}",
                "popovertargetaction": "hide",
                onclick: {
                    let opt_val = opt_val.clone();
                    move |_| on_select.call(opt_val.clone())
                },
                div { style: "display: flex; align-items: center; gap: 0.4rem; overflow: hidden; min-width: 0;",
                    if is_selected {
                        span { style: "font-size: 0.75rem; color: var(--accent); flex-shrink: 0;",
                            "✓"
                        }
                    } else {
                        span { style: "display: inline-block; width: 0.75rem; flex-shrink: 0;" }
                    }
                    div { style: "font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;",
                        if parts.len() > 1 {
                            "{parts[0]}"
                        } else {
                            "{opt_label}"
                        }
                    }
                }
                if let Some(ref meta) = display_meta {
                    div {
                        class: "mono",
                        style: "font-size: 0.72rem; opacity: 0.65; margin-left: 0.8rem; flex-shrink: 0; white-space: nowrap; text-align: right;",
                        "{meta}"
                    }
                }
            }
            if let Some(detail_url) = part_detail_url {
                a {
                    href: "{detail_url}",
                    class: "dropdown-item-link",
                    title: "パーツ詳細画面を開く",
                    onclick: {
                        let panel_id = panel_id.clone();
                        move |_| dom_hide_popover(&panel_id)
                    },
                    "↗"
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

fn is_hash_str(s: &str) -> bool {
    s.len() >= 40
        && s.chars()
            .all(|c| c.is_ascii_alphanumeric() || c == '-' || c == '_')
}

fn resolve_part_detail_url(opt_val: &str, parts: &[&str]) -> Option<String> {
    let hash = opt_val
        .strip_prefix("ref:global:")
        .or_else(|| opt_val.strip_prefix("expr:constructor:"))
        .or_else(|| parts.iter().copied().find(|p| is_hash_str(p)))?;

    let query = {
        #[cfg(target_arch = "wasm32")]
        {
            web_sys::window()
                .and_then(|w| w.location().search().ok())
                .unwrap_or_default()
        }
        #[cfg(not(target_arch = "wasm32"))]
        {
            String::new()
        }
    };

    if !query.is_empty() {
        Some(format!("/parts/{}{}", hash, query))
    } else {
        Some(format!("/parts/{}", hash))
    }
}
