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
                    h1([], [text("aa")]),
                    button(
                        [
                            (
                                "commandFor".to_string(),
                                "create-account-dialog".to_string(),
                            ),
                            ("command".to_string(), "show-modal".to_string()),
                        ],
                        [text("アカウント作成")],
                    ),
                    dialog(
                        [("id".to_string(), "create-account-dialog".to_string())],
                        [
                            text("アカウント作成ダイアログだよ"),
                            button(
                                [
                                    (
                                        "commandFor".to_string(),
                                        "create-account-dialog".to_string(),
                                    ),
                                    ("command".to_string(), "close".to_string()),
                                ],
                                [text("閉じる")],
                            ),
                        ],
                    ),
                ],
            ),
        ],
    )
}
