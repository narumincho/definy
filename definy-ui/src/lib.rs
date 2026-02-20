mod app_state;
mod event_list;
pub mod fetch;
mod header;
mod login_or_create_account_dialog;
mod message;
pub mod navigator_credential;

pub use app_state::*;
pub use message::Message;

use narumincho_vdom::*;

pub struct ResourceHash {
    pub js: String,
    pub wasm: String,
}

pub fn render(state: &AppState, resource_hash: &Option<ResourceHash>) -> Node<AppState> {
    let mut head_children = vec![
        Title::new().children([text("definy")]).into_node(),
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
            head_children.push(
                Script::new()
                    .type_("module")
                    .children([text(format!(
                        "import init from './{}';
init({{ module_or_path: \"{}\" }});",
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
                        .set("grid-template-rows", "auto 1fr"),
                )
                .children([
                    header::header(state),
                    event_list::event_list_view(state),
                    login_or_create_account_dialog::login_or_create_account_dialog(state),
                ])
                .into_node(),
        ])
        .into_node()
}
