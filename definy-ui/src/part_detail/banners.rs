use definy_core::deploy_detector::DetectedDeploy;
use definy_core::preview_detector::DetectedPreview;
use dioxus::prelude::*;

use crate::page_context::PageContext;
use crate::preview_apps::{build_preview_path_url, build_preview_subdomain_url};

#[component]
pub fn PreviewBanner(context: PageContext, preview: DetectedPreview) -> Element {
    let sub_url = build_preview_subdomain_url(&preview.code);
    let path_url = build_preview_path_url(&preview.code);

    rsx! {
        div {
            class: "preview-banner-card",
            style: "background: linear-gradient(135deg, rgba(56, 189, 248, 0.12), rgba(99, 102, 241, 0.07)); border: 1px solid rgba(56, 189, 248, 0.35); border-radius: var(--radius-md); padding: 1.15rem 1.4rem; display: flex; align-items: center; justify-content: space-between; gap: 1rem; flex-wrap: wrap; box-shadow: 0 4px 16px rgba(56, 189, 248, 0.08);",
            div { style: "display: flex; align-items: center; gap: 0.85rem;",
                span { style: "font-size: 1.7rem;", "🌐" }
                div {
                    div { style: "display: flex; align-items: center; gap: 0.6rem; flex-wrap: wrap;",
                        span { style: "font-weight: 700; font-size: 1.05rem; color: var(--text-primary);",
                            "{context.language.label(\"Web App Preview\", \"Web アプリ プレビュー\", \"Reteja Apo-Antaŭrigardo\")}"
                        }
                        span { style: "background: rgba(56, 189, 248, 0.2); color: var(--primary); font-size: 0.8rem; font-family: ui-monospace, monospace; font-weight: 600; padding: 0.15rem 0.55rem; border-radius: 999px; border: 1px solid rgba(56, 189, 248, 0.35);",
                            "code: \"{preview.code}\""
                        }
                    }
                    div { style: "font-size: 0.84rem; color: var(--text-secondary); margin-top: 0.25rem; line-height: 1.45;",
                        {
                            context
                                .language
                                .label(
                                    "This part defines a web app using definy:preview. Click the preview button to test it on the live server.",
                                    "このパーツは definy:preview を呼び出して Web アプリを定義しています。プレビューボタンから即座に動作確認できます。",
                                    "Ĉi tiu parto difinas retejon per definy:preview.",
                                )
                        }
                    }
                }
            }
            div { style: "display: flex; align-items: center; gap: 0.6rem; flex-wrap: wrap;",
                a {
                    href: "{sub_url}",
                    target: "_blank",
                    rel: "noopener noreferrer",
                    class: "btn-primary",
                    style: "display: inline-flex; align-items: center; gap: 0.45rem; text-decoration: none; padding: 0.5rem 1.1rem; font-size: 0.88rem; font-weight: 600; border-radius: var(--radius-sm); box-shadow: 0 2px 10px rgba(56, 189, 248, 0.3);",
                    span {
                        {
                            context
                                .language
                                .label(
                                    "🚀 Launch Preview",
                                    "🚀 プレビューを開く",
                                    "🚀 Lanĉi Antaŭrigardon",
                                )
                        }
                    }
                    span { style: "font-size: 0.75rem; opacity: 0.85;", "↗" }
                }
                a {
                    href: "{path_url}",
                    target: "_blank",
                    rel: "noopener noreferrer",
                    class: "btn-secondary",
                    style: "display: inline-flex; align-items: center; gap: 0.4rem; text-decoration: none; padding: 0.5rem 0.85rem; font-size: 0.82rem; border-radius: var(--radius-sm);",
                    span { "📁 {path_url}" }
                    span { style: "font-size: 0.72rem; opacity: 0.8;", "↗" }
                }
            }
        }
    }
}

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
            style: "background: linear-gradient(135deg, rgba(249, 115, 22, 0.12), rgba(234, 88, 12, 0.06)); border: 1px solid rgba(249, 115, 22, 0.35); border-radius: var(--radius-md); padding: 1.15rem 1.4rem; display: flex; align-items: center; justify-content: space-between; gap: 1rem; flex-wrap: wrap; box-shadow: 0 4px 16px rgba(249, 115, 22, 0.08);",
            div { style: "display: flex; align-items: center; gap: 0.85rem;",
                span { style: "font-size: 1.7rem;", "⚡" }
                div {
                    div { style: "display: flex; align-items: center; gap: 0.6rem; flex-wrap: wrap;",
                        span { style: "font-weight: 700; font-size: 1.05rem; color: #fb923c;",
                            "{context.language.label(\"Cloudflare Workers Deployment\", \"Cloudflare Workers デプロイ\", \"Cloudflare Workers Deplojo\")}"
                        }
                        span { style: "background: rgba(249, 115, 22, 0.2); color: #fb923c; font-size: 0.8rem; font-family: ui-monospace, monospace; font-weight: 600; padding: 0.15rem 0.55rem; border-radius: 999px; border: 1px solid rgba(249, 115, 22, 0.35);",
                            "Worker: \"{worker_name}\""
                        }
                        span {
                            class: "preview-badge",
                            style: "background: rgba(249, 115, 22, 0.15); border: 1px solid rgba(249, 115, 22, 0.4); color: #fb923c; font-size: 0.75rem; font-weight: 600; padding: 0.15rem 0.5rem; border-radius: 999px;",
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
                    style: "display: inline-flex; align-items: center; gap: 0.45rem; padding: 0.5rem 1.1rem; font-size: 0.88rem; font-weight: 600; border-radius: var(--radius-sm); box-shadow: 0 2px 10px rgba(249, 115, 22, 0.3); background: #f97316; border-color: #ea580c;",
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
