use dioxus::prelude::*;

use crate::Location;
use crate::app_state::ApiMethod;
use crate::page_context::PageContext;

#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub enum ApiNavActive {
    Overview,
    Method(ApiMethod),
    Architecture,
}

#[component]
pub fn ApiSubNav(context: PageContext, active: ApiNavActive) -> Element {
    let lang = context.language;

    let is_overview_active = active == ApiNavActive::Overview;
    let is_arch_active = active == ApiNavActive::Architecture;

    rsx! {
        div { style: "display: flex; flex-direction: column; gap: 0.6rem; width: 100%; border-bottom: 1px solid var(--border); padding-bottom: 0.8rem; margin-bottom: 0.5rem;",
            div { style: "display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem;",
                div { style: "display: flex; align-items: center; gap: 0.5rem;",
                    span { style: "font-size: 1.2rem;", "⚡" }
                    span { style: "font-weight: 700; font-size: 1.05rem; color: var(--text-primary);",
                        "Connect-RPC (gRPC) Specification"
                    }
                    span { style: "font-size: 0.72rem; padding: 0.15rem 0.5rem; border-radius: 9999px; background: var(--blue-bg-strong); color: var(--blue); font-weight: 600; border: 1px solid var(--blue-border);",
                        "Connect 1"
                    }
                }
                div { style: "display: flex; gap: 0.4rem; align-items: center;",
                    a {
                        href: context.href_with_lang(Location::About),
                        style: "font-size: 0.82rem; color: var(--text-secondary); text-decoration: none; padding: 0.3rem 0.6rem; border-radius: var(--radius-sm); border: 1px solid var(--border); transition: background 0.15s ease;",
                        {
                            lang.label(
                                "← Back to About",
                                "← definy についてに戻る",
                                "← Reen al Pri",
                            )
                        }
                    }
                }
            }

            // ナビゲーションバー
            nav { style: "display: flex; gap: 0.35rem; overflow-x: auto; scrollbar-width: none; padding: 0.2rem 0; width: 100%;",
                // 1. 概要
                a {
                    href: context.href_with_lang(Location::ApiOverview),
                    class: "toggle-chip",
                    "aria-current": if is_overview_active { "page" } else { "false" },
                    {lang.label("Overview", "API 概要", "Superrigardo")}
                }

                // 2. 各メソッド (専用ページへのリンク)
                for method in ApiMethod::all() {
                    {
                        let is_active = active == ApiNavActive::Method(*method);
                        let name = method.name();
                        let target_loc = Location::ApiMethod(*method, None);
                        let href = context.href_with_lang(target_loc);
                        rsx! {
                            a {
                                key: "{name}",
                                href: "{href}",
                                class: "toggle-chip",
                                "aria-current": if is_active { "page" } else { "false" },
                                "{name}"
                            }
                        }
                    }
                }

                // 3. アーキテクチャ・シーケンス図
                a {
                    href: context.href_with_lang(Location::ApiArchitecture),
                    class: "toggle-chip",
                    "aria-current": if is_arch_active { "page" } else { "false" },
                    {
                        lang.label(
                            "Sequence Diagrams",
                            "シーケンス図・アーキテクチャ",
                            "Sekvencaj Diagramoj",
                        )
                    }
                }
            }
        }
    }
}
