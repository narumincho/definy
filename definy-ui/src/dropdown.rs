use crate::AppState;
use narumincho_vdom::*;
use std::rc::Rc;
use wasm_bindgen::JsCast;

pub type DropdownOnChange = Rc<dyn Fn(String) -> Box<dyn FnOnce(AppState) -> AppState>>;

pub fn searchable_dropdown(
    state: &AppState,
    name: &str,
    current_value: &str,
    options: &[(String, String)],
    on_change: DropdownOnChange,
) -> Node {
    let is_open = state.active_dropdown_name.as_deref() == Some(name);

    let dropdown_button_name = name.to_string();
    let toggle_handler = EventHandler::new(move |set_state| {
        let name_str_1 = dropdown_button_name.clone();
        let name_str_2 = dropdown_button_name.clone();
        async move {
            set_state(Box::new(move |state: AppState| {
                let mut next = state.clone();
                if next.active_dropdown_name.as_deref() == Some(name_str_1.as_str()) {
                    next.active_dropdown_name = None;
                } else {
                    next.active_dropdown_name = Some(name_str_1.clone());
                    next.dropdown_search_query = String::new();
                }
                next
            }));

            // Focus the input if we just opened it
            let n = name_str_2;
            wasm_bindgen_futures::spawn_local(async move {
                if let Some(window) = web_sys::window() {
                    let _ = window.request_animation_frame(
                        wasm_bindgen::closure::Closure::once_into_js(move || {
                            if let Some(document) = web_sys::window().unwrap().document()
                                && let Ok(Some(element)) =
                                    document.query_selector(&format!("input[name='search-{}']", n))
                                && let Ok(input) = element.dyn_into::<web_sys::HtmlInputElement>()
                            {
                                let _ = input.focus();
                            }
                        })
                        .as_ref()
                        .unchecked_ref(),
                    );
                }
            });
        }
    });

    Div::new()
        .children([
            dropdown_button(
                name,
                is_open,
                options
                    .iter()
                    .find_map(|(val, label)| {
                        if val == current_value {
                            Some(label.clone())
                        } else {
                            None
                        }
                    })
                    .unwrap_or_else(|| {
                        state
                            .language
                            .label("Select...", "選択...", "Elektu...")
                            .to_string()
                    }),
                toggle_handler,
            ),
            dropdown_panel(
                name,
                &state.dropdown_search_query,
                options,
                current_value,
                on_change,
            ),
        ])
        .into_node()
}

fn dropdown_button(
    name: &str,
    is_open: bool,
    current_label: String,
    toggle_handler: EventHandler,
) -> Node {
    Button::new()
        .type_("button")
        .style(
            Style::new()
                .set("width", "100%")
                .set("text-align", "left")
                .set("padding", "0.4rem 0.6rem")
                .set("background", "var(--surface)")
                .set(
                    "border",
                    if is_open {
                        "1px solid var(--accent)"
                    } else {
                        "1px solid var(--border)"
                    },
                )
                .set("border-radius", "var(--radius-sm)")
                .set("color", "var(--text-primary)")
                .set("cursor", "pointer")
                .set("display", "flex")
                .set("justify-content", "space-between")
                .set("align-items", "center")
                .set("white-space", "nowrap")
                .set("overflow", "hidden")
                .set("text-overflow", "ellipsis")
                .set("anchor-name", anchor_name_id(name)),
        )
        .command_for(dropdown_panel_id(name))
        .command("show-popover")
        // .on_click(toggle_handler)
        .children([
            text(current_label.as_str()),
            Div::new()
                .style(
                    Style::new()
                        .set("opacity", "0.5")
                        .set("font-size", "0.8rem")
                        .set("margin-left", "0.5rem"),
                )
                .children([text("▼")])
                .into_node(),
        ])
        .into_node()
}

fn dropdown_panel(
    name: &str,
    dropdown_search_query: &str,
    options: &[(String, String)],
    current_value: &str,
    on_change: DropdownOnChange,
) -> Node {
    let search_name = format!("search-{}", name);
    let search_input = Input::new()
        .type_("text")
        .name(&search_name)
        .value(dropdown_search_query)
        .style(
            Style::new()
                .set("width", "100%")
                .set("padding", "0.4rem 0.6rem")
                .set("border", "none")
                .set("border-bottom", "1px solid var(--border)")
                .set("background", "transparent")
                .set("color", "var(--text-primary)")
                .set("outline", "none"),
        )
        .on_input(EventHandler::new(move |set_state| {
            let s_name = search_name.clone();
            async move {
                let value = crate::dom::get_input_value(&format!("input[name='{}']", s_name));
                set_state(Box::new(move |state: AppState| AppState {
                    dropdown_search_query: value,
                    ..state
                }));
            }
        }));

    let query = dropdown_search_query.to_lowercase();
    let filtered_options = options.iter().filter(|(_, label)| {
        if query.is_empty() {
            true
        } else {
            label.to_lowercase().contains(&query)
        }
    });

    let options_list_nodes = filtered_options
        .into_iter()
        .map(|(opt_val, opt_label)| {
            let val = opt_val.clone();
            let label_str = opt_label.clone();
            let on_change_clone = on_change.clone();

            let is_selected = val == current_value;

            Button::new()
                .style(
                    Style::new()
                        .set("padding", "0.4rem 0.6rem")
                        .set("cursor", "pointer")
                        .set(
                            "background",
                            if is_selected {
                                "rgb(255 255 255 / 0.1)"
                            } else {
                                "transparent"
                            },
                        )
                        .set(
                            "color",
                            if is_selected {
                                "var(--primary)"
                            } else {
                                "var(--text-primary)"
                            },
                        ),
                )
                .command("hide-popover")
                .command_for(dropdown_panel_id(name))
                .on_click(EventHandler::new(move |set_state| {
                    let on_change_clone = on_change_clone.clone();
                    let val_clone = val.clone();

                    async move {
                        // First close the dropdown
                        set_state(Box::new(|state: AppState| AppState {
                            active_dropdown_name: None,
                            dropdown_search_query: String::new(),
                            ..state
                        }));
                        // Then trigger the on_change handler
                        set_state(on_change_clone(val_clone));
                    }
                }))
                .children([text(&label_str)])
                .into_node()
        })
        .collect::<Vec<_>>();

    let options_container = Div::new()
        .style(
            Style::new()
                .set("display", "flex")
                .set("flex-direction", "column")
                .set("max-height", "15rem")
                .set("overflow-y", "auto"),
        )
        .children(options_list_nodes);

    Div::new()
        .id(dropdown_panel_id(name))
        .popover()
        .style(
            Style::new()
                .set("position-anchor", anchor_name_id(name))
                .set("top", "anchor(bottom)")
                .set("left", "anchor(left)")
                .set("margin", "2px")
                .set("background", "var(--surface)")
                .set("border", "1px solid var(--border)")
                .set("border-radius", "var(--radius-sm)")
                .set("box-shadow", "var(--shadow-lg)")
                .set("z-index", "41"),
        )
        .children([search_input.into_node(), options_container.into_node()])
        .into_node()
}

fn dropdown_panel_id(name: &str) -> String {
    format!("dropdown-panel-{}", name)
}

fn anchor_name_id(name: &str) -> String {
    format!("--dropdown-{}", name)
}
