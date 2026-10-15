pub fn page_shell_style(gap: &str) -> String {
    format!(
        "display: grid; gap: {}; align-content: start; width: 100%; max-width: var(--content-max-width); margin: 0; padding: 1.1rem 1.5rem 2rem;",
        gap
    )
}
