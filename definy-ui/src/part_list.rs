use definy_event::event::{AccountId, Event, EventContent};
use narumincho_vdom::*;

use crate::app_state::AppState;
use crate::expression_eval::expression_to_source;
use crate::Location;

struct PartSnapshot {
    definition_event_hash: [u8; 32],
    latest_event_hash: [u8; 32],
    account_id: AccountId,
    part_name: String,
    part_description: String,
    expression_source: String,
    updated_at: chrono::DateTime<chrono::Utc>,
}

pub fn part_list_view(state: &AppState) -> Node<AppState> {
    let snapshots = collect_part_snapshots(state);
    let account_name_map = state.account_name_map();

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
                                                part.expression_source
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

fn collect_part_snapshots(state: &AppState) -> Vec<PartSnapshot> {
    let mut events = state
        .created_account_events
        .iter()
        .filter_map(|(hash, event_result)| {
            let (_, event) = event_result.as_ref().ok()?;
            Some((*hash, event))
        })
        .collect::<Vec<([u8; 32], &Event)>>();
    events.sort_by_key(|(_, event)| event.time);

    let mut map = std::collections::HashMap::<[u8; 32], PartSnapshot>::new();
    for (event_hash, event) in events {
        match &event.content {
            EventContent::PartDefinition(part_definition) => {
                map.insert(
                    event_hash,
                    PartSnapshot {
                        definition_event_hash: event_hash,
                        latest_event_hash: event_hash,
                        account_id: event.account_id.clone(),
                        part_name: part_definition.part_name.to_string(),
                        part_description: part_definition.description.to_string(),
                        expression_source: expression_to_source(&part_definition.expression),
                        updated_at: event.time,
                    },
                );
            }
            EventContent::PartUpdate(part_update) => {
                let entry = map
                    .entry(part_update.part_definition_event_hash)
                    .or_insert_with(|| PartSnapshot {
                        definition_event_hash: part_update.part_definition_event_hash,
                        latest_event_hash: event_hash,
                        account_id: event.account_id.clone(),
                        part_name: String::new(),
                        part_description: String::new(),
                        expression_source: "(definition not found)".to_string(),
                        updated_at: event.time,
                    });
                entry.latest_event_hash = event_hash;
                entry.account_id = event.account_id.clone();
                entry.part_name = part_update.part_name.to_string();
                entry.part_description = part_update.part_description.to_string();
                entry.expression_source = expression_to_source(&part_update.expression);
                entry.updated_at = event.time;
            }
            _ => {}
        }
    }

    let mut snapshots = map.into_values().collect::<Vec<PartSnapshot>>();
    snapshots.sort_by(|a, b| b.updated_at.cmp(&a.updated_at));
    snapshots
}
