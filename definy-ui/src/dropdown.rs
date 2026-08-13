use crate::AppState;
use narumincho_vdom::*;
use std::rc::Rc;

pub type DropdownOnChange = Rc<dyn Fn(String) -> Box<dyn FnOnce(AppState) -> AppState>>;

pub fn searchable_dropdown(
    state: &AppState,
    name: &str,
    current_value: &str,
    options: &[(String, String)],
    on_change: DropdownOnChange,
) -> Node {
    Div::new()
        .children([
            dropdown_button(
                name,
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

fn dropdown_button(name: &str, current_label: String) -> Node {
    Button::new()
        .type_("button")
        .style(
            Style::new()
                .set("width", "100%")
                .set("text-align", "left")
                .set("padding", "0.4rem 0.6rem")
                .set("background", "var(--surface)")
                .set("border", "1px solid var(--border)")
                .set("border-radius", "var(--radius-sm)")
                .set("color", "var(--text)")
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
                .set("color", "var(--text)")
                .set("border", "1px solid var(--border)")
                .set("border-radius", "var(--radius-sm)")
                .set("box-shadow", "var(--shadow-lg)"),
        )
        .children([
            search_input(name, dropdown_search_query),
            option_list(
                name,
                dropdown_search_query,
                options,
                current_value,
                on_change,
            ),
        ])
        .into_node()
}

fn search_input(name: &str, value: &str) -> Node {
    let search_name = format!("search-{}", name);
    Input::new()
        .type_("text")
        .autofocus(true)
        .name(&search_name)
        .value(value)
        .style(
            Style::new()
                .set("width", "100%")
                .set("padding", "0.4rem 0.6rem")
                .set("border", "none")
                .set("border-bottom", "1px solid var(--border)")
                .set("background", "transparent")
                .set("color", "var(--text)")
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
        }))
        .into_node()
}

fn option_list(
    name: &str,
    dropdown_search_query: &str,
    options: &[(String, String)],
    current_value: &str,
    on_change: DropdownOnChange,
) -> Node {
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
                                "var(--text)"
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

    Div::new()
        .style(
            Style::new()
                .set("display", "flex")
                .set("flex-direction", "column")
                .set("max-height", "15rem")
                .set("overflow-y", "auto"),
        )
        .children(options_list_nodes)
        .into_node()
}

fn dropdown_panel_id(name: &str) -> String {
    format!("dropdown-panel-{}", name)
}

fn anchor_name_id(name: &str) -> String {
    format!("--dropdown-{}", name)
}
