mod account_detail;
mod account_list;
mod app_state;
pub mod dropdown;
mod event_detail;
mod event_filter;
mod event_list;
mod event_presenter;
mod expression_editor;
mod expression_eval;
pub mod fetch;
mod hash_format;
mod header;
pub mod i18n;
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
mod page_title;
mod part_detail;
mod part_list;
mod part_projection;
pub mod query;
pub mod wasm_emitter;

pub use app_state::*;
pub use event_filter::*;
pub use local_event::*;
pub use message::Message;

use narumincho_vdom::*;

pub const SSR_INITIAL_STATE_ELEMENT_ID: &str = "__DEFINY_INITIAL_STATE__";

pub struct ResourceHash {
    pub js: String,
    pub wasm: String,
}

#[derive(serde::Serialize, serde::Deserialize)]
struct SsrState {
    event_binaries_base64: Vec<String>,
    has_more: bool,
}

pub struct DecodedSsrState {
    pub event_binaries: Vec<Vec<u8>>,
    pub has_more: bool,
}

pub fn encode_ssr_state(event_binaries: &[Vec<u8>], has_more: bool) -> Option<String> {
    serde_cbor::to_vec(&SsrState {
        event_binaries_base64: event_binaries
            .iter()
            .map(|event_binary| {
                base64::Engine::encode(
                    &base64::engine::general_purpose::URL_SAFE_NO_PAD,
                    event_binary,
                )
            })
            .collect(),
        has_more,
    })
    .ok()
    .map(|vec| base64::Engine::encode(&base64::engine::general_purpose::URL_SAFE_NO_PAD, &vec))
}

pub fn decode_ssr_state(json: &str) -> Option<DecodedSsrState> {
    base64::Engine::decode(&base64::engine::general_purpose::URL_SAFE_NO_PAD, json)
        .ok()
        .and_then(|vec| serde_cbor::from_slice::<SsrState>(&vec).ok())
        .map(|state| DecodedSsrState {
            event_binaries: state
                .event_binaries_base64
                .into_iter()
                .filter_map(|encoded| {
                    base64::Engine::decode(
                        &base64::engine::general_purpose::URL_SAFE_NO_PAD,
                        encoded,
                    )
                    .ok()
                })
                .collect(),
            has_more: state.has_more,
        })
}

pub fn render(
    state: &AppState,
    resource_hash: &Option<ResourceHash>,
    ssr_initial_state_json: Option<&str>,
) -> Node<AppState> {
    let mut head_children = vec![
        Title::new()
            .children([text(page_title::document_title_text(state))])
            .into_node(),
        Meta::new("viewport", "width=device-width,initial-scale=1.0"),
        Link::new()
            .rel("icon")
            .href(include_str!("../../web-distribution/icon.png.sha256"))
            .into_node(),
        StyleElement::new()
            .children([text(include_str!("../main.css"))])
            .into_node(),
    ];
    match resource_hash {
        Some(r) => {
            if let Some(ssr_initial_state_json) = ssr_initial_state_json {
                head_children.push(
                    Script::new()
                        .id(SSR_INITIAL_STATE_ELEMENT_ID)
                        .type_("application/json")
                        .children([text(ssr_initial_state_json)])
                        .into_node(),
                );
            }
            head_children.push(
                Script::new()
                    .type_("module")
                    .children([text(format!(
                        "import init from '/{}';
init({{ module_or_path: \"/{}\" }});",
                        r.js, r.wasm
                    ))])
                    .into_node(),
            );
        }
        _ => {}
    }
    Html::new()
        .attribute("lang", state.language.code)
        .children([
            Head::new().children(head_children).into_node(),
            Body::new()
                .style(
                    Style::new()
                        .set("display", "grid")
                        .set("gap", "0.8rem")
                        .set("padding-top", "4.2rem"),
                )
                .children([
                    header::header(state),
                    match &state.location {
                        Some(Location::Home) => event_list::event_list_view(state),
                        Some(Location::AccountList) => account_list::account_list_view(state),
                        Some(Location::PartList) => part_list::part_list_view(state),
                        Some(Location::ModuleList) => module_list::module_list_view(state),
                        Some(Location::LocalEventQueue) => {
                            local_event_queue::local_event_queue_view(state)
                        }
                        Some(Location::Module(hash)) => {
                            module_detail::module_detail_view(state, hash)
                        }
                        Some(Location::Part(hash)) => part_detail::part_detail_view(state, hash),
                        Some(Location::Event(hash)) => event_detail::event_detail_view(state, hash),
                        Some(Location::Account(account_id)) => {
                            account_detail::account_detail_view(state, account_id)
                        }
                        None => not_found::not_found_view(state),
                    },
                    login_or_create_account_dialog::login_or_create_account_dialog(state),
                ])
                .into_node(),
        ])
        .into_node()
}
