use definy_ui::{AppState, PageContext};

pub struct ResourceHash<'a> {
    pub js: &'a str,
    #[allow(dead_code)]
    pub wasm: &'a str,
    pub icon: &'a str,
}

fn escape_html_attr(s: &str) -> String {
    s.replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
}

pub fn render_to_html(
    state: &AppState,
    context: &PageContext,
    resource_hash: &ResourceHash,
    ssr_initial_state_base64: &str,
) -> String {
    let title = definy_ui::document_title_text(state, context);
    let description = definy_ui::document_description_text(state, context);
    let escaped_title = escape_html_attr(&title);
    let escaped_desc = escape_html_attr(&description);
    let lang_code = context.language.to_code();
    let css = std::fs::read_to_string("definy-ui/main.css")
        .unwrap_or_else(|_| include_str!("../../definy-ui/main.css").to_string());
    let ssr_id = definy_ui::SSR_INITIAL_STATE_ELEMENT_ID;
    let js_path = resource_hash.js;
    let icon_href = resource_hash.icon;

    let body_html = dioxus_ssr::render_element(definy_ui::render(state, context));

    format!(
        r#"<!DOCTYPE html>
<html lang="{lang_code}">
<head>
<title>{escaped_title}</title>
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<meta name="description" content="{escaped_desc}">
<meta property="og:title" content="{escaped_title}">
<meta property="og:description" content="{escaped_desc}">
<meta property="og:type" content="website">
<meta property="og:image" content="{icon_href}">
<meta name="twitter:card" content="summary">
<meta name="twitter:title" content="{escaped_title}">
<meta name="twitter:description" content="{escaped_desc}">
<link rel="icon" href="{icon_href}">
<style>{css}</style>
<script id="{ssr_id}" type="application/json">{ssr_initial_state_base64}</script>
<script type="module" src="/wasm/definy_client.js?v={js_path}"></script>
</head>
<body>
<div id="main">{body_html}</div>
</body>
</html>"#
    )
}
