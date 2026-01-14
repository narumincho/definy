use narumincho_vdom::h;
use narumincho_vdom::text;

pub fn app() -> narumincho_vdom::Node {
    h(
        "html",
        vec![],
        vec![
            h(
                "head",
                vec![],
                [h("title", vec![], [text("definy Server")])],
            ),
            h(
                "body",
                vec![],
                [h(
                    "h1",
                    vec![("id".to_string(), "app".to_string())],
                    [text("aa")],
                )],
            ),
        ],
    )
}
