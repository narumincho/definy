use narumincho_vdom::*;

use crate::app_state::AppState;
use crate::expression_eval::expression_to_source;
use crate::part_projection::collect_part_snapshots;
use crate::Location;

pub fn part_list_view(state: &AppState) -> Node<AppState> {
    let snapshots = collect_part_snapshots(state);
    let account_name_map = state.account_name_map();

    Div::new()
        .class("page-shell")
        .style(crate::layout::page_shell_style("1rem"))
        .children([
            H2::new()
                .style(Style::new().set("font-size", "1.5rem"))
                .children([text("Parts")])
                .into_node(),
            if snapshots.is_empty() {
                Div::new()
                    .class("event-detail-card")
                    .style(
                        Style::new()
                            .set("padding", "1.25rem")
                            .set("color", "var(--text-secondary)"),
                    )
                    .children([text("No parts yet.")])
                    .into_node()
            } else {
                Div::new()
                    .class("event-list")
                    .style(Style::new().set("display", "grid").set("gap", "0.8rem"))
                    .children(
                        snapshots
                            .into_iter()
                            .map(|part| {
                                let account_name = account_name_map
                                    .get(&part.account_id)
                                    .map(|name| name.as_ref())
                                    .unwrap_or("Unknown");
                                Div::new()
                                    .class("event-card")
                                    .style(
                                        Style::new()
                                            .set("display", "grid")
                                            .set("gap", "0.5rem")
                                            .set("padding", "1rem"),
                                    )
                                    .children([
                                        Div::new()
                                            .style(
                                                Style::new()
                                                    .set("font-size", "0.85rem")
                                                    .set("color", "var(--text-secondary)"),
                                            )
                                            .children([text(
                                                part.updated_at.format("%Y-%m-%d %H:%M:%S").to_string(),
                                            )])
                                            .into_node(),
                                        Div::new()
                                            .style(Style::new().set("font-size", "1.1rem"))
                                            .children([text(part.part_name)])
                                            .into_node(),
                                        if part.has_definition {
                                            Div::new().children([]).into_node()
                                        } else {
                                            Div::new()
                                                .style(
                                                    Style::new()
                                                        .set("font-size", "0.82rem")
                                                        .set("color", "var(--text-secondary)"),
                                                )
                                                .children([text("definition event missing")])
                                                .into_node()
                                        },
                                        A::<AppState, Location>::new()
                                            .href(Href::Internal(Location::Part(
                                                part.definition_event_hash,
                                            )))
                                            .children([text("Open part detail")])
                                            .into_node(),
                                        if part.part_description.is_empty() {
                                            Div::new().children([]).into_node()
                                        } else {
                                            Div::new()
                                                .style(
                                                    Style::new()
                                                        .set("white-space", "pre-wrap")
                                                        .set("color", "var(--text-secondary)"),
                                                )
                                                .children([text(part.part_description)])
                                                .into_node()
                                        },
                                        Div::new()
                                            .class("mono")
                                            .style(
                                                Style::new()
                                                    .set("font-size", "0.8rem")
                                                    .set("opacity", "0.8"),
                                            )
                                            .children([text(format!(
                                                "expression: {}",
                                                expression_to_source(&part.expression)
                                            ))])
                                            .into_node(),
                                        Div::new()
                                            .style(
                                                Style::new()
                                                    .set("font-size", "0.85rem")
                                                    .set("color", "var(--primary)"),
                                            )
                                            .children([text(format!("latest author: {}", account_name))])
                                            .into_node(),
                                        Div::new()
                                            .style(Style::new().set("display", "flex").set("gap", "0.6rem"))
                                            .children([
                                                A::<AppState, Location>::new()
                                                    .href(Href::Internal(Location::Event(part.latest_event_hash)))
                                                    .children([text("Latest event")])
                                                    .into_node(),
                                                A::<AppState, Location>::new()
                                                    .href(Href::Internal(Location::Event(part.definition_event_hash)))
                                                    .children([text("Definition event")])
                                                    .into_node(),
                                            ])
                                            .into_node(),
                                    ])
                                    .into_node()
                            })
                            .collect::<Vec<Node<AppState>>>(),
                    )
                    .into_node()
            },
        ])
        .into_node()
}
