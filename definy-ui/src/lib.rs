use narumincho_vdom::h;
use narumincho_vdom::text;

pub fn app() -> narumincho_vdom::Node {
    h(
        "html",
        vec![
            h("head", [h("title", [text("definy Server")])]),
            h("body", [h("h1", [text("aa")])]),
        ],
    )
}
