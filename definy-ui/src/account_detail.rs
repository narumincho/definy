use definy_event::EventHashId;
use narumincho_vdom::*;

use crate::page_context::PageContext;
use crate::{AppState, Location};

pub fn account_detail_view(
    state: &AppState,
    context: &PageContext,
    account_id: &definy_event::event::AccountId,
) -> Node {
    let account_name_map = state.account_name_map();
    let account_name = crate::app_state::account_display_name(&account_name_map, account_id);

    let account_events = state
        .event_cache
        .iter()
        .filter_map(|(hash, event_result)| {
            let (_, event) = event_result.as_ref().ok()?;
            if event.account_id == *account_id {
                Some((hash, event))
            } else {
                None
            }
        })
        .collect::<Vec<(&EventHashId, &definy_event::event::Event)>>();

    let is_current_account = state
        .current_key
        .as_ref()
        .is_some_and(|key| key.verifying_key().to_bytes().as_slice() == account_id.0.as_ref());

    let profile_form = if is_current_account {
        Some(
            Div::new()
                .class("event-detail-card")
                .style(Style::new().set("display", "grid").set("gap", "0.6rem"))
                .children([
                    Div::new()
                        .style(Style::new().set("font-weight", "600"))
                        .children([text(context.language.label(
                            "Change account name",
                            "アカウント名を変更",
                            "Ŝanĝi kontonomon",
                        ))])
                        .into_node(),
                    Input::new()
                        .type_("text")
                        .name("profile-name")
                        .value(&state.profile_name_input)
                        .on_change(EventHandler::new(async |set_state| {
                            let value = crate::dom::get_input_value("input[name='profile-name']");
                            set_state(Box::new(move |state: AppState| AppState {
                                profile_name_input: value,
                                ..state.clone()
                            }));
                        }))
                        .into_node(),
                    Button::new()
                        .on_click(EventHandler::new(async |set_state| {
                            let set_state = std::rc::Rc::new(set_state);
                            let set_state_for_async = set_state.clone();
                            set_state(Box::new(move |state: AppState| {
                                let key = if let Some(key) = &state.current_key {
                                    key.clone()
                                } else {
                                    return state;
                                };
                                let new_name = state.profile_name_input.trim().to_string();
                                if new_name.is_empty() {
                                    return state;
                                }
                                let filter = state.event_list_state.filter_event_type;
                                let force_offline = state.force_offline;
                                wasm_bindgen_futures::spawn_local(
                                    crate::event_submit::submit_event(
                                        definy_event::event::EventContent::ChangeProfile(
                                            definy_event::event::ChangeProfileEvent {
                                                account_name: new_name.into(),
                                            },
                                        ),
                                        key,
                                        force_offline,
                                        filter,
                                        set_state_for_async,
                                        |next, _| {
                                            next.profile_name_input = String::new();
                                        },
                                    ),
                                );
                                state
                            }));
                        }))
                        .children([text(context.language.label(
                            "Change Name",
                            "名前を変更",
                            "Ŝanĝi nomon",
                        ))])
                        .into_node(),
                ])
                .into_node(),
        )
    } else {
        None
    };

    Div::new()
        .class("page-shell")
        .style(crate::layout::page_shell_style("1.2rem"))
        .children([
            A::<Location>::new()
                .class("back-link")
                .href(context.href_with_lang(Location::AccountList))
                .style(
                    Style::new()
                        .set("display", "inline-flex")
                        .set("align-items", "center")
                        .set("gap", "0.4rem")
                        .set("color", "var(--primary)")
                        .set("font-size", "0.88rem")
                        .set("font-weight", "500")
                        .set("text-decoration", "none"),
                )
                .children([text(context.language.label(
                    "← Back to Accounts",
                    "← アカウント一覧へ戻る",
                    "← Reen al kontoj",
                ))])
                .into_node(),
            Div::new()
                .class("event-detail-card")
                .style(
                    Style::new()
                        .set("display", "grid")
                        .set("gap", "0.75rem")
                        .set("padding", "1.2rem 1.3rem"),
                )
                .children([
                    H2::new()
                        .style(
                            Style::new()
                                .set("font-size", "1.3rem")
                                .set("font-weight", "600"),
                        )
                        .children([text(account_name)])
                        .into_node(),
                    Div::new()
                        .class("mono")
                        .style(
                            Style::new()
                                .set("font-size", "0.76rem")
                                .set("word-break", "break-all")
                                .set("border", "1px solid var(--border)")
                                .set("padding", "0.3rem 0.6rem")
                                .set("border-radius", "4px")
                                .set("color", "var(--text-secondary)"),
                        )
                        .children([text(account_id.to_string())])
                        .into_node(),
                    Div::new()
                        .style(
                            Style::new()
                                .set("color", "var(--text-secondary)")
                                .set("font-size", "0.85rem"),
                        )
                        .children([text(format!(
                            "{} {}",
                            account_events.len(),
                            context.language.label("events", "イベント", "eventoj")
                        ))])
                        .into_node(),
                ])
                .into_node(),
            if let Some(profile_form) = profile_form {
                profile_form
            } else {
                Div::new().children([]).into_node()
            },
            if account_events.is_empty() {
                Div::new()
                    .class("event-detail-card")
                    .style(
                        Style::new()
                            .set("padding", "2.5rem 1.5rem")
                            .set("text-align", "center")
                            .set("display", "grid")
                            .set("gap", "0.5rem")
                            .set("justify-items", "center")
                            .set("color", "var(--text-secondary)"),
                    )
                    .children([
                        Div::new()
                            .style(
                                Style::new()
                                    .set("font-size", "1.5rem")
                                    .set("opacity", "0.5"),
                            )
                            .children([text("📄")])
                            .into_node(),
                        Div::new()
                            .style(
                                Style::new()
                                    .set("font-size", "0.95rem")
                                    .set("color", "var(--text)"),
                            )
                            .children([text(context.language.label(
                                "This account has not posted any events yet.",
                                "このアカウントはまだイベントを投稿していません。",
                                "Ĉi tiu konto ankoraŭ ne afiŝis eventojn.",
                            ))])
                            .into_node(),
                    ])
                    .into_node()
            } else {
                Div::new()
                    .class("event-list")
                    .style(Style::new().set("display", "grid").set("gap", "0.6rem"))
                    .children(
                        account_events
                            .into_iter()
                            .map(|(hash, event)| {
                                A::<Location>::new()
                                    .class("event-card")
                                    .href(context.href_with_lang(Location::Event(hash.clone())))
                                    .style(
                                        Style::new()
                                            .set("display", "grid")
                                            .set("gap", "0.5rem")
                                            .set("padding", "0.8rem"),
                                    )
                                    .children([
                                        Div::new()
                                            .style(
                                                Style::new()
                                                    .set("font-size", "0.85rem")
                                                    .set("color", "var(--text-secondary)"),
                                            )
                                            .children([text(
                                                event.time.format("%Y-%m-%d %H:%M:%S").to_string(),
                                            )])
                                            .into_node(),
                                        Div::new()
                                            .children([text(
                                                crate::event_presenter::event_summary_text(
                                                    context.language,
                                                    event,
                                                ),
                                            )])
                                            .into_node(),
                                    ])
                                    .into_node()
                            })
                            .collect::<Vec<Node>>(),
                    )
                    .into_node()
            },
        ])
        .into_node()
}
