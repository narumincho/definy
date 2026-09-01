use dioxus::prelude::*;
use std::rc::Rc;

pub type DropdownOnChange = Rc<dyn Fn(String)>;

#[component]
pub fn SearchableDropdown(
    name: String,
    current_value: String,
    options: Vec<(String, String)>,
    on_change: EventHandler<String>,
) -> Element {
    let mut search_query = use_signal(String::new);

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

    rsx! {
        div {
            style: "width: 100%; max-width: 22rem; position: relative;",
            button {
                r#type: "button",
                style: "width: 100%; text-align: left; padding: 0.42rem 0.75rem; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-sm); color: var(--text); cursor: pointer; display: flex; justify-content: space-between; align-items: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; anchor-name: {anchor_name}; box-sizing: border-box;",
                "popovertarget": "{panel_id}",
                "popovertargetaction": "show",
                "{current_label}"
                div {
                    style: "opacity: 0.5; font-size: 0.8rem; margin-left: 0.5rem;",
                    "▼"
                }
            }
            div {
                id: "{panel_id}",
                "popover": "auto",
                style: "position-anchor: {anchor_name}; top: anchor(bottom); left: anchor(left); width: anchor-size(width); min-width: 14rem; max-width: min(90vw, 22rem); margin: 4px 0 0 0; background: var(--surface); color: var(--text); border: 1px solid var(--border); border-radius: var(--radius-sm); box-shadow: var(--shadow-lg); box-sizing: border-box;",
                input {
                    r#type: "text",
                    autofocus: true,
                    name: "search-{name}",
                    value: "{search_query}",
                    style: "width: 100%; padding: 0.4rem 0.6rem; border: none; border-bottom: 1px solid var(--border); background: transparent; color: var(--text); outline: none; box-sizing: border-box;",
                    oninput: move |evt: FormEvent| {
                        search_query.set(evt.value());
                    },
                }
                div {
                    style: "display: flex; flex-direction: column; max-height: 15rem; overflow-y: auto;",
                    for (opt_val, opt_label) in filtered_options {
                        {
                            let is_selected = opt_val == current_value;
                            let parts: Vec<&str> = opt_label.split('\t').collect();
                            let opt_val_clone = opt_val.clone();
                            let bg = if is_selected { "rgb(255 255 255 / 0.1)" } else { "transparent" };
                            let color = if is_selected { "var(--primary)" } else { "var(--text)" };

                            rsx! {
                                button {
                                    key: "{opt_val}",
                                    r#type: "button",
                                    style: "width: 100%; display: flex; justify-content: space-between; align-items: center; text-align: left; box-sizing: border-box; padding: 0.45rem 0.65rem; border: none; border-bottom: 1px solid rgb(255 255 255 / 0.04); cursor: pointer; background: {bg}; color: {color};",
                                    "popovertarget": "{panel_id}",
                                    "popovertargetaction": "hide",
                                    onclick: move |_| {
                                        search_query.set(String::new());
                                        on_change.call(opt_val_clone.clone());
                                    },
                                    if parts.len() > 1 {
                                        div {
                                            style: "font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;",
                                            "{parts[0]}"
                                        }
                                        div {
                                            class: "mono",
                                            style: "font-size: 0.72rem; opacity: 0.65; margin-left: 0.8rem; max-width: 14rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; text-align: right;",
                                            "{parts[1..].join(\" · \")}"
                                        }
                                    } else {
                                        div {
                                            style: "font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;",
                                            "{opt_label}"
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
