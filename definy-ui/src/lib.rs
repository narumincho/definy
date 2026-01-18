use narumincho_vdom::*;

pub fn app(state: &AppState) -> Node<Message> {
    Html::new()
        .children([
            Head::new()
                .children([
                    Title::new().children([text("definy")]).into_node(),
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
                    Script::new()
                        .type_("module")
                        .children([text(format!(
                            "import init from './{}';
init(\"{}\");",
                            include_str!("../../web-distribution/definy_client.js.sha256"),
                            include_str!("../../web-distribution/definy_client_bg.wasm.sha256"),
                        ))])
                        .into_node(),
                ])
                .into_node(),
            Body::new()
                .children([
                    H1::new().children([text("definy")]).into_node(),
                    Button::new()
                        .command_for("create-account-dialog")
                        .command("show-modal")
                        .on_click(Message::ShowCreateAccountDialog)
                        .children([text("アカウント作成")])
                        .into_node(),
                    create_account_dialog(&state.generated_key, &state.generated_public_key),
                    Div::new()
                        .attribute("style", "margin-top: 1rem;")
                        .children([Button::new()
                            .on_click(Message::Increment)
                            .type_("button")
                            .children([text(format!("count: {}", state.count))])
                            .into_node()])
                        .into_node(),
                ])
                .into_node(),
        ])
        .into_node()
}

#[derive(Clone)]
pub struct AppState {
    pub count: i32,
    pub generated_key: Option<String>,
    pub generated_public_key: Option<String>,
}

#[derive(Debug, PartialEq, Clone)]
pub enum Message {
    Increment,
    ShowCreateAccountDialog,
    CloseCreateAccountDialog,
    RegenerateKey,
    CopyPrivateKey,
    SubmitCreateAccountForm,
}

/// アカウント作成ダイアログ
pub fn create_account_dialog(
    secret_key: &Option<String>,
    public_key: &Option<String>,
) -> Node<Message> {
    let mut password_input = Input::new()
        .type_("password")
        .name("password")
        .autocomplete("new-password")
        .required()
        .readonly();

    if let Some(key) = secret_key {
        password_input = password_input.attribute("value", &key);
    }

    let mut user_id_input = Input::new()
        .type_("text")
        .name("userId")
        .readonly()
        .attribute("style", "font-family: monospace; font-size: 0.9rem;");

    if let Some(pk) = public_key {
        user_id_input = user_id_input.attribute("value", &pk);
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
                    Div::new()
                        .class("form-group")
                        .children([
                            Label::new().children([text("ユーザー名")]).into_node(),
                            Input::new()
                                .type_("text")
                                .name("username")
                                .autocomplete("username")
                                .required()
                                .into_node(),
                        ])
                        .into_node(),
                    Div::new()
                        .class("form-group")
                        .children([
                            Label::new()
                                .children([text("ユーザーID (公開鍵)")])
                                .into_node(),
                            user_id_input.into_node(),
                        ])
                         .into_node(),
                    Div::new()
                        .class("form-group")
                        .children([
                            Label::new()
                                .children([
                                    text("秘密鍵"),
                                    text(
                                        " (分散システムのため秘密鍵を失うとログインすることができなくなってしまいます)",
                                    ),
                                ])
                                .class("hint")
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
                                .children([text("登録 (未実装)")])
                                .into_node(),
                        ])
                        .into_node(),
                ])
                .into_node(),
        ])
        .into_node()
}
