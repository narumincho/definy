mod ci_cd;
mod common;
mod html_request;
mod self_deploy;

use dioxus::prelude::*;

pub use ci_cd::DeployPipelineDiagram;
pub use html_request::HtmlRequestSequenceDiagram;
pub use self_deploy::SelfDeploySequenceDiagram;

use crate::language::Language;

#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub enum DeploymentDiagramTab {
    HtmlRequest,
    DeployPipeline,
    SelfDeploy,
}

#[component]
pub fn DeploymentsFlowDiagram(language: Language) -> Element {
    let mut selected_tab = use_signal(|| DeploymentDiagramTab::HtmlRequest);

    rsx! {
        div {
            class: "event-detail-card",
            style: "background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: 1.6rem; display: grid; gap: 1.3rem;",

            // ヘッダー部
            div { style: "display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 0.8rem;",
                div { style: "display: grid; gap: 0.35rem;",
                    div { style: "display: flex; align-items: center; gap: 0.6rem;",
                        span { style: "font-size: 1.4rem;", "🌐" }
                        h2 { style: "font-size: 1.25rem; font-weight: 700; margin: 0; color: var(--text-primary);",
                            {
                                language
                                    .label(
                                        "fly.io Deployment & Request Lifecycle Diagrams",
                                        "fly.io デプロイ & リクエスト ライフサイクルフロー図",
                                        "Vivociklaj Fludiagramoj de fly.io Deplojo kaj Petoj",
                                    )
                            }
                        }
                    }
                    p { style: "font-size: 0.86rem; color: var(--text-secondary); margin: 0; line-height: 1.5; max-width: 720px;",
                        {
                            language
                                .label(
                                    "Visual sequence diagrams: Client HTTP delivery, GitHub Actions CI/CD rollout, and autonomous Fly.io-to-Fly.io self-deployment (operational bootstrapping).",
                                    "クライアントの HTML 配信シーケンス、GitHub Actions による CI/CD ロールアウト、そして fly.io 自身が次世代インスタンスをデプロイする運用ブートストラップの完全なフロー図。",
                                    "Vida sekvenco de HTTP-liverado, CI/CD dukto, kaj memstara fly.io-al-fly.io memdeplojo.",
                                )
                        }
                    }
                }

                // タブ切り替えボタン
                div { style: "display: flex; gap: 0.5rem; flex-wrap: wrap;",
                    button {
                        r#type: "button",
                        style: if selected_tab() == DeploymentDiagramTab::HtmlRequest { "padding: 0.45rem 0.95rem; border-radius: var(--radius-sm); border: 1px solid #c084fc; background: rgba(192, 132, 252, 0.15); color: #e9d5ff; font-size: 0.84rem; font-weight: 600; cursor: pointer; transition: all 0.15s ease;" } else { "padding: 0.45rem 0.95rem; border-radius: var(--radius-sm); border: 1px solid var(--border); background: transparent; color: var(--text-secondary); font-size: 0.84rem; font-weight: 400; cursor: pointer; transition: all 0.15s ease;" },
                        onclick: move |_| selected_tab.set(DeploymentDiagramTab::HtmlRequest),
                        {
                            language
                                .label(
                                    "1. HTML Request & Serving Flow",
                                    "1. HTML リクエスト & 配信フロー",
                                    "1. HTML-Peto & Servado",
                                )
                        }
                    }
                    button {
                        r#type: "button",
                        style: if selected_tab() == DeploymentDiagramTab::DeployPipeline { "padding: 0.45rem 0.95rem; border-radius: var(--radius-sm); border: 1px solid #c084fc; background: rgba(192, 132, 252, 0.15); color: #e9d5ff; font-size: 0.84rem; font-weight: 600; cursor: pointer; transition: all 0.15s ease;" } else { "padding: 0.45rem 0.95rem; border-radius: var(--radius-sm); border: 1px solid var(--border); background: transparent; color: var(--text-secondary); font-size: 0.84rem; font-weight: 400; cursor: pointer; transition: all 0.15s ease;" },
                        onclick: move |_| selected_tab.set(DeploymentDiagramTab::DeployPipeline),
                        {
                            language
                                .label(
                                    "2. CI/CD Deployment Pipeline",
                                    "2. CI/CD デプロイパイプライン",
                                    "2. CI/CD Deploja Dukto",
                                )
                        }
                    }
                    button {
                        r#type: "button",
                        style: if selected_tab() == DeploymentDiagramTab::SelfDeploy { "padding: 0.45rem 0.95rem; border-radius: var(--radius-sm); border: 1px solid #34d399; background: rgba(52, 211, 153, 0.15); color: #a7f3d0; font-size: 0.84rem; font-weight: 600; cursor: pointer; transition: all 0.15s ease;" } else { "padding: 0.45rem 0.95rem; border-radius: var(--radius-sm); border: 1px solid var(--border); background: transparent; color: var(--text-secondary); font-size: 0.84rem; font-weight: 400; cursor: pointer; transition: all 0.15s ease;" },
                        onclick: move |_| selected_tab.set(DeploymentDiagramTab::SelfDeploy),
                        {
                            language
                                .label(
                                    "3. Fly.io Self-Deploy (Bootstrapping)",
                                    "3. Fly.io 自己デプロイ (運用ブートストラップ)",
                                    "3. Fly.io Memdeplojo (Memgastigo)",
                                )
                        }
                    }
                }
            }

            // タブ別コンテンツ
            match selected_tab() {
                DeploymentDiagramTab::HtmlRequest => rsx! {
                    HtmlRequestSequenceDiagram { language }
                },
                DeploymentDiagramTab::DeployPipeline => rsx! {
                    DeployPipelineDiagram { language }
                },
                DeploymentDiagramTab::SelfDeploy => rsx! {
                    SelfDeploySequenceDiagram { language }
                },
            }
        }
    }
}
