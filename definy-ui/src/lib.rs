use narumincho_vdom::*;

pub fn app(count: i32) -> Node {
    html(
        [],
        [
            head(
                [],
                [
                    title([], [text("definy Server")]),
                    link(
                        [
                            ("rel".to_string(), "icon".to_string()),
                            (
                                "href".to_string(),
                                include_str!("../../web-distribution/icon.png.sha256").to_string(),
                            ),
                        ],
                        [],
                    ),
                    script(
                        [("type".to_string(), "module".to_string())],
                        [text(format!(
                            "import init from './{}';
init(\"{}\");",
                            include_str!("../../web-distribution/definy_client.js.sha256"),
                            include_str!("../../web-distribution/definy_client_bg.wasm.sha256"),
                        ))],
                    ),
                ],
            ),
            body(
                [],
                [
                    h1([], [text("definy")]),
                    Button::new()
                        .command_for("create-account-dialog")
                        .command("show-modal")
                        .type_("button")
                        .children([text("アカウント作成")])
                        .into_node(),
                    create_account_dialog(),
                    Button::new()
                        .command("increment")
                        .type_("button")
                        .children([text(format!("count: {}", count))])
                        .into_node(),
                ],
            ),
        ],
    )
}

/// アカウント作成ダイアログ
pub fn create_account_dialog() -> Node {
    dialog(
        [("id".to_string(), "create-account-dialog".to_string())],
        [
            "アカウント作成ダイアログだよ".to_string().into(),
            form(
                [],
                [
                    label(
                        [],
                        [
                            text("ユーザー名"),
                            input([
                                ("type".to_string(), "text".to_string()),
                                ("name".to_string(), "username".to_string()),
                                ("autocomplete".to_string(), "username".to_string()),
                                ("required".to_string(), "required".to_string()),
                            ]),
                            label(
                                [],
                                [
                                    text("秘密鍵"),
                                    text(
                                        "分散システムのため秘密鍵を失うとログインすることができなくなってしまいます",
                                    ),
                                    input([
                                        ("type".to_string(), "password".to_string()),
                                        ("name".to_string(), "password".to_string()),
                                        ("autocomplete".to_string(), "new-password".to_string()),
                                        ("required".to_string(), "required".to_string()),
                                        ("readonly".to_string(), "readonly".to_string()),
                                    ]),
                                ],
                            ),
                        ],
                    ),
                    Button::new()
                        .type_("submit")
                        .children([text("送信")])
                        .into_node(),
                ],
            ),
            Button::new()
                .command_for("create-account-dialog")
                .command("close")
                .type_("button")
                .children([text("閉じる")])
                .into_node(),
        ],
    )
}
