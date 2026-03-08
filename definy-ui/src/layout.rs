use narumincho_vdom::Style;

pub fn page_shell_style(gap: &str) -> Style {
    Style::new()
        .set("display", "grid")
        .set("gap", gap)
        .set("width", "100%")
        .set("max-width", "920px")
        .set("margin", "0 auto")
        .set("padding", "1.2rem 0.9rem 1.9rem")
}
