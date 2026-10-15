use dioxus::prelude::*;
use std::collections::HashSet;
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

/// 描画の反映後に, パネル内の選択中の選択肢がリストの表示範囲に入るようにスクロールする
fn dom_scroll_selected_option_into_view_after_render(_panel_id: &str) {
    #[cfg(target_arch = "wasm32")]
    if let Some(window) = web_sys::window() {
        let panel_id = _panel_id.to_string();
        let callback = wasm_bindgen::closure::Closure::once_into_js(move || {
            let Some(doc) = web_sys::window().and_then(|w| w.document()) else {
                return;
            };
            let selector = format!("#{panel_id} [data-selected=\"true\"]");
            let Ok(Some(item)) = doc.query_selector(&selector) else {
                return;
            };
            let list_selector = format!("#{panel_id} .dropdown-option-list");
            let Ok(Some(list)) = doc.query_selector(&list_selector) else {
                return;
            };
            let item_rect = item.get_bounding_client_rect();
            let list_rect = list.get_bounding_client_rect();
            // 選択中の選択肢をリストの中央付近に置く
            let offset = item_rect.top() - list_rect.top() + f64::from(list.scroll_top());
            let centered = offset - (list_rect.height() - item_rect.height()) / 2.0;
            list.set_scroll_top(centered.max(0.0) as i32);
        });
        // Dioxus の再描画 (新しい選択肢の反映) を待つために 2 フレーム後に実行する
        let outer = wasm_bindgen::closure::Closure::once_into_js(move || {
            if let Some(window) = web_sys::window() {
                let _ = window.request_animation_frame(callback.unchecked_ref());
            }
        });
        let _ = window.request_animation_frame(outer.unchecked_ref());
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

                    if let Some(anchor_name) = _anchor_name {
                        let selector = format!("[style*=\"{}\"]", anchor_name);
                        let anchor_el_opt = doc.query_selector(&selector).ok().flatten();
                        let anchor_rect = anchor_el_opt
                            .as_ref()
                            .map(|el| el.get_bounding_client_rect());

                        let win_w = window
                            .inner_width()
                            .ok()
                            .and_then(|v| v.as_f64())
                            .unwrap_or(1200.0);
                        let win_h = window
                            .inner_height()
                            .ok()
                            .and_then(|v| v.as_f64())
                            .unwrap_or(900.0);

                        let menu_w = 320.0;
                        let menu_h = 320.0;

                        // アンカーの右側にドロップダウンを展開すると画面右端を飛び出すか判定 (またはアンカーが画面右寄りにあるか)
                        let is_right_aligned = anchor_rect.as_ref().is_some_and(|r| {
                            r.left() + menu_w > win_w - 16.0 || r.left() > win_w * 0.55
                        });
                        let is_bottom_aligned = anchor_rect.as_ref().is_some_and(|r| {
                            r.bottom() + menu_h > win_h - 16.0 && r.top() > menu_h
                        });

                        let position_area = match (is_bottom_aligned, is_right_aligned) {
                            (true, true) => "top span-left",
                            (true, false) => "top span-right",
                            (false, true) => "bottom span-left",
                            (false, false) => "bottom span-right",
                        };

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

                        let _ = set_prop_fn.call2(
                            &style,
                            &wasm_bindgen::JsValue::from_str("position-anchor"),
                            &wasm_bindgen::JsValue::from_str(anchor_name),
                        );
                        let _ = set_prop_fn.call2(
                            &style,
                            &wasm_bindgen::JsValue::from_str("position-area"),
                            &wasm_bindgen::JsValue::from_str(position_area),
                        );
                        let _ = set_prop_fn.call2(
                            &style,
                            &wasm_bindgen::JsValue::from_str("position-try-fallbacks"),
                            &wasm_bindgen::JsValue::from_str(
                                "flip-inline, flip-block, flip-block flip-inline",
                            ),
                        );

                        if !supports_anchor {
                            if let Some(rect) = anchor_rect {
                                let top = if is_bottom_aligned {
                                    (rect.top() - menu_h - 4.0).max(4.0)
                                } else {
                                    (rect.bottom() + 4.0).min(win_h - 40.0)
                                };
                                let left = if is_right_aligned {
                                    (rect.right() - menu_w).max(4.0)
                                } else {
                                    rect.left().max(4.0).min((win_w - menu_w - 4.0).max(4.0))
                                };
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
                // ハンドラ内で同期的に focus すると Dioxus のイベント処理が入れ子になるので遅らせる
                crate::dom::focus_first(&format!("input[name=\"{}\"]", search_input_name));
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
    dom_scroll_selected_option_into_view_after_render(panel_id);
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
            dom_scroll_selected_option_into_view_after_render(&panel_id);
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
///
/// `secondary_values` に含まれる選択肢は, `secondary_heading` の区切りの下に薄く表示する.
/// (選択肢は呼び出し側で secondary が後ろになるように並べておく)
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
    #[props(default)] secondary_values: HashSet<String>,
    #[props(default)] secondary_heading: String,
    /// 検索欄が空のときに Delete / Backspace キーが押されたら呼ばれる
    #[props(default = None)]
    on_delete_key: Option<EventHandler<()>>,
    /// Escape キーでメニューを閉じたときに呼ばれる
    #[props(default = None)]
    on_escape: Option<EventHandler<()>>,
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

    let highlight = resolve_highlight(*highlighted_index.read(), &filtered_options, &current_value);
    let effective_highlighted_index = highlight.index();

    // 区切りの見出しは最初の secondary の選択肢の直前に出す (先頭なら区切る必要がないので出さない)
    let secondary_heading_index = filtered_options
        .iter()
        .position(|(val, _)| secondary_values.contains(val))
        .filter(|&idx| idx > 0 && !secondary_heading.is_empty());

    rsx! {
        div {
            id: "{panel_id}",
            "popover": "auto",
            class: "dropdown-popover-panel",
            style: "position: absolute; inset: auto; position-anchor: {anchor_name}; position-area: bottom span-right; position-try-fallbacks: flip-inline, flip-block, flip-block flip-inline; min-width: max(16rem, anchor-size(width)); max-width: min(90vw, 32rem); margin: 4px 0; background-color: var(--surface-opaque); color: var(--text); border: 1px solid var(--border); border-radius: var(--radius-sm); box-shadow: var(--shadow-lg); box-sizing: border-box; overflow: hidden;",
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
                                // 決定した Enter を呼び出し側のキー操作として二重に処理させない
                                evt.stop_propagation();
                                search_query.set(String::new());
                                highlighted_index.set(None);
                                dom_hide_popover(&panel_id);
                                // 矢印キーや検索で選んだ選択肢だけを適用する.
                                // 開いた直後の Enter (現在値が仮にハイライトされているだけ) で式を置き換えない
                                match highlight {
                                    Highlight::Chosen(idx) => {
                                        if let Some((opt_val, _)) = filtered_options.get(idx)
                                            && opt_val != &current_value
                                        {
                                            on_change.call(opt_val.clone());
                                        } else if let Some(on_escape) = on_escape {
                                            on_escape.call(());
                                        }
                                    }
                                    Highlight::Implicit(_) | Highlight::None => {
                                        if let Some(on_escape) = on_escape {
                                            on_escape.call(());
                                        }
                                    }
                                }
                            }
                            Key::Escape => {
                                evt.stop_propagation();
                                search_query.set(String::new());
                                highlighted_index.set(None);
                                dom_hide_popover(&panel_id);
                                if let Some(on_escape) = on_escape {
                                    on_escape.call(());
                                }
                            }
                            Key::Delete | Key::Backspace if search_query.read().is_empty() => {
                                if let Some(on_delete_key) = on_delete_key {
                                    evt.prevent_default();
                                    highlighted_index.set(None);
                                    on_delete_key.call(());
                                }
                            }
                            _ => {}
                        }
                    }
                },
            }
            div {
                class: "dropdown-option-list",
                style: "display: flex; flex-direction: column; max-height: 15rem; overflow-y: auto; overflow-x: hidden;",
                for (idx, (opt_val, opt_label)) in filtered_options.iter().enumerate() {
                    DropdownOptionItem {
                        key: "{opt_val}",
                        idx,
                        heading_before: (secondary_heading_index == Some(idx)).then(|| secondary_heading.clone()),
                        opt_val: opt_val.clone(),
                        opt_label: opt_label.clone(),
                        panel_id: panel_id.clone(),
                        is_selected: opt_val == &current_value,
                        is_highlighted: effective_highlighted_index == Some(idx),
                        is_secondary: secondary_values.contains(opt_val),
                        on_highlight: move |i| highlighted_index.set(Some(i)),
                        on_select: {
                            let panel_id = panel_id.clone();
                            let current_value = current_value.clone();
                            move |val: String| {
                                search_query.set(String::new());
                                highlighted_index.set(None);
                                dom_hide_popover(&panel_id);
                                // 現在と同じ選択肢を選び直しても式を作り直さない (中身が初期値に戻ってしまうため)
                                if val != current_value {
                                    on_change.call(val);
                                } else if let Some(on_escape) = on_escape {
                                    on_escape.call(());
                                }
                            }
                        },
                    }
                }
            }
        }
    }
}

/// 検索付きドロップダウンのハイライト状態
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
enum Highlight {
    /// 矢印キーや検索語の入力でユーザーが選んだ選択肢. Enter で適用する
    Chosen(usize),
    /// 開いた直後に現在値を示しているだけ. Enter では適用しない
    Implicit(usize),
    None,
}

impl Highlight {
    fn index(self) -> Option<usize> {
        match self {
            Highlight::Chosen(idx) | Highlight::Implicit(idx) => Some(idx),
            Highlight::None => None,
        }
    }
}

fn resolve_highlight(
    highlighted_index: Option<usize>,
    filtered_options: &[(String, String)],
    current_value: &str,
) -> Highlight {
    match highlighted_index {
        Some(idx) if idx < filtered_options.len() => Highlight::Chosen(idx),
        _ => filtered_options
            .iter()
            .position(|(val, _)| val == current_value)
            .map_or(Highlight::None, Highlight::Implicit),
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
    #[props(default = false)] is_secondary: bool,
    /// この選択肢の直前に表示する区切りの見出し
    #[props(default = None)]
    heading_before: Option<String>,
    on_highlight: EventHandler<usize>,
    on_select: EventHandler<String>,
) -> Element {
    let parts: Vec<&str> = opt_label.split('\t').collect();
    let item_id = format!("{panel_id}-opt-{idx}");
    // 見た目は main.css の .dropdown-option[data-state] で付ける
    // (状態ごとに style を組み替えると var() を含む background が反映されないため)
    let state = if is_highlighted {
        "highlighted"
    } else if is_selected {
        "selected"
    } else {
        ""
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
        if let Some(heading) = heading_before {
            div { style: "padding: 0.3rem 0.65rem; font-size: 0.7rem; color: var(--text-secondary); background: var(--bg-inset); border-top: 1px solid var(--border); border-bottom: 1px solid var(--border);",
                "{heading}"
            }
        }
        div {
            class: "dropdown-option",
            "data-state": state,
            "data-secondary": if is_secondary { "true" } else { "false" },
            "data-selected": if is_selected { "true" } else { "false" },
            onmouseenter: move |_| on_highlight.call(idx),
            button {
                id: "{item_id}",
                r#type: "button",
                style: "flex: 1; min-width: 0; display: flex; justify-content: space-between; align-items: center; text-align: left; box-sizing: border-box; padding: 0.45rem 0.65rem; border: none; background: transparent; cursor: pointer; color: inherit; font-family: inherit;",
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
                        style: "font-size: 0.72rem; opacity: 0.65; margin-left: 0.8rem; flex-shrink: 1; max-width: 14rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; text-align: right;",
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

#[cfg(test)]
mod highlight_tests {
    use super::*;

    fn options() -> Vec<(String, String)> {
        ["expr:let", "expr:number", "expr:string"]
            .iter()
            .map(|v| (v.to_string(), v.to_string()))
            .collect()
    }

    #[test]
    fn opening_menu_only_implies_current_value() {
        assert_eq!(
            resolve_highlight(None, &options(), "expr:number"),
            Highlight::Implicit(1)
        );
    }

    #[test]
    fn nothing_is_highlighted_when_current_value_is_not_listed() {
        // 以前は先頭 (index 0) をハイライトし, Enter でそれを適用して式を置き換えていた
        assert_eq!(
            resolve_highlight(None, &options(), "expr:other"),
            Highlight::None
        );
    }

    #[test]
    fn arrow_keys_or_search_choose_an_option() {
        assert_eq!(
            resolve_highlight(Some(2), &options(), "expr:number"),
            Highlight::Chosen(2)
        );
        // 絞り込みで範囲外になったら選び直しとみなさない
        assert_eq!(
            resolve_highlight(Some(5), &options(), "expr:number"),
            Highlight::Implicit(1)
        );
    }
}
