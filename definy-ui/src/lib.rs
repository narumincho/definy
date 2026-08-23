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

use narumincho_vdom::*;

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

pub fn render(state: &AppState, context: &PageContext) -> Node {
    let page_content = match &context.location {
        Some(Location::Home) => event_list::event_list_view(state, context),
        Some(Location::AccountList) => account_list::account_list_view(state, context),
        Some(Location::PartList) => part_list::part_list_view(state, context),
        Some(Location::ModuleList) => module_list::module_list_view(state, context),
        Some(Location::LocalEventQueue) => {
            local_event_queue::local_event_queue_view(state, context)
        }
        Some(Location::Module(hash)) => module_detail::module_detail_view(state, context, hash),
        Some(Location::Part(hash)) => part_detail::part_detail_view(state, context, hash),
        Some(Location::Event(hash)) => event_detail::event_detail_view(state, context, hash),
        Some(Location::Account(account_id)) => {
            account_detail::account_detail_view(state, context, account_id)
        }
        None => not_found::not_found_view(state, context),
    };

    let main_wrapper = Div::new()
        .style(
            Style::new()
                .set("display", "grid")
                .set("gap", "0.8rem")
                .set("width", "100%"),
        )
        .children(if state.is_db_connected {
            vec![page_content]
        } else {
            vec![db_warning_banner(context), page_content]
        })
        .into_node();

    Body::new()
        .style(
            Style::new()
                .set("display", "grid")
                .set("gap", "0.8rem")
                .set("align-content", "start")
                .set("padding-top", "4.2rem"),
        )
        .children([
            header::header(state, context),
            main_wrapper,
            login_or_create_account_dialog::login_or_create_account_dialog(state, context),
        ])
        .into_node()
}

fn db_warning_banner(context: &PageContext) -> Node {
    Div::new()
        .class("db-warning-banner")
        .style(
            Style::new()
                .set("width", "calc(100% - 1.8rem)")
                .set("max-width", "920px")
                .set("margin", "0.4rem auto 0")
                .set("padding", "0.65rem 1rem")
                .set("background", "rgb(245 158 11 / 0.12)")
                .set("border", "1px solid rgb(245 158 11 / 0.35)")
                .set("border-radius", "var(--radius-md)")
                .set("color", "#fcd34d")
                .set("font-size", "0.86rem")
                .set("display", "flex")
                .set("align-items", "center")
                .set("justify-content", "space-between")
                .set("gap", "0.75rem"),
        )
        .children([
            Div::new()
                .style(
                    Style::new()
                        .set("display", "flex")
                        .set("align-items", "center")
                        .set("gap", "0.5rem"),
                )
                .children([
                    Div::new()
                        .style(Style::new().set("font-size", "1rem"))
                        .children([text("⚠️")])
                        .into_node(),
                    Div::new()
                        .children([text(context.language.label(
                            "Cannot connect to database. Local and offline features are available. Retrying connection...",
                            "データベースに接続できません。ローカル機能・式の計算は利用可能です。接続を再試行しています...",
                            "Ne povas konektiĝi al datumbazo. Lokaj funkcioj disponeblas. Rekonektante...",
                        ))])
                        .into_node(),
                ])
                .into_node(),
            Div::new()
                .style(
                    Style::new()
                        .set("font-size", "0.75rem")
                        .set("opacity", "0.8")
                        .set("white-space", "nowrap"),
                )
                .children([text(context.language.label(
                    "Retrying...",
                    "再接続中...",
                    "Rekonektante...",
                ))])
                .into_node(),
        ])
        .into_node()
}
