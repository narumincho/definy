mod app_state;
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

pub fn app(state: &AppState, resource_hash: &Option<ResourceHash>) -> Node<AppState> {
    let mut head_children = vec![
        Title::new().children([text("definy")]).into_node(),
        Meta::new("viewport", "width=device-width,initial-scale=1.0"),
        Link::new()
            .rel("icon")
            .href(include_str!("../../web-distribution/icon.png.sha256"))
            .into_node(),
        Style::new()
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
            Body::new().style("display: grid; gap: 1rem; grid-template-rows: auto 1fr;").children([
                header::header(state),
                Div::new()
                    .style("display: grid; gap: 0.5rem;")
                    .children(state.created_account_events.iter().map(|(_, event)| {
                        Div::new()
                            .style("border: 1px solid var(--border); border-radius: 4px; padding: 0.5rem; color: var(--text); font-size: 1rem;")
                            .children([
                                Div::new()
                                    .children([
                                        text("アカウント「"),
                                        text(event.account_name.as_ref()),
                                        text("」が作成されました"),
                                    ])
                                    .into_node(),
                                Div::new()
                                    .children([text(&event.time.to_string())])
                                    .into_node(),
                            ])
                            .into_node()
                    }).collect::<Vec<Node<AppState>>>()).into_node(),
                login_or_create_account_dialog::login_or_create_account_dialog(state),
            ]).into_node(),
        ])
        .into_node()
}
