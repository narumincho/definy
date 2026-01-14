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
                        "script",
                        [("type".to_string(), "module".to_string())],
                        [text(
                            "import init from './script.js';
init();",
                        )],
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
