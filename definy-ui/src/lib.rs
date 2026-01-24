use narumincho_vdom::*;

pub struct ResourceHash {
    pub js: String,
    pub wasm: String
}

pub fn app(state: &AppState, resource_hash: &Option<ResourceHash>) -> Node<Message> {
    let mut head_children = vec![
        Title::<Message>::new().children([text("definy")]).into_node(),
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
            head_children.push(   Script::new()
                        .type_("module")
                        .children([text(format!(
                            "import init from './{}';
init({{ module_or_path: \"{}\" }});", r.js, r.wasm))])
                        .into_node());
        },
        _ => {}
    }
    Html::new()
        .children([
            Head::new()
                .children(head_children)
                .into_node(),
            Body::new()
                .children({ 
                    let mut vec = vec![
                    H1::new().children([text("definy")]).into_node()];
                    vec.extend(state.created_account_events.iter().map(|(signature, event)| {
                        Div::new()
                            .children([text(format!("{:?}: {:?}", signature, event))])
                            .into_node()
                    }));
                    vec.push(Button::new()
                        .command_for("create-account-dialog")
                        .command("show-modal")
                        .on_click(Message::ShowCreateAccountDialog)
                        .children([text("アカウント作成")])
                        .into_node());
                    vec.push(create_account_dialog(state, &state.generated_key));
                    vec
                })
                .into_node(),
        ])
        .into_node()
}
 
#[derive(Clone)]
pub struct AppState {
    pub count: i32,
    pub generated_key: Option<ed25519_dalek::SigningKey>,
    pub username: String,
    pub creating_account: bool,
    pub created_account_events: Vec<(ed25519_dalek::Signature, definy_event::CreateAccountEvent)>,
}

#[derive(Debug, PartialEq, Clone)]
pub enum Message {
    ShowCreateAccountDialog,
    CloseCreateAccountDialog,
    RegenerateKey,
    CopyPrivateKey,
    UpdateUsername(String),
    SubmitCreateAccountForm,
    ResponseCreateAccount,
}

/// アカウント作成ダイアログ
pub fn create_account_dialog(
    state: &AppState,
    key: &Option<ed25519_dalek::SigningKey>,
) -> Node<Message> {
    let mut password_input = Input::new()
        .type_("password")
        .name("password")
        .autocomplete("new-password")
        .required()
        .readonly();

    if let Some(key) = key {
        password_input = password_input.attribute("value", 
        &"*".repeat(
            base64::Engine::encode(&base64::engine::general_purpose::URL_SAFE_NO_PAD, key.to_bytes()).len()
        ));
    }

    let mut user_id_input = Input::new()
        .type_("text")
        .name("userId")
        .readonly()
        .disabled(state.creating_account)
        .attribute("style", "font-family: monospace; font-size: 0.9rem;");

    if let Some(key) = key {
        user_id_input = user_id_input.attribute("value", 
            &base64::Engine::encode(&base64::engine::general_purpose::URL_SAFE_NO_PAD, key.verifying_key().to_bytes())
        );
    }

    Dialog::new()
        .id("create-account-dialog")
        .children([
            H1::new()
                .children([text("アカウント作成")])
                .attribute("style", "margin-top: 0; font-size: 1.5rem;")
                .into_node(),
            Form::new()
                .on_submit(Message::SubmitCreateAccountForm) 
                .children([
                    Label::new()
                        .class("form-group")
                        .children([
                            text("ユーザー名"),
                            Input::new()
                                .type_("text")
                                .name("username")
                                .autocomplete("username")
                                .required()
                                .attribute("value", &state.username)
                                .on_change(Message::UpdateUsername(String::new()))
                                .into_node(),
                        ])
                        .into_node(),
                    Label::new()
                        .class("form-group")
                        .children([
                            text("ユーザーID (公開鍵)"),
                            user_id_input.into_node(),
                        ])
                        .into_node(),
                    Label::new()
                        .class("form-group")
                        .children([
                            text("秘密鍵"),
                            Div::new()
                                .class("hint")
                                .children([
                                    text("分散システムのため秘密鍵を失うとログインすることができなくなってしまいます"),
                                ])
                                .into_node(),
                            Div::new()
                                .attribute("style", "display: flex; gap: 0.5rem;")
                                .children([
                                    password_input
                                        .attribute("style", "flex: 1;")
                                        .into_node(),
                                    Button::new()
                                        .on_click(Message::CopyPrivateKey)
                                        .type_("button")
                                        .children([text("コピー")])
                                        .into_node(),
                                    Button::new()
                                        .on_click(Message::RegenerateKey)
                                        .type_("button")
                                        .disabled(state.creating_account)
                                        .children([text("再生成")])
                                        .into_node(),
                                ])
                                .into_node(),
                        ])
                        .into_node(),
                    Div::new()
                        .class("dialog-buttons")
                        .children([
                            Button::new()
                                .command_for("create-account-dialog")
                                .command("close") 
                                .type_("button")
                                .on_click(Message::CloseCreateAccountDialog)
                                .children([text("キャンセル")])
                                .into_node(),
                            Button::new()
                                .type_("submit") 
                                .disabled(state.creating_account)
                                .children([text(if state.creating_account { "登録中..." } else { "登録" })])
                                .into_node(),
                        ])
                        .into_node(),
                ])
                .into_node(),
        ])
        .into_node()
}
