use narumincho_vdom::*;

pub fn app() -> Node {
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
                    dialog(
                        [("id".to_string(), "create-account-dialog".to_string())],
                        [
                            "アカウント作成ダイアログだよ".to_string().into(),
                            Button::new()
                                .command_for("create-account-dialog")
                                .command("close")
                                .type_("button")
                                .children([text("閉じる")])
                                .into_node(),
                        ],
                    ),
                ],
            ),
        ],
    )
}
