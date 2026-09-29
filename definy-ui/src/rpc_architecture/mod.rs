use dioxus::prelude::*;

use crate::page_context::PageContext;

pub mod data_layers;
pub mod fetch_sequence;
pub mod negotiation_sequence;
pub mod overview;
pub mod submit_sequence;

pub use data_layers::DataLayersExplanation;
pub use fetch_sequence::FetchSequenceDiagram;
pub use negotiation_sequence::NegotiationSequenceDiagram;
pub use overview::ArchitectureOverview;
pub use submit_sequence::SubmitSequenceDiagram;

#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub enum ArchitectureTab {
    Overview,
    NegotiationSequence,
    SubmitSequence,
    FetchSequence,
    DataLayers,
}

#[component]
pub fn RpcArchitectureSection(context: PageContext) -> Element {
    let mut selected_tab = use_signal(|| ArchitectureTab::Overview);
    let lang = context.language;

    let tab_btn = |tab: ArchitectureTab, label: &'static str| {
        let is_active = selected_tab() == tab;
        rsx! {
            button {
                style: format!(
                    "padding: 0.45rem 0.9rem; border-radius: var(--radius-sm); border: 1px solid {}; background: {}; color: {}; font-size: 0.84rem; font-weight: {}; cursor: pointer; transition: all 0.15s ease;",
                    if is_active { "var(--primary)" } else { "var(--border)" },
                    if is_active { "rgba(59, 130, 246, 0.15)" } else { "transparent" },
                    if is_active { "var(--primary)" } else { "var(--text-secondary)" },
                    if is_active { "600" } else { "400" },
                ),
                onclick: move |_| selected_tab.set(tab),
                "{label}"
            }
        }
    };

    rsx! {
        div {
            class: "event-detail-card",
            style: "background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-md); padding: 1.4rem; display: grid; gap: 1.2rem; margin-bottom: 1.5rem;",

            // ヘッダー部
            div { style: "display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 0.75rem;",
                div { style: "display: grid; gap: 0.3rem;",
                    div { style: "display: flex; align-items: center; gap: 0.5rem;",
                        span { style: "font-size: 1.3rem;", "📐" }
                        h2 { style: "font-size: 1.15rem; font-weight: 700; margin: 0; color: var(--text-primary);",
                            {
                                lang.label(
                                    "Architecture & Communication Mechanism",
                                    "API アーキテクチャと通信の仕組み",
                                    "Arkitekturo kaj Komunika Mekanismo",
                                )
                            }
                        }
                    }
                    p { style: "font-size: 0.85rem; color: var(--text-secondary); margin: 0; line-height: 1.45;",
                        {
                            lang.label(
                                "How definy unifies Connect-RPC transport, RFC 8949 Deterministic CBOR cryptographic storage, and Git-style Diff Hash Negotiation.",
                                "definy における Connect-RPC 通信層、RFC 8949 Deterministic CBOR 暗号検証層、および Git 方式の差分ハッシュ交渉・CAS 機構の詳細。",
                                "Kiel definy kunigas Connect-RPC transporton, RFC 8949 Determinan CBOR stokadon, kaj diferencan haŝ-negocadon.",
                            )
                        }
                    }
                }

                // タブナビゲーション
                div { style: "display: flex; gap: 0.4rem; flex-wrap: wrap;",
                    {
                        tab_btn(
                            ArchitectureTab::Overview,
                            lang.label("Overview", "概要", "Superrigardo"),
                        )
                    }
                    {
                        tab_btn(
                            ArchitectureTab::NegotiationSequence,
                            lang
                                .label(
                                    "Diff Hash Negotiation",
                                    "差分ハッシュ交渉",
                                    "Diferenca Haŝ-Negocado",
                                ),
                        )
                    }
                    {
                        tab_btn(
                            ArchitectureTab::SubmitSequence,
                            lang
                                .label(
                                    "Submit Sequence",
                                    "書き込みシーケンス",
                                    "Sendada Sekvenco",
                                ),
                        )
                    }
                    {
                        tab_btn(
                            ArchitectureTab::FetchSequence,
                            lang
                                .label(
                                    "Fetch Sequence",
                                    "読み込みシーケンス",
                                    "Legada Sekvenco",
                                ),
                        )
                    }
                    {
                        tab_btn(
                            ArchitectureTab::DataLayers,
                            lang
                                .label(
                                    "Envelope & Payload",
                                    "データの二重構造",
                                    "Koverto kaj Utilaĵo",
                                ),
                        )
                    }
                }
            }

            // タブコンテンツ
            div { style: "display: grid; gap: 1rem;",
                match selected_tab() {
                    ArchitectureTab::Overview => rsx! {
                        ArchitectureOverview { language: lang }
                    },
                    ArchitectureTab::NegotiationSequence => rsx! {
                        NegotiationSequenceDiagram { language: lang }
                    },
                    ArchitectureTab::SubmitSequence => rsx! {
                        SubmitSequenceDiagram { language: lang }
                    },
                    ArchitectureTab::FetchSequence => rsx! {
                        FetchSequenceDiagram { language: lang }
                    },
                    ArchitectureTab::DataLayers => rsx! {
                        DataLayersExplanation { language: lang }
                    },
                }
            }
        }
    }
}
