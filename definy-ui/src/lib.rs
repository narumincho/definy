mod app_state;
mod login_or_create_account_dialog;
mod message;

pub use app_state::*;
pub use message::Message;

use narumincho_vdom::*;
use wasm_bindgen::JsValue;

pub struct ResourceHash {
    pub js: String,
    pub wasm: String,
}

pub fn app(state: &AppState, resource_hash: &Option<ResourceHash>) -> Node {
    let mut head_children = vec![
        Title::new().children([text("definy")]).into_node(),
        Meta::new("viewport", "width=device-width,initial-scale=1.0"),
        Link::new()
            .rel("icon")
            .href(include_str!("../../web-distribution/icon.png.sha256"))
            .into_node(),
        Style::new()
            .children([text(
                ":root {
    --background: #121212;
    --surface: #1E1E1E;
    --primary: #BB86FC;
    --primary-variant: #3700B3;
    --secondary: #03DAC6;
    --text: #E1E1E1;
    --text-secondary: #B0B0B0;
    --error: #CF6679;
    --border: #333333;
}

body {
    background-color: var(--background);
    color: var(--text);
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    margin: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    min-height: 100vh;
}

h1 {
    color: var(--primary);
    margin: 2rem 0;
}

button {
    background-color: var(--primary);
    color: #000;
    border: none;
    border-radius: 4px;
    padding: 0.5rem 1rem;
    font-weight: bold;
    cursor: pointer;
    transition: background-color 0.2s;
}

button:hover {
    background-color: var(--secondary);
}

button[type='button'] {
    background-color: var(--surface);
    color: var(--primary);
    border: 1px solid var(--primary);
}

button[type='button']:hover {
    background-color: rgba(187, 134, 252, 0.1);
}

dialog {
    background-color: var(--surface);
    color: var(--text);
    border: 1px solid var(--border);
    border-radius: 8px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
    padding: 2rem;
    max-width: 400px;
    width: 90%;
}

dialog::backdrop {
    background-color: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(4px);
}

.form-group {
    margin-bottom: 1rem;
    display: flex;
    flex-direction: column;
}

label {
    margin-bottom: 0.5rem;
    color: var(--text-secondary);
    font-size: 0.9rem;
}

input {
    background-color: #2C2C2C;
    border: 1px solid var(--border);
    border-radius: 4px;
    padding: 0.5rem;
    color: var(--text);
    font-size: 1rem;
}

input:focus {
    outline: none;
    border-color: var(--primary);
}

.dialog-buttons {
    display: flex;
    justify-content: flex-end;
    gap: 1rem;
    margin-top: 1.5rem;
}

.hint {
    font-size: 0.8rem;
    color: var(--text-secondary);
    margin-bottom: 0.5rem;
    display: block;
}
",
            )])
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
            Body::new().style("display: grid; gap: 1rem;").children([
                H1::new().children([text("definy")]).into_node(),
                 Button::new()
                    .command_for("login-or-create-account-dialog")
                    .command("show-modal")
                    .on_click(&|set_state| {
                        web_sys::console::log_1(&JsValue::from_str("sample"));
                    })
                    .children([text("ログインまたはアカウント作成")])
                    .into_node(),
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
                    }).collect::<Vec<Node>>()).into_node(),
                login_or_create_account_dialog::login_or_create_account_dialog(state),
            ]).into_node(),
        ])
        .into_node()
}
