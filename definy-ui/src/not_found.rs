use dioxus::prelude::*;

use crate::Location;
use crate::app_state::AppState;
use crate::page_context::PageContext;

#[component]
pub fn NotFoundView(state: AppState, context: PageContext) -> Element {
    rsx! {
        div {
            class: "page-shell not-found",
            style: "display: grid; gap: 2rem; width: 100%; max-width: 800px; margin: 0 auto; padding: 4rem 1rem; text-align: center; justify-items: center;",
            div {
                class: "not-found-code",
                style: "font-size: 6rem; font-weight: 700; color: var(--primary); letter-spacing: -0.05em; width: fit-content;",
                "404"
            }
            div {
                class: "not-found-title",
                style: "font-size: 1.5rem; color: var(--text); margin-bottom: 2rem;",
                {
                    context
                        .language
                        .label(
                            "Page Not Found",
                            "ページが見つかりません",
                            "Paĝo ne trovita",
                        )
                }
            }
            a {
                class: "cta-link",
                href: context.href_with_lang(Location::Home),
                style: "display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem; color: #0e1720; background: var(--primary); padding: 0.75rem 2rem; border-radius: var(--radius-full); text-decoration: none; font-weight: 600; transition: all 0.3s ease; box-shadow: 0 4px 10px rgb(124 192 216 / 0.25);",
                {context.language.label("Return to Home", "ホームに戻る", "Reen al hejmo")}
            }
        }
    }
}
