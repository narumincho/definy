use definy_core::deploy_detector::DetectedDeploy;
use dioxus::prelude::*;

use crate::page_context::PageContext;

#[component]
pub fn DeployBanner(
    context: PageContext,
    deploy: DetectedDeploy,
    is_deploying: bool,
    on_deploy: EventHandler<MouseEvent>,
) -> Element {
    let worker_name = deploy.cloudflare_worker_name.clone();

    rsx! {
        div {
            class: "preview-banner-card",
            style: "background: linear-gradient(135deg, var(--orange-bg-strong), var(--orange-bg)); border: 1px solid var(--orange-border); border-radius: var(--radius-md); padding: 1.15rem 1.4rem; display: flex; align-items: center; justify-content: space-between; gap: 1rem; flex-wrap: wrap; box-shadow: 0 4px 16px var(--orange-bg);",
            div { style: "display: flex; align-items: center; gap: 0.85rem;",
                span { style: "font-size: 1.7rem;", "⚡" }
                div {
                    div { style: "display: flex; align-items: center; gap: 0.6rem; flex-wrap: wrap;",
                        span { style: "font-weight: 700; font-size: 1.05rem; color: var(--orange);",
                            "{context.language.label(\"Cloudflare Workers Deployment\", \"Cloudflare Workers デプロイ\", \"Cloudflare Workers Deplojo\")}"
                        }
                        span { style: "background: var(--orange-bg-strong); color: var(--orange); font-size: 0.8rem; font-family: ui-monospace, monospace; font-weight: 600; padding: 0.15rem 0.55rem; border-radius: 999px; border: 1px solid var(--orange-border);",
                            "Worker: \"{worker_name}\""
                        }
                        span {
                            class: "preview-badge",
                            style: "background: var(--orange-bg-strong); border: 1px solid var(--orange-border); color: var(--orange); font-size: 0.75rem; font-weight: 600; padding: 0.15rem 0.5rem; border-radius: 999px;",
                            {
                                context
                                    .language
                                    .label(
                                        "Server Execution Only",
                                        "サーバー実行限定",
                                        "Nura Servila Rulado",
                                    )
                            }
                        }
                    }
                    div { style: "font-size: 0.84rem; color: var(--text-secondary); margin-top: 0.25rem; line-height: 1.45;",
                        {
                            context
                                .language
                                .label(
                                    "This part defines a Cloudflare Workers deployment via definy:deploy. Click deploy to trigger backend server deployment to global edge.",
                                    "このパーツは definy:deploy を定義しています。「デプロイを実行」または「評価」をクリックすると、サーバー側で Cloudflare Workers API v4 が呼び出され、グローバルエッジへ配備されます。",
                                    "Ĉi tiu parto difinas Cloudflare Workers deplojon per definy:deploy.",
                                )
                        }
                    }
                }
            }
            div { style: "display: flex; align-items: center; gap: 0.6rem; flex-wrap: wrap;",
                button {
                    r#type: "button",
                    class: "btn-primary",
                    disabled: is_deploying,
                    style: "display: inline-flex; align-items: center; gap: 0.45rem; padding: 0.5rem 1.1rem; font-size: 0.88rem; font-weight: 600; border-radius: var(--radius-sm); box-shadow: 0 2px 10px var(--orange-border); background: var(--orange); border-color: var(--orange);",
                    onclick: move |evt| on_deploy.call(evt),
                    span {
                        if is_deploying {
                            "{context.language.label(\"🚀 Deploying to Edge...\", \"🚀 エッジへデプロイ中...\", \"🚀 Deplojante...\")}"
                        } else {
                            "{context.language.label(\"🚀 Execute Deployment\", \"🚀 デプロイを実行\", \"🚀 Plenumi Deplojon\")}"
                        }
                    }
                }
            }
        }
    }
}
