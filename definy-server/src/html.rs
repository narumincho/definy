use definy_ui::{AppState, PageContext};
use narumincho_vdom::{Head, Html, Link, Meta, Script, StyleElement, Title, text};

pub struct ResourceHash<'a> {
    pub js: &'a str,
    pub wasm: &'a str,
}

pub fn render_to_html(
    state: &AppState,
    context: &PageContext,
    resource_hash: &ResourceHash,
    ssr_initial_state_base64: &str,
) -> String {
    let head_children = vec![
        Title::new()
            .children([text(definy_ui::document_title_text(state, context))])
            .into_node(),
        Meta::new()
            .name("viewport")
            .content("width=device-width,initial-scale=1.0")
            .into_node(),
        Link::new()
            .rel("icon")
            .href(include_str!("../../web-distribution/icon.png.sha256"))
            .into_node(),
        StyleElement::new()
            .children([text(include_str!("../../definy-ui/main.css"))])
            .into_node(),
        Script::new()
            .id(definy_ui::SSR_INITIAL_STATE_ELEMENT_ID)
            .type_("application/json")
            .children([text(ssr_initial_state_base64)])
            .into_node(),
        Script::new()
            .type_("module")
            .children([text(format!(
                "import init from '/{}';\n    init({{ module_or_path: \"/{}\" }});",
                resource_hash.js, resource_hash.wasm
            ))])
            .into_node(),
    ];
    let html_node = Html::new()
        .lang(context.language.to_code())
        .children([
            Head::new().children(head_children).into_node(),
            definy_ui::render(state, context),
        ])
        .into_node();
    narumincho_vdom::to_html(&html_node)
}
