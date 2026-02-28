use crate::Location;
use crate::app_state::AppState;
use narumincho_vdom::*;

pub fn not_found_view(_state: &AppState) -> Node<AppState> {
    Div::new()
        .style(
            Style::new()
                .set("display", "grid")
                .set("gap", "2rem")
                .set("width", "100%")
                .set("max-width", "800px")
                .set("margin", "0 auto")
                .set("padding", "4rem 1rem")
                .set("text-align", "center")
                .set("justify-items", "center"),
        )
        .children([
            Div::new()
                .style(
                    Style::new()
                        .set("font-size", "6rem")
                        .set("font-weight", "700")
                        .set("background", "var(--primary-gradient)")
                        .set("-webkit-background-clip", "text")
                        .set("-webkit-text-fill-color", "transparent")
                        .set("color", "transparent")
                        .set("letter-spacing", "-0.05em")
                        .set("width", "fit-content"),
                )
                .children([text("404")])
                .into_node(),
            Div::new()
                .style(
                    Style::new()
                        .set("font-size", "1.5rem")
                        .set("color", "var(--text-primary)")
                        .set("margin-bottom", "2rem"),
                )
                .children([text("Page Not Found")])
                .into_node(),
            A::<AppState, Location>::new()
                .href(Href::Internal(Location::Home))
                .style(
                    Style::new()
                        .set("display", "inline-flex")
                        .set("align-items", "center")
                        .set("justify-content", "center")
                        .set("gap", "0.5rem")
                        .set("color", "var(--primary-content)")
                        .set("background", "var(--primary-gradient)")
                        .set("padding", "0.75rem 2rem")
                        .set("border-radius", "var(--radius-full)")
                        .set("text-decoration", "none")
                        .set("font-weight", "600")
                        .set("transition", "all 0.3s ease")
                        .set("box-shadow", "0 4px 10px rgba(139, 92, 246, 0.25)"),
                )
                .children([text("Return to Home")])
                .into_node(),
        ])
        .into_node()
}
