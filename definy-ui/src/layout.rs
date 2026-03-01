use narumincho_vdom::Style;

pub fn page_shell_style(gap: &str) -> Style {
    Style::new()
        .set("display", "grid")
        .set("gap", gap)
        .set("width", "100%")
        .set("max-width", "800px")
        .set("margin", "0 auto")
        .set("padding", "2rem 1rem")
}
