mod editor;
mod history;

use definy_event::EventHashId;
use dioxus::prelude::*;

use crate::Location;
use crate::app_state::AppState;
use crate::page_context::PageContext;
use crate::part_projection::{collect_related_part_events, find_part_snapshot};

pub(crate) use editor::evaluate_and_set_result;

#[component]
pub fn PartDetailView(
    state: AppState,
    context: PageContext,
    definition_event_hash: EventHashId,
) -> Element {
    let snapshot = find_part_snapshot(&state, &definition_event_hash);
    let related_events = collect_related_part_events(&state, &definition_event_hash);
    let page_shell_style = crate::layout::page_shell_style("1.2rem");

    rsx! {
        div { class: "page-shell", style: "{page_shell_style}",
            if let Some(snapshot) = snapshot {
                a {
                    class: "back-link",
                    href: context.href_with_lang(Location::PartList),
                    style: "display: inline-flex; align-items: center; gap: 0.4rem; color: var(--primary); font-size: 0.88rem; font-weight: 500; text-decoration: none;",
                    {
                        context
                            .language
                            .label(
                                "← Back to Parts",
                                "← パーツ一覧へ戻る",
                                "← Reen al partoj",
                            )
                    }
                }
                editor::PartEditorCard {
                    state: state.clone(),
                    context: context.clone(),
                    definition_event_hash: definition_event_hash.clone(),
                    snapshot: snapshot.clone(),
                }
                history::PartHistoryCard {
                    state: state.clone(),
                    context: context.clone(),
                    part_name: snapshot.part_name.clone(),
                    related_events,
                }
            } else {
                a {
                    href: context.href_with_lang(Location::PartList),
                    style: "color: var(--primary); text-decoration: none;",
                    "{context.language.label(\"← Back to Parts\", \"← パーツ一覧へ戻る\", \"← Reen al partoj\")}"
                }
                div { style: "color: var(--text-secondary); text-align: center; padding: 2rem;",
                    "{context.language.label(\"Part not found\", \"パーツが見つかりません\", \"Parto ne trovita\")}"
                }
            }
        }
    }
}
