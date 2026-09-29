use dioxus::prelude::*;

use super::method_nav::{ApiNavActive, ApiSubNav};
use super::method_schema::get_method_schema;
use crate::Location;
use crate::app_state::ApiMethod;
use crate::page_context::PageContext;

#[component]
pub fn ApiOverviewPageView(context: PageContext) -> Element {
    let lang = context.language;
    let page_shell_style = crate::layout::page_shell_style("1.2rem");

    rsx! {
        div { class: "page-shell", style: "{page_shell_style}",
            div { style: "display: grid; gap: 1.8rem; max-width: 1040px; margin: 0 auto; width: 100%;",

                // 上部サブナビゲーション
                ApiSubNav { context: context.clone(), active: ApiNavActive::Overview }

                // ヒーローカード
                div {
                    class: "event-detail-card",
                    style: "background: linear-gradient(135deg, rgba(30, 41, 59, 0.6) 0%, rgba(15, 23, 42, 0.85) 100%); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: 2rem; display: grid; gap: 1rem; position: relative; overflow: hidden;",
                    div { style: "display: flex; align-items: center; gap: 0.6rem;",
                        span { style: "padding: 0.25rem 0.65rem; background: rgba(56, 189, 248, 0.15); color: #38bdf8; font-size: 0.78rem; font-weight: 700; border-radius: 9999px; border: 1px solid rgba(56, 189, 248, 0.3);",
                            "Connect-RPC Protocol"
                        }
                        span { style: "padding: 0.25rem 0.65rem; background: rgba(16, 185, 129, 0.15); color: #34d399; font-size: 0.78rem; font-weight: 700; border-radius: 9999px; border: 1px solid rgba(16, 185, 129, 0.3);",
                            "RFC 8949 CBOR"
                        }
                    }

                    h1 { style: "font-size: 1.8rem; font-weight: 800; margin: 0; color: var(--text-primary);",
                        {
                            lang.label(
                                "Connect-RPC & Deterministic CBOR API",
                                "Connect-RPC & 決定論的 CBOR API 仕様",
                                "Connect-RPC & Determina CBOR API",
                            )
                        }
                    }

                    p { style: "font-size: 0.95rem; color: var(--text-secondary); margin: 0; line-height: 1.6; max-width: 800px;",
                        {
                            lang.label(
                                "definy provides a unified Connect-RPC service (definy.v1.EventService) over HTTP POST. Each method is documented on its dedicated page with Protobuf schemas, request/response structures, diff negotiation roles, and interactive live testers.",
                                "definy は HTTP POST ベースの統一された Connect-RPC サービス (definy.v1.EventService) を提供します。各メソッドは専用のページで独立して提供され、Protobuf スキーマ、リクエスト/レスポンス構造、差分ハッシュ交渉における役割、および対話的実行テスターを備えています。",
                                "definy provizas Connect-RPC servon per HTTP POST. Ĉiu metodo havas dediĉitan paĝon kun strukturoj kaj testilo.",
                            )
                        }
                    }

                    div { style: "display: flex; gap: 0.8rem; flex-wrap: wrap; margin-top: 0.4rem;",
                        a {
                            href: context.href_with_lang(Location::ApiArchitecture),
                            style: "padding: 0.6rem 1.2rem; background: #8b5cf6; color: #fff; text-decoration: none; border-radius: var(--radius-sm); font-weight: 600; font-size: 0.88rem; display: flex; align-items: center; gap: 0.4rem;",
                            span { "🗺️" }
                            span {
                                {
                                    lang.label(
                                        "View Sequence Diagrams →",
                                        "シーケンス図・アーキテクチャを見る →",
                                        "Vidi Sekvencajn Diagramojn →",
                                    )
                                }
                            }
                        }
                    }
                }

                // メソッド一覧（専用ページへのカードグリッド）
                div { style: "display: grid; gap: 1rem;",
                    h2 { style: "font-size: 1.3rem; font-weight: 700; margin: 0; color: var(--text-primary); display: flex; align-items: center; gap: 0.5rem;",
                        span { "⚡" }
                        span {
                            {
                                lang.label(
                                    "Dedicated RPC Method Pages",
                                    "Connect-RPC メソッド専用ページ一覧",
                                    "Dediĉitaj RPC Metod-Paĝoj",
                                )
                            }
                        }
                    }

                    div { style: "display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 1.2rem;",
                        for method in ApiMethod::all() {
                            {
                                let schema = get_method_schema(*method);
                                let target_loc = Location::ApiMethod(*method, None);
                                let href = context.href_with_lang(target_loc);
                                let name = method.name();

                                rsx! {
                                    a {
                                        key: "{name}",
                                        href: "{href}",
                                        class: "event-detail-card",
                                        style: "text-decoration: none; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-md); padding: 1.3rem; display: grid; gap: 0.75rem; transition: transform 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease; color: inherit;",
                                        div { style: "display: flex; justify-content: space-between; align-items: center;",
                                            span { style: "padding: 0.2rem 0.5rem; background: #0284c7; color: #fff; font-size: 0.72rem; font-weight: 700; border-radius: 4px;",
                                                "POST"
                                            }
                                            span { style: "font-size: 0.76rem; color: #38bdf8; font-family: ui-monospace, monospace;",
                                                "{schema.request_name}"
                                            }
                                        }
                                        div { style: "font-size: 1.15rem; font-weight: 800; color: var(--text-primary);",
                                            "{name}"
                                        }
                                        p { style: "font-size: 0.84rem; color: var(--text-secondary); margin: 0; line-height: 1.5;",
                                            "{schema.description(lang)}"
                                        }
                                        div { style: "display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--border); padding-top: 0.6rem; font-size: 0.8rem; font-weight: 600; color: #60a5fa;",
                                            span {
                                                {lang.label("Open Dedicated Page →", "専用ページで構造を見る →", "Vidi Detalojn →")}
                                            }
                                            span { "↗" }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }

                // 差分ハッシュ・ネゴシエーションの概要解説カード
                div {
                    class: "event-detail-card",
                    style: "background: rgba(15, 23, 42, 0.6); border: 1px solid var(--border); border-left: 4px solid #38bdf8; border-radius: var(--radius-md); padding: 1.4rem; display: grid; gap: 0.8rem;",
                    h3 { style: "font-size: 1.1rem; font-weight: 700; margin: 0; color: var(--text-primary); display: flex; align-items: center; gap: 0.5rem;",
                        span { "🌿" }
                        span {
                            {
                                lang.label(
                                    "Git Tree / Blob Model with CAS (Content-Addressed Storage)",
                                    "Git Tree / Blob 分離モデルとコンテンツアドレスストレージ",
                                    "Git-Stila CAS Modelo",
                                )
                            }
                        }
                    }
                    p { style: "font-size: 0.88rem; color: var(--text-secondary); margin: 0; line-height: 1.6;",
                        {
                            lang.label(
                                "definy separates the commit event (Tree) from expression AST binaries (Blobs). When saving changes, the client optimistically calls SubmitEvent with only metadata and content hashes. The server identifies missing expressions and responds with \"missing_content\". The client then calls UploadContent for only the changed expressions before finalizing the commit.",
                                "definy では、コミットイベント（Tree: メタデータとハッシュの参照）と、各パーツの式構文木（Blob: 実体バイナリ）を明確に分離しています。変更送信時はまず SubmitEvent で楽観送信し、サーバーが持っていない未登録の式がある場合のみ missing_content で差分を要求。クライアントが UploadContent で不足分だけをアップロードして確定します。これにより、変更のないパーツの転送量は完全に 0 バイトとなります。",
                                "definy apartigas komiton (Tree) kaj esprimojn (Blob). Nur modifitaj esprimoj estas alŝutataj.",
                            )
                        }
                    }
                }
            }
        }
    }
}
