use narumincho_vdom::*;

use crate::Location;
use crate::app_state::AppState;
use crate::expression_eval::expression_to_source;
use crate::part_projection::{collect_related_part_events, find_part_snapshot};

pub fn part_detail_view(state: &AppState, definition_event_hash: &[u8; 32]) -> Node<AppState> {
    let snapshot = find_part_snapshot(state, definition_event_hash);
    let related_events = collect_related_part_events(state, definition_event_hash);

    Div::new()
        .class("page-shell")
        .style(
            Style::new()
                .set("display", "grid")
                .set("gap", "1rem")
                .set("width", "100%")
                .set("max-width", "800px")
                .set("margin", "0 auto")
                .set("padding", "2rem 1rem"),
        )
        .children(match snapshot {
            Some(snapshot) => vec![
                A::<AppState, Location>::new()
                    .href(Href::Internal(Location::PartList))
                    .children([text("← Back to Parts")])
                    .into_node(),
                H2::new()
                    .style(Style::new().set("font-size", "1.5rem"))
                    .children([text(snapshot.part_name.clone())])
                    .into_node(),
                Div::new()
                    .class("event-detail-card")
                    .style(Style::new().set("display", "grid").set("gap", "0.6rem").set("padding", "1rem"))
                    .children([
                        Div::new()
                            .style(
                                Style::new()
                                    .set("font-size", "0.86rem")
                                    .set("color", "var(--text-secondary)"),
                            )
                            .children([text(format!(
                                "Updated at: {}",
                                snapshot.updated_at.format("%Y-%m-%d %H:%M:%S")
                            ))])
                            .into_node(),
                        if snapshot.part_description.is_empty() {
                            Div::new()
                                .style(Style::new().set("color", "var(--text-secondary)"))
                                .children([text("(no description)")])
                                .into_node()
                        } else {
                            Div::new()
                                .style(Style::new().set("white-space", "pre-wrap"))
                                .children([text(snapshot.part_description)])
                                .into_node()
                        },
                        Div::new()
                            .class("mono")
                            .style(Style::new().set("font-size", "0.85rem").set("opacity", "0.9"))
                            .children([text(format!(
                                "expression: {}",
                                expression_to_source(&snapshot.expression)
                            ))])
                            .into_node(),
                        Div::new()
                            .style(Style::new().set("display", "flex").set("gap", "0.6rem"))
                            .children([
                                A::<AppState, Location>::new()
                                    .href(Href::Internal(Location::Event(*definition_event_hash)))
                                    .children([text("Definition event")])
                                    .into_node(),
                                A::<AppState, Location>::new()
                                    .href(Href::Internal(Location::Event(snapshot.latest_event_hash)))
                                    .children([text("Latest event")])
                                    .into_node(),
                            ])
                            .into_node(),
                    ])
                    .into_node(),
                Div::new()
                    .class("event-detail-card")
                    .style(Style::new().set("display", "grid").set("gap", "0.6rem").set("padding", "1rem"))
                    .children([
                        Div::new()
                            .style(Style::new().set("font-weight", "600"))
                            .children([text("History")])
                            .into_node(),
                        Div::new()
                            .style(Style::new().set("display", "grid").set("gap", "0.4rem"))
                            .children(
                                related_events
                                    .into_iter()
                                    .map(|(event_hash, event)| {
                                        let label = crate::event_presenter::event_kind_label(&event);
                                        A::<AppState, Location>::new()
                                            .href(Href::Internal(Location::Event(event_hash)))
                                            .style(
                                                Style::new()
                                                    .set("display", "grid")
                                                    .set("gap", "0.2rem")
                                                    .set("padding", "0.55rem 0.7rem")
                                                    .set("border", "1px solid var(--border)")
                                                    .set("border-radius", "var(--radius-md)"),
                                            )
                                            .children([
                                                Div::new().children([text(label)]).into_node(),
                                                Div::new()
                                                    .style(
                                                        Style::new()
                                                            .set("font-size", "0.82rem")
                                                            .set("color", "var(--text-secondary)"),
                                                    )
                                                    .children([text(
                                                        event.time.format("%Y-%m-%d %H:%M:%S").to_string(),
                                                    )])
                                                    .into_node(),
                                            ])
                                            .into_node()
                                    })
                                    .collect::<Vec<Node<AppState>>>(),
                            )
                            .into_node(),
                    ])
                    .into_node(),
            ],
            None => vec![
                A::<AppState, Location>::new()
                    .href(Href::Internal(Location::PartList))
                    .children([text("← Back to Parts")])
                    .into_node(),
                Div::new()
                    .style(Style::new().set("color", "var(--text-secondary)"))
                    .children([text("Part not found")])
                    .into_node(),
            ],
        })
        .into_node()
}
