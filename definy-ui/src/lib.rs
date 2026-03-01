mod account_detail;
mod account_list;
mod app_state;
mod event_detail;
mod event_list;
mod event_presenter;
mod expression_editor;
mod expression_eval;
pub mod fetch;
mod header;
mod login_or_create_account_dialog;
mod message;
pub mod navigator_credential;
mod not_found;
mod part_list;
mod part_detail;
mod page_title;
mod part_projection;

pub use app_state::*;
pub use message::Message;

use narumincho_vdom::*;

pub const SSR_INITIAL_STATE_ELEMENT_ID: &str = "__DEFINY_INITIAL_STATE__";

pub struct ResourceHash {
    pub js: String,
    pub wasm: String,
}

#[derive(serde::Serialize, serde::Deserialize)]
struct SsrInitialState {
    event_binaries_base64: Vec<String>,
}

pub fn encode_ssr_initial_state(event_binaries: &[Vec<u8>]) -> Option<String> {
    serde_json::to_string(&SsrInitialState {
        event_binaries_base64: event_binaries
            .iter()
            .map(|event_binary| {
                base64::Engine::encode(
                    &base64::engine::general_purpose::URL_SAFE_NO_PAD,
                    event_binary,
                )
            })
            .collect(),
    })
    .ok()
}

pub fn decode_ssr_initial_state(json: &str) -> Option<Vec<Vec<u8>>> {
    serde_json::from_str::<SsrInitialState>(json).ok().map(|state| {
        state
            .event_binaries_base64
            .into_iter()
            .filter_map(|encoded| {
                base64::Engine::decode(&base64::engine::general_purpose::URL_SAFE_NO_PAD, encoded)
                    .ok()
            })
            .collect()
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
        .children([
            Head::new().children(head_children).into_node(),
            Body::new()
                .style(
                    Style::new()
                        .set("display", "grid")
                        .set("gap", "1rem")
                        .set("padding-top", "4.8rem"),
                )
                .children([
                    header::header(state),
                    match &state.location {
                        Some(Location::Home) => event_list::event_list_view(state),
                        Some(Location::AccountList) => account_list::account_list_view(state),
                        Some(Location::PartList) => part_list::part_list_view(state),
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
