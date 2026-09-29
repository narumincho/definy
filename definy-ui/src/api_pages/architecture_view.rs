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
}

#[component]
pub fn RpcArchitecturePageView(context: PageContext) -> Element {
    let mut current_tab = use_signal(|| ArchDiagramTab::Negotiation);
    let lang = context.language;
    let page_shell_style = crate::layout::page_shell_style("1.2rem");

    rsx! {
        div { class: "page-shell", style: "{page_shell_style}",
            div { style: "display: grid; gap: 1.5rem; max-width: 1140px; margin: 0 auto; width: 100%;",

                // 上部サブナビゲーション
                ApiSubNav { context: context.clone(), active: ApiNavActive::Architecture }

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

                    // タブ切り替えボタン
                    div { style: "display: flex; gap: 0.5rem; flex-wrap: wrap; margin-top: 0.4rem;",
                        button {
                            onclick: move |_| current_tab.set(ArchDiagramTab::Negotiation),
                            style: if current_tab() == ArchDiagramTab::Negotiation {
                                "padding: 0.5rem 1rem; border-radius: var(--radius-sm); font-size: 0.84rem; font-weight: 600; border: none; background: #0284c7; color: #fff; cursor: pointer;"
                            } else {
                                "padding: 0.5rem 1rem; border-radius: var(--radius-sm); font-size: 0.84rem; font-weight: 500; border: 1px solid var(--border); background: rgba(255, 255, 255, 0.04); color: var(--text-primary); cursor: pointer;"
                            },
                            {
                                lang.label(
                                    "1. Diff Hash Negotiation (CAS)",
                                    "1. 差分ハッシュ・ネゴシエーション (CAS)",
                                    "1. Diferenca Haŝ-Negocado (CAS)",
                                )
                            }
                        }
                        button {
                            onclick: move |_| current_tab.set(ArchDiagramTab::Submit),
                            style: if current_tab() == ArchDiagramTab::Submit {
                                "padding: 0.5rem 1rem; border-radius: var(--radius-sm); font-size: 0.84rem; font-weight: 600; border: none; background: #0284c7; color: #fff; cursor: pointer;"
                            } else {
                                "padding: 0.5rem 1rem; border-radius: var(--radius-sm); font-size: 0.84rem; font-weight: 500; border: 1px solid var(--border); background: rgba(255, 255, 255, 0.04); color: var(--text-primary); cursor: pointer;"
                            },
                            {
                                lang.label(
                                    "2. Event Submission (SubmitEvent)",
                                    "2. イベント送信 (SubmitEvent)",
                                    "2. Eventa Sendo (SubmitEvent)",
                                )
                            }
                        }
                        button {
                            onclick: move |_| current_tab.set(ArchDiagramTab::Fetch),
                            style: if current_tab() == ArchDiagramTab::Fetch {
                                "padding: 0.5rem 1rem; border-radius: var(--radius-sm); font-size: 0.84rem; font-weight: 600; border: none; background: #0284c7; color: #fff; cursor: pointer;"
                            } else {
                                "padding: 0.5rem 1rem; border-radius: var(--radius-sm); font-size: 0.84rem; font-weight: 500; border: 1px solid var(--border); background: rgba(255, 255, 255, 0.04); color: var(--text-primary); cursor: pointer;"
                            },
                            {
                                lang.label(
                                    "3. Event Fetching (GetEvents)",
                                    "3. イベント取得 (GetEvents)",
                                    "3. Eventa Akiro (GetEvents)",
                                )
                            }
                        }
                        button {
                            onclick: move |_| current_tab.set(ArchDiagramTab::DataLayers),
                            style: if current_tab() == ArchDiagramTab::DataLayers {
                                "padding: 0.5rem 1rem; border-radius: var(--radius-sm); font-size: 0.84rem; font-weight: 600; border: none; background: #0284c7; color: #fff; cursor: pointer;"
                            } else {
                                "padding: 0.5rem 1rem; border-radius: var(--radius-sm); font-size: 0.84rem; font-weight: 500; border: 1px solid var(--border); background: rgba(255, 255, 255, 0.04); color: var(--text-primary); cursor: pointer;"
                            },
                            {
                                lang.label(
                                    "4. Data Layers Architecture",
                                    "4. データレイヤー構成",
                                    "4. Datanivelaj Arkitekturo",
                                )
                            }
                        }
                    }
                }

                // シーケンス図表示コンポーネント (幅いっぱいのコンテナ)
                div { style: "width: 100%;",
                    match current_tab() {
                        ArchDiagramTab::Negotiation => rsx! { NegotiationSequenceDiagram { language: lang } },
                        ArchDiagramTab::Submit => rsx! { SubmitSequenceDiagram { language: lang } },
                        ArchDiagramTab::Fetch => rsx! { FetchSequenceDiagram { language: lang } },
                        ArchDiagramTab::DataLayers => rsx! { DataLayersExplanation { language: lang } },
                    }
                }
            }
        }
    }
}
