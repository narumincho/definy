mod account_detail;
mod account_list;
pub mod app_state;
pub mod dom;
pub mod dropdown;
mod event_detail;
pub mod event_filter;
mod event_list;
pub mod event_presenter;
pub mod event_submit;
pub mod expression_editor;
mod expression_eval;
pub mod fetch;
mod header;
pub mod indexed_db;
pub mod language;
mod layout;
mod local_event;
mod local_event_queue;
mod login_or_create_account_dialog;
mod message;
mod module_detail;
mod module_list;
mod module_projection;
pub mod navigator_credential;
mod not_found;
pub mod page_context;
mod page_title;
mod part_detail;
mod part_list;
mod part_projection;
pub mod query;
pub mod wasm_emitter;

pub use app_state::*;
pub use event_filter::*;
pub use event_submit::*;
pub use local_event::*;
pub use message::Message;
pub use page_context::PageContext;
pub use page_title::document_title_text;

pub use crate::app_state::Location;
use dioxus::prelude::*;

pub const SSR_INITIAL_STATE_ELEMENT_ID: &str = "__DEFINY_INITIAL_STATE__";

fn default_true() -> bool {
    true
}

#[derive(serde::Serialize, serde::Deserialize)]
struct SsrStateInternal {
    event_binaries_base64: Vec<String>,
    has_more: bool,
    #[serde(default = "default_true")]
    is_db_connected: bool,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct SsrState {
    pub event_binaries: Vec<Vec<u8>>,
    pub has_more: bool,
    pub is_db_connected: bool,
}

pub fn encode_ssr_state(ssr_state: SsrState) -> Option<String> {
    serde_cbor::to_vec(&SsrStateInternal {
        event_binaries_base64: ssr_state
            .event_binaries
            .iter()
            .map(|event_binary| {
                base64::Engine::encode(
                    &base64::engine::general_purpose::URL_SAFE_NO_PAD,
                    event_binary,
                )
            })
            .collect(),
        has_more: ssr_state.has_more,
        is_db_connected: ssr_state.is_db_connected,
    })
    .ok()
    .map(|vec| base64::Engine::encode(&base64::engine::general_purpose::URL_SAFE_NO_PAD, &vec))
}

pub fn decode_ssr_state(json: &str) -> Option<SsrState> {
    base64::Engine::decode(&base64::engine::general_purpose::URL_SAFE_NO_PAD, json)
        .ok()
        .and_then(|vec| serde_cbor::from_slice::<SsrStateInternal>(&vec).ok())
        .map(|state| SsrState {
            event_binaries: state
                .event_binaries_base64
                .into_iter()
                .filter_map(|encoded| {
                    base64::Engine::decode(
                        &base64::engine::general_purpose::URL_SAFE_NO_PAD,
                        &encoded,
                    )
                    .ok()
                })
                .collect(),
            has_more: state.has_more,
            is_db_connected: state.is_db_connected,
        })
}

#[component]
pub fn App(state: AppState, context: PageContext) -> Element {
    render_inner(&state, &context)
}

pub fn render(state: &AppState, context: &PageContext) -> Element {
    render_inner(state, context)
}

fn render_inner(state: &AppState, context: &PageContext) -> Element {
    let page_content = match &context.location {
        Some(Location::Home) => {
            rsx! {
                event_list::EventListView { state: state.clone(), context: context.clone() }
            }
        }
        Some(Location::AccountList) => {
            rsx! {
                account_list::AccountListView { state: state.clone(), context: context.clone() }
            }
        }
        Some(Location::PartList) => {
            rsx! {
                part_list::PartListView { state: state.clone(), context: context.clone() }
            }
        }
        Some(Location::ModuleList) => {
            rsx! {
                module_list::ModuleListView { state: state.clone(), context: context.clone() }
            }
        }
        Some(Location::LocalEventQueue) => {
            rsx! {
                local_event_queue::LocalEventQueueView { state: state.clone(), context: context.clone() }
            }
        }
        Some(Location::Module(hash)) => {
            rsx! {
                module_detail::ModuleDetailView {
                    state: state.clone(),
                    context: context.clone(),
                    definition_event_hash: hash.clone(),
                }
            }
        }
        Some(Location::Part(hash)) => {
            rsx! {
                part_detail::PartDetailView {
                    state: state.clone(),
                    context: context.clone(),
                    definition_event_hash: hash.clone(),
                }
            }
        }
        Some(Location::Event(hash)) => {
            rsx! {
                event_detail::EventDetailView {
                    state: state.clone(),
                    context: context.clone(),
                    target_hash: hash.clone(),
                }
            }
        }
        Some(Location::Account(account_id)) => {
            rsx! {
                account_detail::AccountDetailView {
                    state: state.clone(),
                    context: context.clone(),
                    account_id: account_id.clone(),
                }
            }
        }
        None => rsx! {
            not_found::NotFoundView { state: state.clone(), context: context.clone() }
        },
    };

    rsx! {
        style { {include_str!("../main.css")} }
        div { style: "display: grid; gap: 0.8rem; align-content: start; padding-top: 4.2rem; padding-bottom: 5rem;",
            header::HeaderView { state: state.clone(), context: context.clone() }
            div {
                key: "main-wrapper",
                style: "display: grid; gap: 0.8rem; width: 100%;",
                if !state.is_db_connected {
                    DbWarningBanner { context: context.clone() }
                }
                {page_content}
            }
            login_or_create_account_dialog::LoginOrCreateAccountDialog { state: state.clone(), context: context.clone() }
        }
    }
}

#[component]
fn DbWarningBanner(context: PageContext) -> Element {
    rsx! {
        div {
            class: "db-warning-banner",
            style: "width: calc(100% - 1.8rem); max-width: 920px; margin: 0.4rem auto 0; padding: 0.65rem 1rem; background: rgb(245 158 11 / 0.12); border: 1px solid rgb(245 158 11 / 0.35); border-radius: var(--radius-md); color: #fcd34d; font-size: 0.86rem; display: flex; align-items: center; justify-content: space-between; gap: 0.75rem;",
            div { style: "display: flex; align-items: center; gap: 0.5rem;",
                div { style: "font-size: 1rem;", "⚠️" }
                div {
                    "{context.language.label(\"Cannot connect to database. Local and offline features are available. Retrying connection...\", \"データベースに接続できません。ローカル機能・式の計算は利用可能です。接続を再試行しています...\", \"Ne povas konektiĝi al datumbazo. Lokaj funkcioj disponeblas. Rekonektante...\")}"
                }
            }
            div { style: "font-size: 0.75rem; opacity: 0.8; white-space: nowrap;",
                "{context.language.label(\"Retrying...\", \"再接続中...\", \"Rekonektante...\")}"
            }
        }
    }
}
