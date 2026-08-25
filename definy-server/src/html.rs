use definy_ui::{AppState, PageContext};

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
    let title = definy_ui::document_title_text(state, context);
    let lang_code = context.language.to_code();
    let css = include_str!("../../definy-ui/main.css");
    let ssr_id = definy_ui::SSR_INITIAL_STATE_ELEMENT_ID;
    let js_path = resource_hash.js;
    let wasm_path = resource_hash.wasm;

    let body_html = dioxus_ssr::render_element(definy_ui::render(state, context));

    format!(
        r#"<!DOCTYPE html>
<html lang="{lang_code}">
<head>
<title>{title}</title>
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<link rel="icon" href="{icon_href}">
<style>{css}</style>
<script id="{ssr_id}" type="application/json">{ssr_initial_state_base64}</script>
<script type="module">import init from '/{js_path}'; init({{ module_or_path: '/{wasm_path}' }});</script>
</head>
<body>
<div id="main">{body_html}</div>
</body>
</html>"#,
        icon_href = include_str!("../../web-distribution/icon.png.sha256")
    )
}
