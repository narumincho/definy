use dioxus::prelude::*;

use super::method_nav::{ApiNavActive, ApiSubNav};
use crate::page_context::PageContext;
use crate::rpc_architecture::{
    DataLayersExplanation, FetchSequenceDiagram, NegotiationSequenceDiagram, SubmitSequenceDiagram,
};

#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub enum ArchDiagramTab {
    Negotiation,
    Submit,
    Fetch,
    DataLayers,
    All,
}

impl ArchDiagramTab {
    #[must_use]
    pub fn from_str_param(s: &str) -> Self {
        match s.to_ascii_lowercase().as_str() {
            "submit" | "2" => Self::Submit,
            "fetch" | "3" => Self::Fetch,
            "datalayers" | "data-layers" | "layers" | "4" => Self::DataLayers,
            "all" | "all-diagrams" | "all_diagrams" | "5" => Self::All,
            _ => Self::Negotiation,
        }
    }

    #[must_use]
    pub const fn as_str_param(&self) -> &'static str {
        match self {
            Self::Negotiation => "negotiation",
            Self::Submit => "submit",
            Self::Fetch => "fetch",
            Self::DataLayers => "datalayers",
            Self::All => "all",
        }
    }
}

#[component]
pub fn RpcArchitecturePageView(context: PageContext) -> Element {
    let initial_tab = context
        .tab
        .as_deref()
        .map(ArchDiagramTab::from_str_param)
        .unwrap_or(ArchDiagramTab::Negotiation);
    let mut current_tab = use_signal(|| initial_tab);
    let lang = context.language;
    let page_shell_style = crate::layout::page_shell_style("1.2rem");

    let tab_link_style = |tab: ArchDiagramTab| -> &'static str {
        if current_tab() == tab {
            "display: inline-block; padding: 0.5rem 1rem; border-radius: var(--radius-sm); font-size: 0.84rem; font-weight: 600; text-decoration: none; border: none; background: #0284c7; color: #fff; cursor: pointer; transition: background 0.15s ease;"
        } else {
            "display: inline-block; padding: 0.5rem 1rem; border-radius: var(--radius-sm); font-size: 0.84rem; font-weight: 500; text-decoration: none; border: 1px solid var(--border); background: rgba(255, 255, 255, 0.04); color: var(--text-primary); cursor: pointer; transition: background 0.15s ease;"
        }
    };

    rsx! {
        div { class: "page-shell", style: "{page_shell_style}",
            div { style: "display: grid; gap: 1.5rem; max-width: 1140px; margin: 0 auto; width: 100%;",

                // 上部サブナビゲーション
                ApiSubNav {
                    context: context.clone(),
                    active: ApiNavActive::Architecture,
                }

                // ヘッダー説明
                div {
                    class: "event-detail-card",
                    style: "background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-md); padding: 1.5rem; display: grid; gap: 0.8rem;",
                    div { style: "display: flex; align-items: center; gap: 0.6rem;",
                        span { style: "font-size: 1.5rem;", "🗺️" }
                        h1 { style: "font-size: 1.4rem; font-weight: 800; margin: 0; color: var(--text-primary);",
                            {
                                lang.label(
                                    "Connect-RPC & Cryptographic Communication Architecture",
                                    "Connect-RPC & 暗号通信アーキテクチャ・シーケンス図",
                                    "Connect-RPC & Kriptografia Komunika Arkitekturo",
                                )
                            }
                        }
                    }
                    p { style: "font-size: 0.92rem; color: var(--text-secondary); margin: 0; line-height: 1.6;",
                        {
                            lang.label(
                                "Detailed sequence diagrams of definy's Git-style Content-Addressed Storage (CAS) diff hash negotiation, zero-trust event submission with Ed25519 signing, and verified event projection.",
                                "definy における Git Tree/Blob モデルの差分ハッシュ・ネゴシエーション、決定論的 CBOR と Ed25519 署名によるゼロトラストイベント送信、およびクライアント側署名検証・ローカル射影の完全シーケンス図です。",
                                "Detalaj sekvencaj diagramoj de Git-stila CAS diferenca haŝ-negocado kaj nulfidaj eventoj.",
                            )
                        }
                    }

                    // タブ切り替えリンク（SSRでも遷移可能、Wasm動作時は即時タブ切替）
                    div { style: "display: flex; gap: 0.5rem; flex-wrap: wrap; margin-top: 0.4rem;",
                        a {
                            href: "/api/architecture?tab=negotiation&lang={lang.to_code()}",
                            style: tab_link_style(ArchDiagramTab::Negotiation),
                            onclick: move |e| {
                                e.prevent_default();
                                current_tab.set(ArchDiagramTab::Negotiation);
                            },
                            {
                                lang.label(
                                    "1. Diff Hash Negotiation (CAS)",
                                    "1. 差分ハッシュ・ネゴシエーション (CAS)",
                                    "1. Diferenca Haŝ-Negocado (CAS)",
                                )
                            }
                        }
                        a {
                            href: "/api/architecture?tab=submit&lang={lang.to_code()}",
                            style: tab_link_style(ArchDiagramTab::Submit),
                            onclick: move |e| {
                                e.prevent_default();
                                current_tab.set(ArchDiagramTab::Submit);
                            },
                            {
                                lang.label(
                                    "2. Event Submission (SubmitEvent)",
                                    "2. イベント送信 (SubmitEvent)",
                                    "2. Eventa Sendo (SubmitEvent)",
                                )
                            }
                        }
                        a {
                            href: "/api/architecture?tab=fetch&lang={lang.to_code()}",
                            style: tab_link_style(ArchDiagramTab::Fetch),
                            onclick: move |e| {
                                e.prevent_default();
                                current_tab.set(ArchDiagramTab::Fetch);
                            },
                            {
                                lang.label(
                                    "3. Event Fetching (GetEvents)",
                                    "3. イベント取得 (GetEvents)",
                                    "3. Eventa Akiro (GetEvents)",
                                )
                            }
                        }
                        a {
                            href: "/api/architecture?tab=datalayers&lang={lang.to_code()}",
                            style: tab_link_style(ArchDiagramTab::DataLayers),
                            onclick: move |e| {
                                e.prevent_default();
                                current_tab.set(ArchDiagramTab::DataLayers);
                            },
                            {
                                lang.label(
                                    "4. Data Layers Architecture",
                                    "4. データレイヤー構成",
                                    "4. Datanivelaj Arkitekturo",
                                )
                            }
                        }
                        a {
                            href: "/api/architecture?tab=all&lang={lang.to_code()}",
                            style: tab_link_style(ArchDiagramTab::All),
                            onclick: move |e| {
                                e.prevent_default();
                                current_tab.set(ArchDiagramTab::All);
                            },
                            {
                                lang.label(
                                    "5. All Diagrams (All in One)",
                                    "5. すべての図を一覧表示 (全展開)",
                                    "5. Ĉiuj Diagramoj (Tuta Vido)",
                                )
                            }
                        }
                    }
                }

                // シーケンス図表示コンポーネント (幅いっぱいのコンテナ)
                div { style: "width: 100%;",
                    match current_tab() {
                        ArchDiagramTab::Negotiation => rsx! {
                            NegotiationSequenceDiagram { language: lang }
                        },
                        ArchDiagramTab::Submit => rsx! {
                            SubmitSequenceDiagram { language: lang }
                        },
                        ArchDiagramTab::Fetch => rsx! {
                            FetchSequenceDiagram { language: lang }
                        },
                        ArchDiagramTab::DataLayers => rsx! {
                            DataLayersExplanation { language: lang }
                        },
                        ArchDiagramTab::All => rsx! {
                            div { style: "display: grid; gap: 2.5rem; width: 100%;",
                                // クイックジャンプ目次
                                div {
                                style: "background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-md); padding: 1rem 1.2rem; display: flex; gap: 1rem; align-items: center; flex-wrap: wrap; font-size: 0.88rem;",
                                    span { style: "font-weight: 700; color: var(--text-secondary);",
                                        {
                                            lang.label(
                                                "Quick Navigation:",
                                                "セクション目次:",
                                                "Rapida Navigado:",
                                            )
                                        }
                                    }
                                    a {
                                        href: "#section-negotiation",
                                        style: "color: #38bdf8; text-decoration: none;",
                                        "§1. Diff Hash Negotiation"
                                    }
                                    span { style: "color: var(--border);", "•" }
                                    a {
                                        href: "#section-submit",
                                        style: "color: #38bdf8; text-decoration: none;",
                                        "§2. Event Submission"
                                    }
                                    span { style: "color: var(--border);", "•" }
                                    a {
                                        href: "#section-fetch",
                                        style: "color: #38bdf8; text-decoration: none;",
                                        "§3. Event Fetching"
                                    }
                                    span { style: "color: var(--border);", "•" }
                                    a {
                                        href: "#section-datalayers",
                                        style: "color: #38bdf8; text-decoration: none;",
                                        "§4. Data Layers Architecture"
                                    }
                                }

                                div { id: "section-negotiation", style: "display: grid; gap: 0.8rem;",
                                    h2 { style: "font-size: 1.15rem; font-weight: 700; color: var(--text-primary); margin: 0;",
                                        {
                                            lang.label(
                                                "1. Diff Hash Negotiation (CAS)",
                                                "1. 差分ハッシュ・ネゴシエーション (CAS)",
                                                "1. Diferenca Haŝ-Negocado (CAS)",
                                            )
                                        }
                                    }
                                    NegotiationSequenceDiagram { language: lang }
                                }

                                div { id: "section-submit", style: "display: grid; gap: 0.8rem;",
                                    h2 { style: "font-size: 1.15rem; font-weight: 700; color: var(--text-primary); margin: 0;",
                                        {
                                            lang.label(
                                                "2. Event Submission (SubmitEvent)",
                                                "2. イベント送信 (SubmitEvent)",
                                                "2. Eventa Sendo (SubmitEvent)",
                                            )
                                        }
                                    }
                                    SubmitSequenceDiagram { language: lang }
                                }

                                div { id: "section-fetch", style: "display: grid; gap: 0.8rem;",
                                    h2 { style: "font-size: 1.15rem; font-weight: 700; color: var(--text-primary); margin: 0;",
                                        {
                                            lang.label(
                                                "3. Event Fetching (GetEvents)",
                                                "3. イベント取得 (GetEvents)",
                                                "3. Eventa Akiro (GetEvents)",
                                            )
                                        }
                                    }
                                    FetchSequenceDiagram { language: lang }
                                }

                                div { id: "section-datalayers", style: "display: grid; gap: 0.8rem;",
                                    h2 { style: "font-size: 1.15rem; font-weight: 700; color: var(--text-primary); margin: 0;",
                                        {
                                            lang.label(
                                                "4. Data Layers Architecture",
                                                "4. データレイヤー構成",
                                                "4. Datanivelaj Arkitekturo",
                                            )
                                        }
                                    }
                                    DataLayersExplanation { language: lang }
                                }
                            }
                        },
                    }
                }
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_arch_diagram_tab_from_str_param() {
        assert_eq!(
            ArchDiagramTab::from_str_param("negotiation"),
            ArchDiagramTab::Negotiation
        );
        assert_eq!(
            ArchDiagramTab::from_str_param("1"),
            ArchDiagramTab::Negotiation
        );
        assert_eq!(
            ArchDiagramTab::from_str_param("submit"),
            ArchDiagramTab::Submit
        );
        assert_eq!(ArchDiagramTab::from_str_param("2"), ArchDiagramTab::Submit);
        assert_eq!(
            ArchDiagramTab::from_str_param("fetch"),
            ArchDiagramTab::Fetch
        );
        assert_eq!(ArchDiagramTab::from_str_param("3"), ArchDiagramTab::Fetch);
        assert_eq!(
            ArchDiagramTab::from_str_param("datalayers"),
            ArchDiagramTab::DataLayers
        );
        assert_eq!(
            ArchDiagramTab::from_str_param("data-layers"),
            ArchDiagramTab::DataLayers
        );
        assert_eq!(
            ArchDiagramTab::from_str_param("4"),
            ArchDiagramTab::DataLayers
        );
        assert_eq!(ArchDiagramTab::from_str_param("all"), ArchDiagramTab::All);
        assert_eq!(
            ArchDiagramTab::from_str_param("unknown"),
            ArchDiagramTab::Negotiation
        );
    }
}
