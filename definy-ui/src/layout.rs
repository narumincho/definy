pub fn page_shell_style(gap: &str) -> String {
    format!(
        "display: grid; gap: {}; align-content: start; width: 100%; max-width: 920px; margin: 0 auto; padding: 1.2rem 0.9rem 1.9rem;",
        gap
    )
}
