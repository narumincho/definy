use crate::AppState;
use crate::i18n;
use narumincho_vdom::*;
use std::rc::Rc;
use wasm_bindgen::JsCast;

pub fn searchable_dropdown(
    state: &AppState,
    name: &str,
    current_value: &str,
    options: &[(String, String)],
    on_change: Rc<dyn Fn(String) -> Box<dyn FnOnce(AppState) -> AppState>>,
) -> Node<AppState> {
    let is_open = state.active_dropdown_name.as_deref() == Some(name);

    let current_label = options
        .iter()
        .find(|(val, _)| val == current_value)
        .map(|(_, label)| label.clone())
        .unwrap_or_else(|| i18n::tr(state, "Select...", "選択...", "Elektu...").to_string());

    let container = Div::new().style(
        Style::new()
            .set("position", "relative")
            .set("display", "inline-block")
            .set("min-width", "12rem"),
    );

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
                            if let Some(document) = web_sys::window().unwrap().document() {
                                let selector = format!("input[name='search-{}']", n);
                                if let Ok(Some(element)) = document.query_selector(&selector) {
                                    if let Ok(input) =
                                        element.dyn_into::<web_sys::HtmlInputElement>()
                                    {
                                        let _ = input.focus();
                                    }
                                }
                            }
                        })
                        .as_ref()
                        .unchecked_ref(),
                    );
                }
            });
        }
    });

    let button = Button::new()
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
                .set("text-overflow", "ellipsis"),
        )
        .on_click(toggle_handler)
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
        ]);

    let mut inner_elements = vec![button.into_node()];

    if is_open {
        let mut backdrop = Div::new().style(
            Style::new()
                .set("position", "fixed")
                .set("top", "0")
                .set("left", "0")
                .set("right", "0")
                .set("bottom", "0")
                .set("z-index", "40")
                .set("cursor", "default"),
        );
        backdrop.events.push((
            "click".to_string(),
            EventHandler::new(|set_state| async move {
                set_state(Box::new(|state: AppState| AppState {
                    active_dropdown_name: None,
                    dropdown_search_query: String::new(),
                    ..state
                }));
            }),
        ));
        inner_elements.push(backdrop.into_node());

        let search_name = format!("search-{}", name);
        let mut search_input = Input::new()
            .type_("text")
            .name(&search_name)
            .value(&state.dropdown_search_query)
            .style(
                Style::new()
                    .set("width", "100%")
                    .set("padding", "0.4rem 0.6rem")
                    .set("border", "none")
                    .set("border-bottom", "1px solid var(--border)")
                    .set("background", "transparent")
                    .set("color", "var(--text-primary)")
                    .set("outline", "none"),
            );
        search_input.attributes.push((
            "placeholder".to_string(),
            i18n::tr(state, "Search...", "検索...", "Serĉi...").to_string(),
        ));
        search_input.events.push((
            "input".to_string(),
            EventHandler::new(move |set_state| {
                let s_name = search_name.clone();
                async move {
                    let value = web_sys::window()
                        .and_then(|w| w.document())
                        .and_then(|d| {
                            d.query_selector(&format!("input[name='{}']", s_name))
                                .ok()
                                .flatten()
                        })
                        .and_then(|e| {
                            wasm_bindgen::JsCast::dyn_into::<web_sys::HtmlInputElement>(e).ok()
                        })
                        .map(|input| input.value())
                        .unwrap_or_default();
                    set_state(Box::new(move |state: AppState| AppState {
                        dropdown_search_query: value,
                        ..state
                    }));
                }
            }),
        ));

        let query = state.dropdown_search_query.to_lowercase();
        let filtered_options = options.iter().filter(|(_, label)| {
            if query.is_empty() {
                true
            } else {
                label.to_lowercase().contains(&query)
            }
        });

        let mut options_list_nodes = vec![];
        for (opt_val, opt_label) in filtered_options {
            let val = opt_val.clone();
            let label_str = opt_label.clone();
            let on_change_clone = on_change.clone();

            let is_selected = val == current_value;

            let mut item = Div::new().style(
                Style::new()
                    .set("padding", "0.4rem 0.6rem")
                    .set("cursor", "pointer")
                    .set(
                        "background",
                        if is_selected {
                            "rgba(255, 255, 255, 0.1)"
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
            );

            item.events.push((
                "click".to_string(),
                EventHandler::new(move |set_state| {
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
                }),
            ));

            let item = item.children([text(&label_str)]);

            options_list_nodes.push(item.into_node());
        }

        let options_container = Div::new()
            .style(
                Style::new()
                    .set("display", "flex")
                    .set("flex-direction", "column")
                    .set("max-height", "15rem")
                    .set("overflow-y", "auto"),
            )
            .children(options_list_nodes);

        let dropdown_panel = Div::new()
            .style(
                Style::new()
                    .set("position", "absolute")
                    .set("top", "100%")
                    .set("left", "0")
                    .set("width", "100%")
                    .set("margin-top", "0.2rem")
                    .set("background", "var(--surface)")
                    .set("border", "1px solid var(--border)")
                    .set("border-radius", "var(--radius-sm)")
                    .set("box-shadow", "var(--shadow-lg)")
                    .set("z-index", "41")
                    .set("display", "flex")
                    .set("flex-direction", "column"),
            )
            .children([search_input.into_node(), options_container.into_node()]);

        inner_elements.push(dropdown_panel.into_node());
    }

    container.children(inner_elements).into_node()
}
