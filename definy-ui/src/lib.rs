use narumincho_vdom::h;
use narumincho_vdom::text;

pub fn app() -> narumincho_vdom::Node {
    h(
        "html",
        [],
        [
            h(
                "head",
                [],
                [
                    h("title", [], [text("definy Server")]),
                    h(
                        "link",
                        [
                            ("rel".to_string(), "icon".to_string()),
                            (
                                "href".to_string(),
                                include_str!("../../web-distribution/icon.png.sha256").to_string(),
                            ),
                        ],
                        [],
                    ),
                    h(
                        "script",
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
            h(
                "body",
                [],
                [h(
                    "h1",
                    [("id".to_string(), "app".to_string())],
                    [text("aa")],
                )],
            ),
        ],
    )
}
