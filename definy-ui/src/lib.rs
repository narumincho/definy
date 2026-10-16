mod about;
mod account_detail;
mod account_list;
pub mod api_pages;
pub mod app_state;
pub mod cbor_card;
mod command_palette;
pub mod commit_graph;
mod commit_graph_view;
mod deployments;
mod deployments_flow;
pub mod dom;
pub mod dropdown;
mod event_detail;
pub mod event_filter;
mod event_list;
pub mod event_presenter;
pub mod event_submit;
pub mod expression_editor;
pub mod fetch;
mod header;
mod icon;
pub mod indexed_db;
pub mod language;
mod layout;
mod local_event;
mod local_event_queue;
mod login_or_create_account_dialog;
mod message;
mod module_detail;
mod module_list;
pub mod module_projection;
pub mod navigator_credential;
mod not_found;
pub mod page_context;
mod page_title;
mod part_create_form;
mod part_detail;
mod part_list;
pub mod part_projection;
pub mod preview_apps;
pub mod query;
mod rpc_architecture;
pub mod self_hosted_type_check;
mod settings;
pub mod tree_layout;
mod tree_layout_view;
mod workbench;
pub mod working_changes;
mod working_changes_view;
pub use definy_core::{expression_eval, wasm_emitter};
pub mod wasm_inspector;

pub use app_state::*;
pub use event_filter::*;
pub use event_submit::*;
pub use local_event::*;
pub use message::Message;
pub use page_context::PageContext;
pub use page_title::{document_description_text, document_title_text};

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
    #[serde(default)]
    is_db_initializing: bool,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct SsrState {
    pub event_binaries: Vec<Vec<u8>>,
    pub has_more: bool,
    pub is_db_connected: bool,
    pub is_db_initializing: bool,
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
        is_db_initializing: ssr_state.is_db_initializing,
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
            is_db_initializing: state.is_db_initializing,
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
    let page_key = context
        .location
        .as_ref()
        .map(Location::to_url)
        .unwrap_or_else(|| "not-found".to_string());
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
        Some(Location::Changes) => {
            rsx! {
                working_changes_view::WorkingChangesView { state: state.clone(), context: context.clone() }
            }
        }
        Some(Location::History) => {
            rsx! {
                commit_graph_view::CommitGraphView { state: state.clone(), context: context.clone() }
            }
        }
        Some(Location::TreeLayout) => {
            rsx! {
                tree_layout_view::TreeLayoutView { state: state.clone(), context: context.clone() }
            }
        }
        Some(Location::Settings) => {
            rsx! {
                settings::SettingsView { state: state.clone(), context: context.clone() }
            }
        }
        Some(Location::About) => {
            rsx! {
                about::AboutView { context: context.clone() }
            }
        }
        Some(Location::Deployments) => {
            rsx! {
                deployments::DeploymentsView { context: context.clone() }
            }
        }
        Some(Location::ApiOverview) => {
            rsx! {
                api_pages::ApiOverviewPageView { context: context.clone() }
            }
        }
        Some(Location::ApiArchitecture) => {
            rsx! {
                api_pages::RpcArchitecturePageView { context: context.clone() }
            }
        }
        Some(Location::ApiMethod(method, target_hash)) => {
            rsx! {
                api_pages::RpcMethodDetailView {
                    state: state.clone(),
                    context: context.clone(),
                    method: *method,
                    initial_target_hash: target_hash.clone(),
                }
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
        workbench::Workbench { state: state.clone(), context: context.clone(),
            if state.connection_status != app_state::ConnectionStatus::Connected {
                ConnectionWarningBanner { context: context.clone(), status: state.connection_status }
            }
            // URL (パス) ごとにページを作り直す. 同じ種類のページ間 (/parts/A → /parts/B) を移動したとき,
            // コンポーネント内の use_signal が前のページの値のまま残り, URL だけが変わったように見えるのを防ぐ
            for (page_key, page) in [(page_key, page_content)] {
                div { key: "{page_key}", style: "display: contents;", {page} }
            }
        }
        login_or_create_account_dialog::LoginOrCreateAccountDialog { context: context.clone() }
    }
}

#[component]
fn ConnectionWarningBanner(context: PageContext, status: app_state::ConnectionStatus) -> Element {
    let retrying_text = context
        .language
        .label("Retrying...", "再試行中...", "Rekonektante...");
    let (message, status_badge) = match status {
        app_state::ConnectionStatus::ServerDisconnected => {
            let msg = context.language.label(
                "Cannot connect to API server. Local and offline features are available. Retrying connection...",
                "APIサーバーに接続できません。ローカル機能・式の計算は利用可能です。接続を再試行しています...",
                "Ne povas konektiĝi al API-servilo. Lokaj funkcioj disponeblas. Rekonektante...",
            );
            let badge_text = context.language.label(
                "API Server: Disconnected",
                "APIサーバー: 未接続",
                "API-servilo: Malkonektita",
            );
            (
                msg,
                rsx! {
                    span { style: "background: var(--red-bg-strong); border: 1px solid var(--red-border); padding: 0.15rem 0.5rem; border-radius: 4px; font-size: 0.72rem; color: var(--red-text);",
                        "{badge_text}"
                    }
                },
            )
        }
        app_state::ConnectionStatus::DatabaseInitializing => {
            let msg = context.language.label(
                "Database is initializing. Please wait a moment. Local and offline features are available. Retrying connection...",
                "データベースを初期化中です。しばらくお待ちください。ローカル機能・式の計算は利用可能です。接続を再試行しています...",
                "Datumbazo estas inicializiĝanta. Bonvolu atendi momenton. Lokaj funkcioj disponeblas. Rekonektante...",
            );
            let api_ok_text =
                context
                    .language
                    .label("API: Connected", "API: 接続中", "API: Konektita");
            let db_init_text = context.language.label(
                "Database: Initializing",
                "DB: 初期化中",
                "Datumbazo: Inicializiĝanta",
            );
            (
                msg,
                rsx! {
                    span { style: "background: var(--green-bg-strong); border: 1px solid var(--green-border); padding: 0.15rem 0.5rem; border-radius: 4px; font-size: 0.72rem; color: var(--green); margin-right: 0.3rem;",
                        "{api_ok_text}"
                    }
                    span { style: "background: var(--blue-bg-strong); border: 1px solid var(--blue-border); padding: 0.15rem 0.5rem; border-radius: 4px; font-size: 0.72rem; color: var(--blue-text);",
                        "{db_init_text}"
                    }
                },
            )
        }
        app_state::ConnectionStatus::DatabaseUnavailable => {
            let msg = context.language.label(
                "Connected to API server, but database is unavailable. Local and offline features are available. Retrying connection...",
                "APIサーバーに接続中ですが、データベースが利用できません。ローカル機能・式の計算は利用可能です。接続を再試行しています...",
                "Konektita al API-servilo, sed datumbazo ne disponeblas. Lokaj funkcioj disponeblas. Rekonektante...",
            );
            let api_ok_text =
                context
                    .language
                    .label("API: Connected", "API: 接続中", "API: Konektita");
            let db_bad_text = context.language.label(
                "Database: Unavailable",
                "DB: 未接続",
                "Datumbazo: Nedisponebla",
            );
            (
                msg,
                rsx! {
                    span { style: "background: var(--green-bg-strong); border: 1px solid var(--green-border); padding: 0.15rem 0.5rem; border-radius: 4px; font-size: 0.72rem; color: var(--green); margin-right: 0.3rem;",
                        "{api_ok_text}"
                    }
                    span { style: "background: var(--yellow-bg-strong); border: 1px solid var(--yellow-border); padding: 0.15rem 0.5rem; border-radius: 4px; font-size: 0.72rem; color: var(--yellow);",
                        "{db_bad_text}"
                    }
                },
            )
        }
        app_state::ConnectionStatus::Connected => return rsx! {},
    };

    rsx! {
        div { class: "connection-warning-banner",
            div { style: "display: flex; align-items: center; gap: 0.6rem; flex-wrap: wrap;",
                div { style: "font-size: 1rem;", "⚠️" }
                div { "{message}" }
                div { style: "display: flex; align-items: center; gap: 0.3rem;", {status_badge} }
            }
            div { style: "font-size: 0.75rem; opacity: 0.8; white-space: nowrap;", "{retrying_text}" }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_connection_warning_banner_shows_db_initializing() {
        let context = PageContext::from_path_and_query("/", "", Some("ja"));
        let mut renderer = dioxus_ssr::Renderer::new();
        let html = renderer.render_element(rsx! {
            ConnectionWarningBanner {
                context,
                status: app_state::ConnectionStatus::DatabaseInitializing,
            }
        });
        assert!(html.contains("データベースを初期化中です"));
        assert!(html.contains("DB: 初期化中"));
    }
}
