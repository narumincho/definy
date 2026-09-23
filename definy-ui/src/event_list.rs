use definy_event::EventHashId;
use definy_event::event::{Event, EventContent, EventType};
use dioxus::prelude::*;

use crate::app_state::AppState;
use crate::page_context::PageContext;

#[component]
pub fn EventListView(state: AppState, context: PageContext) -> Element {
    let filter_options = vec![
        (
            "".to_string(),
            context
                .language
                .label("All Events", "すべてのイベント", "Ĉiuj eventoj")
                .to_string(),
        ),
        (
            "create_account".to_string(),
            context
                .language
                .label("Create Account", "アカウント作成", "Krei konton")
                .to_string(),
        ),
        (
            "change_profile".to_string(),
            context
                .language
                .label("Change Profile", "プロフィール変更", "Ŝanĝi profilon")
                .to_string(),
        ),
        (
            "part_definition".to_string(),
            context
                .language
                .label("Part Definition", "パーツ定義", "Parto-difino")
                .to_string(),
        ),
        (
            "part_update".to_string(),
            context
                .language
                .label("Part Update", "パーツ更新", "Parto-ĝisdatigo")
                .to_string(),
        ),
        (
            "module_definition".to_string(),
            context
                .language
                .label("Module Definition", "モジュール定義", "Modulo-difino")
                .to_string(),
        ),
        (
            "module_update".to_string(),
            context
                .language
                .label("Module Update", "モジュール更新", "Modulo-ĝisdatigo")
                .to_string(),
        ),
    ];

    let current_filter = context
        .filter_event_type
        .as_ref()
        .map(|et| et.to_string())
        .unwrap_or_default();

    let account_name_map = state.account_name_map();
    let hashes: Vec<EventHashId> = if !state.event_list_state.event_hashes.is_empty() {
        state.event_list_state.event_hashes.clone()
    } else {
        let mut entries: Vec<_> = state
            .event_cache
            .iter()
            .filter_map(|(hash, event_res)| {
                event_res.as_ref().ok().and_then(|(_, event)| {
                    if let Some(filter) = &context.filter_event_type
                        && EventType::from(&event.content) != *filter
                    {
                        return None;
                    }
                    Some((hash.clone(), event.time))
                })
            })
            .collect();
        entries.sort_by_key(|b| std::cmp::Reverse(b.1));
        entries.into_iter().map(|(h, _)| h).collect()
    };

    let page_shell_style = crate::layout::page_shell_style("0.8rem");

    rsx! {
        div { class: "page-shell", style: "{page_shell_style}",
            crate::dropdown::SearchableDropdown {
                name: "event_filter".to_string(),
                current_value: current_filter.clone(),
                options: filter_options.clone(),
                on_change: {
                    #[cfg(target_arch = "wasm32")]
                    let context = context.clone();
                    move |_val: String| {
                        #[cfg(target_arch = "wasm32")]
                        let event_type = match _val.as_str() {
                            "create_account" => Some(EventType::CreateAccount),
                            "change_profile" => Some(EventType::ChangeProfile),
                            "part_definition" => Some(EventType::PartDefinition),
                            "part_update" => Some(EventType::PartUpdate),
                            "module_definition" => Some(EventType::ModuleDefinition),
                            "module_update" => Some(EventType::ModuleUpdate),
                            _ => None,
                        };
                        #[cfg(target_arch = "wasm32")]
                        let url = PageContext::build_url(
                            &crate::Location::Home,
                            context.language.to_code(),
                            event_type,
                        );
                        #[cfg(target_arch = "wasm32")]
                        if let Some(window) = web_sys::window() {
                            let _ = window.location().set_href(&url);
                        }
                    }
                },
            }
            div { class: "event-list", style: "display: grid; gap: 0.45rem;",
                for hash in hashes {
                    if let Some(event_result) = state.event_cache.get(&hash) {
                        EventCard {
                            key: "{hash}",
                            hash: hash.clone(),
                            event_result: event_result.clone(),
                            context: context.clone(),
                            account_name_map: account_name_map.clone(),
                        }
                    }
                }
            }
            if state.event_list_state.is_loading {
                div { style: "text-align: center; padding: 1.5rem 1rem; color: var(--text-secondary); font-size: 0.85rem;",
                    "{context.language.label(\"Loading events...\", \"イベントを読み込み中...\", \"Ŝargado de eventoj...\")}"
                }
            } else if state.event_list_state.has_more {
                div { style: "display: flex; justify-content: center; padding: 0.4rem 0 0.8rem;",
                    button {
                        r#type: "button",
                        style: "display: inline-flex; align-items: center; justify-content: center; padding: 0.45rem 1.2rem; background: rgb(255 255 255 / 0.05); border: 1px solid var(--border); border-radius: var(--radius-full); color: var(--text); font-size: 0.85rem; font-weight: 500; cursor: pointer; transition: all 0.2s ease; box-shadow: var(--shadow-sm);",
                        onclick: move |_| {
                            let state_sig = use_context::<Signal<AppState>>();
                            let state_val = state_sig.read().clone();
                            spawn(async move {
                                let set_state = state_sig;
                                crate::app_state::load_more_events(
                                        state_val,
                                        std::rc::Rc::new(move |
                                            updater: Box<dyn FnOnce(AppState) -> AppState>|
                                        {
                                            let mut sig = set_state;
                                            let prev = sig.read().clone();
                                            sig.set(updater(prev));
                                        }),
                                    )
                                    .await;
                            });
                        },
                        if state.event_list_state.event_hashes.is_empty() {
                            {
                                context
                                    .language
                                    .label("Load Events", "イベントを読み込む", "Ŝargi eventojn")
                            }
                        } else {
                            {
                                context
                                    .language
                                    .label("Load More Events", "さらに読み込む", "Ŝargi pliajn eventojn")
                            }
                        }
                    }
                }
            } else if state.event_list_state.event_hashes.is_empty() && !state.event_list_state.is_loading {
                div {
                    class: "event-detail-card",
                    style: "padding: 2rem 1.5rem; text-align: center; display: grid; gap: 0.5rem; justify-items: center; color: var(--text-secondary);",
                    div { style: "font-size: 1.5rem; opacity: 0.5;", "📋" }
                    div { style: "font-size: 0.95rem; color: var(--text);",
                        "{context.language.label(\"No events found\", \"イベントが見つかりません\", \"Neniuj eventoj trovitaj\")}"
                    }
                }
            }
        }
    }
}

#[component]
fn EventCard(
    hash: EventHashId,
    event_result: Result<
        (ed25519_dalek::Signature, Event),
        definy_event::VerifyAndDeserializeError,
    >,
    context: PageContext,
    account_name_map: std::collections::HashMap<definy_event::event::AccountId, Box<str>>,
) -> Element {
    match event_result {
        Ok((_, event)) => {
            let author_name =
                crate::app_state::account_display_name(&account_name_map, &event.account_id);
            let time_str = event.time.format("%Y-%m-%d %H:%M:%S").to_string();
            let event_type_badge = event_type_label(&event.content, &context);
            let hash_str = hash.to_string();

            rsx! {
                div {
                    class: "event-card",
                    style: "background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-md); padding: 0.55rem 0.8rem; box-shadow: var(--shadow-sm); display: flex; flex-direction: column; gap: 0.3rem;",
                    // Row 1: 作成者 日時 [イベント種別バッジ]
                    div { style: "display: flex; justify-content: space-between; align-items: center; gap: 0.6rem; font-size: 0.82rem;",
                        div { style: "display: flex; align-items: center; gap: 0.5rem; min-width: 0; flex-wrap: wrap;",
                            a {
                                href: context.href_with_lang(crate::Location::Account(event.account_id.clone())),
                                style: "font-weight: 600; color: var(--primary); text-decoration: none;",
                                "{author_name}"
                            }
                            span { style: "color: var(--text-secondary); font-size: 0.74rem;",
                                "{time_str}"
                            }
                        }
                        div {
                            class: "badge",
                            style: "font-size: 0.7rem; font-weight: 500; color: var(--primary); background: rgb(124 192 216 / 0.1); padding: 0.1rem 0.45rem; border-radius: var(--radius-full); white-space: nowrap; flex-shrink: 0;",
                            "{event_type_badge}"
                        }
                    }
                    // Row 2: イベントの内容
                    EventContentView {
                        event: event.clone(),
                        context: context.clone(),
                        hash: hash.clone(),
                    }
                    // Row 3: イベントハッシュ 詳細リンク
                    div { style: "display: flex; justify-content: space-between; align-items: center; gap: 0.5rem; font-size: 0.74rem; padding-top: 0.15rem;",
                        div {
                            class: "mono",
                            style: "color: var(--text-secondary); opacity: 0.65; max-width: 65%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;",
                            "{hash_str}"
                        }
                        a {
                            href: context.href_with_lang(crate::Location::Event(hash.clone())),
                            style: "color: var(--primary); text-decoration: none; font-weight: 500; white-space: nowrap; flex-shrink: 0;",
                            "{context.language.label(\"Event detail →\", \"イベント詳細 →\", \"Eventaj detaloj →\")}"
                        }
                    }
                }
            }
        }
        Err(err) => {
            let hash_str = hash.to_string();
            let err_str = format!("{:?}", err);
            let invalid_label = format!(
                "{} ({hash_str})",
                context
                    .language
                    .label("Invalid event", "無効なイベント", "Nevalida evento")
            );
            rsx! {
                div {
                    class: "event-card",
                    style: "padding: 0.55rem 0.8rem; border-left: 3px solid var(--error); background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-md); display: grid; gap: 0.2rem;",
                    div { style: "font-size: 0.82rem; font-weight: 600; color: var(--error);",
                        "{invalid_label}"
                    }
                    div { style: "font-size: 0.76rem; color: var(--text-secondary);",
                        "{err_str}"
                    }
                }
            }
        }
    }
}

#[component]
fn EventContentView(event: Event, context: PageContext, hash: EventHashId) -> Element {
    match event.content {
        EventContent::CreateAccount(create_account_event) => rsx! {
            div { style: "display: flex; align-items: center; gap: 0.4rem; font-size: 0.88rem;",
                span { style: "color: var(--text-secondary); font-size: 0.82rem;",
                    {
                        context
                            .language
                            .label("Created account:", "アカウントを作成:", "Kreis konton:")
                    }
                }
                span { style: "font-weight: 600; color: var(--text);",
                    "{create_account_event.account_name}"
                }
            }
        },
        EventContent::ChangeProfile(change_profile_event) => rsx! {
            div { style: "display: flex; align-items: center; gap: 0.4rem; font-size: 0.88rem;",
                span { style: "color: var(--text-secondary); font-size: 0.82rem;",
                    {
                        context
                            .language
                            .label(
                                "Changed account name to:",
                                "アカウント名を変更:",
                                "Ŝanĝis kontonomon al:",
                            )
                    }
                }
                span { style: "font-weight: 600; color: var(--text);",
                    "{change_profile_event.account_name}"
                }
            }
        },
        EventContent::PartDefinition(part_definition_event) => {
            let part_name = part_definition_event.part_name.to_string();
            let part_type_badge = part_definition_event
                .part_type
                .as_ref()
                .map(ToString::to_string);
            let desc = part_definition_event
                .description
                .to_display_string(context.language.to_code());

            rsx! {
                div { style: "display: grid; gap: 0.2rem;",
                    div { style: "display: flex; align-items: center; gap: 0.45rem; flex-wrap: wrap;",
                        a {
                            href: context.href_with_lang(crate::Location::Part(hash.clone())),
                            style: "font-size: 0.95rem; font-weight: 600; color: var(--text); text-decoration: none;",
                            "{part_name}"
                        }
                        if let Some(badge) = part_type_badge {
                            span {
                                class: "badge mono",
                                style: "font-size: 0.72rem; color: var(--primary); background: rgb(124 192 216 / 0.1); padding: 0.08rem 0.4rem; border-radius: var(--radius-full);",
                                "{badge}"
                            }
                        }
                    }
                    if !desc.is_empty() {
                        div { style: "font-size: 0.8rem; color: var(--text-secondary); line-height: 1.35; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;",
                            "{desc}"
                        }
                    }
                }
            }
        }
        EventContent::PartUpdate(part_update_event) => {
            let part_name = part_update_event.part_name.to_string();
            let base_hash = part_update_event.part_definition_event_hash.clone();

            rsx! {
                div { style: "display: flex; align-items: center; gap: 0.4rem; font-size: 0.88rem;",
                    span { style: "color: var(--text-secondary); font-size: 0.82rem;",
                        {
                            context
                                .language
                                .label("Updated part:", "パーツを更新:", "Ĝisdatigis parton:")
                        }
                    }
                    a {
                        href: context.href_with_lang(crate::Location::Part(base_hash)),
                        style: "font-weight: 600; color: var(--text); text-decoration: none;",
                        "{part_name}"
                    }
                }
            }
        }
        EventContent::ModuleDefinition(module_definition_event) => {
            let mod_name = module_definition_event.module_name.to_string();
            let desc = module_definition_event
                .description
                .to_display_string(context.language.to_code());

            rsx! {
                div { style: "display: grid; gap: 0.2rem;",
                    a {
                        href: context.href_with_lang(crate::Location::Module(hash.clone())),
                        style: "font-size: 0.95rem; font-weight: 600; color: var(--text); text-decoration: none;",
                        "{mod_name}"
                    }
                    if !desc.is_empty() {
                        div { style: "font-size: 0.8rem; color: var(--text-secondary); line-height: 1.35; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;",
                            "{desc}"
                        }
                    }
                }
            }
        }
        EventContent::ModuleUpdate(module_update_event) => {
            let mod_name = module_update_event.module_name.to_string();
            let base_hash = module_update_event.module_definition_event_hash.clone();
            let desc = module_update_event
                .module_description
                .to_display_string(context.language.to_code());

            rsx! {
                div { style: "display: grid; gap: 0.2rem;",
                    div { style: "display: flex; align-items: center; gap: 0.4rem; font-size: 0.88rem;",
                        span { style: "color: var(--text-secondary); font-size: 0.82rem;",
                            {
                                context
                                    .language
                                    .label(
                                        "Updated module:",
                                        "モジュールを更新:",
                                        "Ĝisdatigis modulon:",
                                    )
                            }
                        }
                        a {
                            href: context.href_with_lang(crate::Location::Module(base_hash)),
                            style: "font-weight: 600; color: var(--text); text-decoration: none;",
                            "{mod_name}"
                        }
                    }
                    if !desc.is_empty() {
                        div { style: "font-size: 0.8rem; color: var(--text-secondary); line-height: 1.35; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;",
                            "{desc}"
                        }
                    }
                }
            }
        }
    }
}

fn event_type_label(content: &EventContent, context: &PageContext) -> String {
    match content {
        EventContent::CreateAccount(_) => context
            .language
            .label("Create Account", "アカウント作成", "Krei konton")
            .to_string(),
        EventContent::ChangeProfile(_) => context
            .language
            .label("Change Profile", "プロフィール変更", "Ŝanĝi profilon")
            .to_string(),
        EventContent::PartDefinition(_) => context
            .language
            .label("Part Definition", "パーツ定義", "Parto-difino")
            .to_string(),
        EventContent::PartUpdate(_) => context
            .language
            .label("Part Update", "パーツ更新", "Parto-ĝisdatigo")
            .to_string(),
        EventContent::ModuleDefinition(_) => context
            .language
            .label("Module Definition", "モジュール定義", "Modulo-difino")
            .to_string(),
        EventContent::ModuleUpdate(_) => context
            .language
            .label("Module Update", "モジュール更新", "Modulo-ĝisdatigo")
            .to_string(),
    }
}
