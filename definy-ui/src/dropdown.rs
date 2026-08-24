use crate::AppState;
use narumincho_vdom::*;
use std::rc::Rc;

pub type DropdownOnChange = Rc<dyn Fn(String) -> Box<dyn FnOnce(AppState) -> AppState>>;
pub type DropdownOptionRenderer = Rc<dyn Fn(&str, &str, bool) -> Node>;

pub fn searchable_dropdown(
    state: &AppState,
    name: &str,
    current_value: &str,
    options: &[(String, String)],
    render_option: DropdownOptionRenderer,
) -> Node {
    let current_label = options
        .iter()
        .find_map(|(val, label)| {
            if val == current_value {
                let first = label.split('\t').next().unwrap_or(label.as_str());
                Some(first.to_string())
            } else {
                None
            }
        })
        .unwrap_or_else(|| "Select...".to_string());

    Div::new()
        .children([
            dropdown_button(name, current_label),
            dropdown_panel(
                name,
                &state.dropdown_search_query,
                options,
                current_value,
                render_option,
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
    render_option: DropdownOptionRenderer,
) -> Node {
    Div::new()
        .id(dropdown_panel_id(name))
        .popover()
        .style(
            Style::new()
                .set("position-anchor", anchor_name_id(name))
                .set("top", "anchor(bottom)")
                .set("left", "anchor(left)")
                .set("min-width", "max(100%, 22rem)")
                .set("margin", "2px")
                .set("background", "var(--surface)")
                .set("color", "var(--text)")
                .set("border", "1px solid var(--border)")
                .set("border-radius", "var(--radius-sm)")
                .set("box-shadow", "var(--shadow-lg)"),
        )
        .children([
            search_input(name, dropdown_search_query),
            option_list(dropdown_search_query, options, current_value, render_option),
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
    dropdown_search_query: &str,
    options: &[(String, String)],
    current_value: &str,
    render_option: DropdownOptionRenderer,
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
            render_option(opt_val, opt_label, opt_val == current_value).with_key(opt_val)
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

pub fn button_option_renderer(
    name: impl Into<String>,
    on_change: DropdownOnChange,
) -> DropdownOptionRenderer {
    let panel_id = dropdown_panel_id(name.into().as_str());
    Rc::new(move |value, label, is_selected| {
        let on_change = on_change.clone();
        let value = value.to_string();
        let parts: Vec<&str> = label.split('\t').collect();
        let children_nodes = if parts.len() > 1 {
            let left_text = parts[0];
            let right_text = parts[1..].join(" · ");
            vec![
                Div::new()
                    .style(
                        Style::new()
                            .set("font-weight", "500")
                            .set("white-space", "nowrap")
                            .set("overflow", "hidden")
                            .set("text-overflow", "ellipsis"),
                    )
                    .children([text(left_text)])
                    .into_node(),
                Div::new()
                    .class("mono")
                    .style(
                        Style::new()
                            .set("font-size", "0.72rem")
                            .set("opacity", "0.65")
                            .set("margin-left", "0.8rem")
                            .set("max-width", "14rem")
                            .set("white-space", "nowrap")
                            .set("overflow", "hidden")
                            .set("text-overflow", "ellipsis")
                            .set("text-align", "right"),
                    )
                    .children([text(right_text.as_str())])
                    .into_node(),
            ]
        } else {
            vec![
                Div::new()
                    .style(
                        Style::new()
                            .set("font-weight", "500")
                            .set("white-space", "nowrap")
                            .set("overflow", "hidden")
                            .set("text-overflow", "ellipsis"),
                    )
                    .children([text(label)])
                    .into_node(),
            ]
        };

        Button::new()
            .style(option_style(is_selected))
            .command("hide-popover")
            .command_for(&panel_id)
            .on_click(EventHandler::with_parameter(
                move |set_state, value: &String| {
                    let on_change = on_change.clone();
                    let value = value.clone();
                    async move {
                        set_state(Box::new(|state: AppState| AppState {
                            dropdown_search_query: String::new(),
                            ..state
                        }));
                        set_state(on_change(value));
                    }
                },
                value,
            ))
            .children(children_nodes)
            .into_node()
    })
}

pub fn option_style(is_selected: bool) -> Style {
    Style::new()
        .set("width", "100%")
        .set("display", "flex")
        .set("justify-content", "space-between")
        .set("align-items", "center")
        .set("text-align", "left")
        .set("box-sizing", "border-box")
        .set("padding", "0.45rem 0.65rem")
        .set("border", "none")
        .set("border-bottom", "1px solid rgb(255 255 255 / 0.04)")
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
        )
}

fn dropdown_panel_id(name: &str) -> String {
    format!("dropdown-panel-{}", name)
}

fn anchor_name_id(name: &str) -> String {
    format!("--dropdown-{}", name)
}
