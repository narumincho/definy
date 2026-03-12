use narumincho_vdom::*;

use crate::app_state::AppState;
use crate::module_projection::find_module_snapshot;
use crate::part_projection::collect_part_snapshots;
use crate::Location;

pub fn module_detail_view(state: &AppState, definition_event_hash: &[u8; 32]) -> Node<AppState> {
    let Some(module_snapshot) = find_module_snapshot(state, definition_event_hash) else {
        return Div::new()
            .class("page-shell")
            .style(crate::layout::page_shell_style("1rem"))
            .children([
                H2::new()
                    .style(Style::new().set("font-size", "1.3rem"))
                    .children([text("Module not found")])
                    .into_node(),
            ])
            .into_node();
    };

    let parts_in_module = collect_part_snapshots(state)
        .into_iter()
        .filter(|snapshot| snapshot.module_definition_event_hash == Some(*definition_event_hash))
        .collect::<Vec<_>>();

    let account_name_map = state.account_name_map();
    let author_name = crate::app_state::account_display_name(
        &account_name_map,
        &module_snapshot.account_id,
    );

    Div::new()
        .class("page-shell")
        .style(crate::layout::page_shell_style("1rem"))
        .children([
            Div::new()
                .style(Style::new().set("display", "grid").set("gap", "0.4rem"))
                .children([
                    H2::new()
                        .style(Style::new().set("font-size", "1.3rem"))
                        .children([text(module_snapshot.module_name.clone())])
                        .into_node(),
                    if module_snapshot.module_description.is_empty() {
                        Div::new().children([]).into_node()
                    } else {
                        Div::new()
                            .style(
                                Style::new()
                                    .set("white-space", "pre-wrap")
                                    .set("color", "var(--text-secondary)"),
                            )
                            .children([text(module_snapshot.module_description.clone())])
                            .into_node()
                    },
                    Div::new()
                        .style(
                            Style::new()
                                .set("font-size", "0.85rem")
                                .set("color", "var(--primary)"),
                        )
                        .children([text(format!("latest author: {}", author_name))])
                        .into_node(),
                    Div::new()
                        .style(Style::new().set("display", "flex").set("gap", "0.45rem"))
                        .children([
                            A::<AppState, Location>::new()
                                .href(Href::Internal(Location::Event(
                                    module_snapshot.latest_event_hash,
                                )))
                                .children([text("Latest event")])
                                .into_node(),
                            A::<AppState, Location>::new()
                                .href(Href::Internal(Location::Event(
                                    module_snapshot.definition_event_hash,
                                )))
                                .children([text("Definition event")])
                                .into_node(),
                        ])
                        .into_node(),
                ])
                .into_node(),
            Div::new()
                .style(Style::new().set("margin-top", "1rem"))
                .children([text("Parts in this module")])
                .into_node(),
            if parts_in_module.is_empty() {
                Div::new()
                    .class("event-detail-card")
                    .style(
                        Style::new()
                            .set("padding", "0.9rem")
                            .set("color", "var(--text-secondary)"),
                    )
                    .children([text("No parts in this module yet.")])
                    .into_node()
            } else {
                Div::new()
                    .class("event-list")
                    .style(Style::new().set("display", "grid").set("gap", "0.65rem"))
                    .children(
                        parts_in_module
                            .into_iter()
                            .map(|part| {
                                let part_author = crate::app_state::account_display_name(
                                    &account_name_map,
                                    &part.account_id,
                                );
                                Div::new()
                                    .class("event-card")
                                    .style(
                                        Style::new()
                                            .set("display", "grid")
                                            .set("gap", "0.5rem")
                                            .set("padding", "0.85rem"),
                                    )
                                    .children([
                                        Div::new()
                                            .style(
                                                Style::new()
                                                    .set("font-size", "0.85rem")
                                                    .set("color", "var(--text-secondary)"),
                                            )
                                            .children([text(
                                                part.updated_at
                                                    .format("%Y-%m-%d %H:%M:%S")
                                                    .to_string(),
                                            )])
                                            .into_node(),
                                        Div::new()
                                            .style(Style::new().set("font-size", "0.98rem"))
                                            .children([text(part.part_name)])
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
                                            .style(
                                                Style::new()
                                                    .set("font-size", "0.85rem")
                                                    .set("color", "var(--primary)"),
                                            )
                                            .children([text(format!(
                                                "latest author: {}",
                                                part_author
                                            ))])
                                            .into_node(),
                                        Div::new()
                                            .style(
                                                Style::new()
                                                    .set("display", "flex")
                                                    .set("gap", "0.45rem"),
                                            )
                                            .children([
                                                A::<AppState, Location>::new()
                                                    .href(Href::Internal(Location::Part(
                                                        part.definition_event_hash,
                                                    )))
                                                    .children([text("Open part detail")])
                                                    .into_node(),
                                                A::<AppState, Location>::new()
                                                    .href(Href::Internal(Location::Event(
                                                        part.latest_event_hash,
                                                    )))
                                                    .children([text("Latest event")])
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
