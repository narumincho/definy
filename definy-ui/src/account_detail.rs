use definy_event::EventHashId;
use dioxus::prelude::*;

use crate::page_context::PageContext;
use crate::{AppState, Location};

#[component]
pub fn AccountDetailView(
    state: AppState,
    context: PageContext,
    account_id: definy_event::event::AccountId,
) -> Element {
    let account_name_map = state.account_name_map();
    let account_name = crate::app_state::account_display_name(&account_name_map, &account_id);

    let account_events = state
        .event_cache
        .iter()
        .filter_map(|(hash, event_result)| {
            let (_, event) = event_result.as_ref().ok()?;
            if event.account_id == account_id {
                Some((hash.clone(), event.clone()))
            } else {
                None
            }
        })
        .collect::<Vec<(EventHashId, definy_event::event::Event)>>();

    let is_current_account = state
        .current_key
        .as_ref()
        .is_some_and(|key| key.verifying_key().to_bytes().as_slice() == account_id.0.as_ref());

    let page_shell_style = crate::layout::page_shell_style("1.2rem");

    rsx! {
        div {
            class: "page-shell",
            style: "{page_shell_style}",
            a {
                class: "back-link",
                href: context.href_with_lang(Location::AccountList),
                style: "display: inline-flex; align-items: center; gap: 0.4rem; color: var(--primary); font-size: 0.88rem; font-weight: 500; text-decoration: none;",
                "{context.language.label(\"← Back to Accounts\", \"← アカウント一覧へ戻る\", \"← Reen al kontoj\")}"
            }
            div {
                class: "event-detail-card",
                style: "display: grid; gap: 0.75rem; padding: 1.2rem 1.3rem; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-md);",
                h2 {
                    style: "font-size: 1.3rem; font-weight: 600; margin: 0;",
                    "{account_name}"
                }
                div {
                    class: "mono",
                    style: "font-size: 0.76rem; word-break: break-all; border: 1px solid var(--border); padding: 0.3rem 0.6rem; border-radius: 4px; color: var(--text-secondary); background: rgb(0 0 0 / 0.15);",
                    "{account_id.to_string()}"
                }
                div {
                    style: "color: var(--text-secondary); font-size: 0.85rem;",
                    "{account_events.len()} {context.language.label(\"events\", \"イベント\", \"eventoj\")}"
                }
            }
            if is_current_account {
                ProfileForm { state: state.clone(), context: context.clone() }
            }
            if account_events.is_empty() {
                div {
                    class: "event-detail-card",
                    style: "padding: 2.5rem 1.5rem; text-align: center; display: grid; gap: 0.5rem; justify-items: center; color: var(--text-secondary); background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-md);",
                    div {
                        style: "font-size: 1.5rem; opacity: 0.5;",
                        "📄"
                    }
                    div {
                        style: "font-size: 0.95rem; color: var(--text);",
                        "{context.language.label(\"This account has not posted any events yet.\", \"このアカウントはまだイベントを投稿していません。\", \"Ĉi tiu konto ankoraŭ ne afiŝis eventojn.\")}"
                    }
                }
            } else {
                div {
                    class: "event-list",
                    style: "display: grid; gap: 0.6rem;",
                    for (hash, ev) in account_events {
                        {
                            let time_str = ev.time.format("%Y-%m-%d %H:%M:%S").to_string();
                            let summary = crate::event_presenter::event_summary_text(context.language, &ev);
                            rsx! {
                                a {
                                    key: "{hash}",
                                    class: "event-card",
                                    href: context.href_with_lang(Location::Event(hash)),
                                    style: "display: grid; gap: 0.5rem; padding: 0.8rem; text-decoration: none; color: var(--text); background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-md);",
                                    div {
                                        style: "font-size: 0.85rem; color: var(--text-secondary);",
                                        "{time_str}"
                                    }
                                    div { "{summary}" }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

#[component]
fn ProfileForm(state: AppState, context: PageContext) -> Element {
    rsx! {
        div {
            class: "event-detail-card",
            style: "display: grid; gap: 0.6rem; padding: 1.2rem 1.3rem; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-md);",
            div {
                style: "font-weight: 600;",
                "{context.language.label(\"Change account name\", \"アカウント名を変更\", \"Ŝanĝi kontonomon\")}"
            }
            input {
                r#type: "text",
                name: "profile-name",
                value: "{state.profile_name_input}",
                style: "padding: 0.4rem 0.6rem; border: 1px solid var(--border); border-radius: var(--radius-sm); background: var(--surface); color: var(--text);",
                oninput: move |evt: FormEvent| {
                    let mut state_sig = use_context::<Signal<AppState>>();
                    state_sig.write().profile_name_input = evt.value();
                }
            }
            button {
                r#type: "button",
                style: "padding: 0.4rem 0.9rem; background: var(--primary); color: #0e1720; border: none; border-radius: var(--radius-sm); font-weight: 600; cursor: pointer; justify-self: start;",
                onclick: move |_| {
                    let state_sig = use_context::<Signal<AppState>>();
                    let state_val = state_sig.read().clone();
                    let key = if let Some(key) = &state_val.current_key {
                        key.clone()
                    } else {
                        return;
                    };
                    let new_name = state_val.profile_name_input.trim().to_string();
                    if new_name.is_empty() {
                        return;
                    }
                    let filter = state_val.event_list_state.filter_event_type;
                    let force_offline = state_val.force_offline;

                    spawn(async move {
                        crate::event_submit::submit_event(
                            definy_event::event::EventContent::ChangeProfile(
                                definy_event::event::ChangeProfileEvent {
                                    account_name: new_name.into(),
                                },
                            ),
                            key,
                            force_offline,
                            filter,
                            state_sig,
                            |next, _| {
                                next.profile_name_input = String::new();
                            },
                        ).await;
                    });
                },
                "{context.language.label(\"Change Name\", \"名前を変更\", \"Ŝanĝi nomon\")}"
            }
        }
    }
}
