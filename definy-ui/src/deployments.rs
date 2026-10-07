use dioxus::prelude::*;

use crate::Location;
use crate::page_context::PageContext;

#[component]
pub fn DeploymentsView(context: PageContext) -> Element {
    let lang = context.language;
    let page_shell_style = crate::layout::page_shell_style("1.2rem");

    rsx! {
        div { class: "page-shell", style: "{page_shell_style}",
            div { style: "display: grid; gap: 2rem; max-width: 960px; margin: 0 auto;",

                // ヒーローセクション
                div {
                    class: "event-detail-card",
                    style: "background: linear-gradient(135deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.9) 100%); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: 2.2rem 1.8rem; display: flex; flex-direction: column; align-items: center; text-align: center; gap: 1.1rem; position: relative; overflow: hidden;",

                    div { style: "position: absolute; top: -40px; right: -40px; width: 180px; height: 180px; background: radial-gradient(circle, rgba(168, 85, 247, 0.25) 0%, transparent 70%); border-radius: 50%; pointer-events: none;" }
                    div { style: "position: absolute; bottom: -40px; left: -40px; width: 180px; height: 180px; background: radial-gradient(circle, rgba(59, 130, 246, 0.2) 0%, transparent 70%); border-radius: 50%; pointer-events: none;" }

                    div { style: "display: flex; align-items: center; justify-content: center; width: 64px; height: 64px; border-radius: 18px; background: rgba(168, 85, 247, 0.15); border: 1px solid rgba(168, 85, 247, 0.35); box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3); font-size: 2rem;",
                        "🚀"
                    }

                    h1 { style: "font-size: 2rem; font-weight: 800; margin: 0; background: linear-gradient(135deg, #ffffff 30%, #c084fc 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent;",
                        {
                            lang.label(
                                "Operational Bootstrapping (fly.io)",
                                "運用ブートストラップ (fly.io)",
                                "Operacia Memgastigado (fly.io)",
                            )
                        }
                    }

                    p { style: "font-size: 1.05rem; font-weight: 600; color: #c084fc; margin: 0; max-width: 680px; line-height: 1.45;",
                        {
                            lang.label(
                                "Self-hosting lifecycle: Deploying and serving next-generation definy instances directly from the platform.",
                                "自己複製と世代交代: definy サーバー自身が次世代インスタンスを fly.io に展開し、配信・案内する運用基盤。",
                                "Memgastiga vivociklo: Deploji kaj servi sekvajn definy-aplikaĵojn rekte el la platformo.",
                            )
                        }
                    }

                    p { style: "font-size: 0.9rem; color: var(--text-secondary); margin: 0; max-width: 720px; line-height: 1.6;",
                        {
                            lang.label(
                                "Without relying on local developer terminals or manual CLI commands, definy initiates machine deployments via fly.io Machines REST API and provides deterministic, version-pinned container URLs.",
                                "開発者のローカル PC（git push や flyctl）に依存せず、definy 自身が fly.io Machines REST API を通じて新しいコンテナをプロビジョニングし、コミットや状態に応じた不変 URL を配信します。",
                                "Sen dependi de lokaj komandlinioj, definy mem iniciatas maŝinajn deplojojn per fly.io Machines REST API.",
                            )
                        }
                    }

                    div { style: "display: flex; gap: 0.75rem; flex-wrap: wrap; justify-content: center; margin-top: 0.4rem;",
                        a {
                            href: "https://definy.fly.dev",
                            target: "_blank",
                            rel: "noopener noreferrer",
                            style: "padding: 0.6rem 1.4rem; background: var(--primary); color: #fff; text-decoration: none; border-radius: var(--radius-sm); font-weight: 600; font-size: 0.9rem; transition: opacity 0.15s ease;",
                            {
                                lang.label(
                                    "Open Live Instance (definy.fly.dev) ↗",
                                    "稼働中インスタンスを開く (definy.fly.dev) ↗",
                                    "Malfermi Rulan Aplikaĵon ↗",
                                )
                            }
                        }
                        a {
                            href: context.href_with_lang(Location::ApiOverview),
                            style: "padding: 0.6rem 1.4rem; background: rgba(255, 255, 255, 0.08); color: var(--text-primary); text-decoration: none; border: 1px solid var(--border); border-radius: var(--radius-sm); font-weight: 600; font-size: 0.9rem; transition: background 0.15s ease;",
                            {
                                lang.label(
                                    "DeployService API Schema →",
                                    "DeployService API 仕様 →",
                                    "DeployService API Specifo →",
                                )
                            }
                        }
                    }
                }

                // 3つのブートストラップ階層
                div { style: "display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1rem;",
                    BootstrappingLayerCard {
                        context: context.clone(),
                        step_num: "Layer 1",
                        status_badge: lang.label("Active / Verified", "稼働中 / 検証済", "Aktiva / Konfirmita"),
                        status_color: "#4ade80",
                        title: lang.label(
                            "Operational Bootstrapping",
                            "運用・デプロイ層の自己完結",
                            "Operacia Memgastigo",
                        ),
                        description: lang.label(
                            "definy-server triggers fly.io Machines API calls to start child instances, saving deployment history to SurrealDB and routing users to the new version.",
                            "definy サーバーが fly.io Machines API を直接叩いて子インスタンスを起動。SurrealDB に履歴を記録し、新世代の URL へ利用者を誘導。",
                            "definy-servilo vokas fly.io Machines API por lanĉi infanajn maŝinojn.",
                        ),
                    }
                    BootstrappingLayerCard {
                        context: context.clone(),
                        step_num: "Layer 2",
                        status_badge: lang.label(
                            "Self-Hosted Compiler Ready",
                            "自己コンパイラ実証済",
                            "Kompililo Preta",
                        ),
                        status_color: "#60a5fa",
                        title: lang.label(
                            "Compiler Bootstrapping",
                            "ビルド・コンパイル層の自己完結",
                            "Kompilila Memgastigo",
                        ),
                        description: lang.label(
                            "Compilation outputs are produced not by external tools, but by self-hosted core.compile-to-wasm WebAssembly generator.",
                            "外部の Rust ツールチェーンではなく、自己記述された core.compile-to-wasm によってバイナリ・アセットを直接出力。",
                            "Generas Wasm rekte per memgastiga core.compile-to-wasm.",
                        ),
                    }
                    BootstrappingLayerCard {
                        context: context.clone(),
                        step_num: "Layer 3",
                        status_badge: lang.label("Specification Designed", "設計仕様策定済", "Specifo Desegnita"),
                        status_color: "#c084fc",
                        title: lang.label(
                            "Capability I/O Runtime",
                            "サービスロジック・I/O層の自己記述",
                            "Kapabla I/O Rultempo",
                        ),
                        description: lang.label(
                            "HTTP handlers and cloud deployment requests expressed as pure definy parts using WASI 0.3 Capability Dependency Injection.",
                            "WASI 0.3 スタイルの能力注入 (Capability Injection) により、HTTP 配信やデプロイ呼び出し自体を definy の式として記述。",
                            "Tuta serva logiko priskribita per definy-partoj kaj WASI 0.3 kapabloj.",
                        ),
                    }
                }

                // フロー図セクション (HTML リクエスト & デプロイ ライフサイクル)
                crate::deployments_flow::DeploymentsFlowDiagram { language: lang }

                // Connect-RPC デプロイ実行ガイド
                div {
                    class: "event-detail-card",
                    style: "background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: 1.5rem; display: flex; flex-direction: column; gap: 1rem;",

                    h2 { style: "font-size: 1.25rem; font-weight: 700; margin: 0; color: var(--text-primary); display: flex; align-items: center; gap: 0.5rem;",
                        span { "⚡" }
                        {
                            lang.label(
                                "Trigger Deployment via Connect-RPC",
                                "Connect-RPC 経由でのデプロイ実行",
                                "Deploji per Connect-RPC",
                            )
                        }
                    }

                    p { style: "font-size: 0.88rem; color: var(--text-secondary); margin: 0; line-height: 1.5;",
                        {
                            lang.label(
                                "You can trigger instance creation directly from any Connect-RPC client or cURL command:",
                                "Connect-RPC クライアントまたは cURL コマンドから直接デプロイを要求できます:",
                                "Vi povas deploji rekte per Connect-RPC aŭ cURL:",
                            )
                        }
                    }

                    div { style: "background: #090d16; border: 1px solid rgba(255, 255, 255, 0.1); border-radius: var(--radius-sm); padding: 1rem; overflow-x: auto; font-family: monospace; font-size: 0.84rem; line-height: 1.5; color: #e2e8f0; white-space: pre-wrap;",
                        {
                            "curl -X POST https://definy.fly.dev/definy.v1.DeployService/DeployInstance \\\n  -H 'Content-Type: application/json' \\\n  -H 'connect-protocol-version: 1' \\\n  -d '{\"wasmHash\": \"<hash>\", \"region\": \"nrt\"}'"
                        }
                    }

                    div { style: "display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 0.75rem; margin-top: 0.5rem;",
                        div { style: "padding: 0.8rem; background: rgba(255, 255, 255, 0.03); border: 1px solid var(--border); border-radius: var(--radius-sm); font-size: 0.82rem;",
                            div { style: "font-weight: 600; color: #a855f7; margin-bottom: 0.25rem;",
                                "wasmHash (recommended)"
                            }
                            div { style: "color: var(--text-secondary);",
                                {
                                    lang.label(
                                        "Virtual Wasm hash served on-demand. Deploys in seconds without Docker builds.",
                                        "オンデマンド仮想 Wasm ハッシュ。Docker ビルドなしで即座に数秒で起動。",
                                        "Virtuala Wasm-hako sen Docker-konstruo.",
                                    )
                                }
                            }
                        }
                        div { style: "padding: 0.8rem; background: rgba(255, 255, 255, 0.03); border: 1px solid var(--border); border-radius: var(--radius-sm); font-size: 0.82rem;",
                            div { style: "font-weight: 600; color: #93c5fd; margin-bottom: 0.25rem;",
                                "commitHash (optional)"
                            }
                            div { style: "color: var(--text-secondary);",
                                {
                                    lang.label(
                                        "Target Git commit or module event hash to bind into container environment.",
                                        "コンテナ環境変数に渡すコミットハッシュやモジュール識別子。",
                                        "Gita komito aŭ modulo-hako por la ujo.",
                                    )
                                }
                            }
                        }
                        div { style: "padding: 0.8rem; background: rgba(255, 255, 255, 0.03); border: 1px solid var(--border); border-radius: var(--radius-sm); font-size: 0.82rem;",
                            div { style: "font-weight: 600; color: #93c5fd; margin-bottom: 0.25rem;",
                                "machineName (optional)"
                            }
                            div { style: "color: var(--text-secondary);",
                                {
                                    lang.label(
                                        "Custom machine name for fly.io. Omit for automatic naming.",
                                        "fly.io のカスタムマシン名。省略時は自動採番。",
                                        "Propra maŝinnomo por fly.io.",
                                    )
                                }
                            }
                        }
                        div { style: "padding: 0.8rem; background: rgba(255, 255, 255, 0.03); border: 1px solid var(--border); border-radius: var(--radius-sm); font-size: 0.82rem;",
                            div { style: "font-weight: 600; color: #93c5fd; margin-bottom: 0.25rem;",
                                "region (optional)"
                            }
                            div { style: "color: var(--text-secondary);",
                                {
                                    lang.label(
                                        "Target datacenter region (e.g. 'nrt' for Tokyo, defaults to server region).",
                                        "展開先リージョン（例: 東京は 'nrt'、省略時は親サーバー基準）。",
                                        "Regiona datumcentro (ekz. 'nrt' por Tokio).",
                                    )
                                }
                            }
                        }
                    }
                }

                // デプロイ履歴テーブル説明
                div {
                    class: "event-detail-card",
                    style: "background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: 1.5rem; display: flex; flex-direction: column; gap: 0.8rem;",

                    h2 { style: "font-size: 1.15rem; font-weight: 700; margin: 0; color: var(--text-primary); display: flex; align-items: center; gap: 0.5rem;",
                        span { "📋" }
                        {
                            lang.label(
                                "Database Persistence & Verification",
                                "SurrealDB による履歴永続化と検証",
                                "Persisto en SurrealDB",
                            )
                        }
                    }

                    p { style: "font-size: 0.88rem; color: var(--text-secondary); margin: 0; line-height: 1.5;",
                        {
                            lang.label(
                                "All successful deployment executions are immutably persisted into SurrealDB 'deployments' table and can be queried anytime via ListDeployments RPC.",
                                "実行されたデプロイはすべて SurrealDB の deployments テーブルに保存され、ListDeployments RPC を通じていつでも確認・参照できます。",
                                "Ĉiuj deplojoj estas konservitaj en SurrealDB deployments tabelo.",
                            )
                        }
                    }
                }
            }
        }
    }
}

#[component]
fn BootstrappingLayerCard(
    context: PageContext,
    step_num: &'static str,
    status_badge: &'static str,
    status_color: &'static str,
    title: &'static str,
    description: &'static str,
) -> Element {
    rsx! {
        div {
            class: "event-detail-card",
            style: "background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: 1.3rem; display: flex; flex-direction: column; gap: 0.65rem;",
            div { style: "display: flex; justify-content: space-between; align-items: center;",
                span { style: "font-size: 0.75rem; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em;",
                    "{step_num}"
                }
                span { style: "font-size: 0.72rem; font-weight: 600; padding: 0.15rem 0.5rem; border-radius: 9999px; background: rgba(255, 255, 255, 0.06); border: 1px solid {status_color}; color: {status_color};",
                    "{status_badge}"
                }
            }
            h3 { style: "font-size: 1rem; font-weight: 700; margin: 0; color: var(--text-primary);",
                "{title}"
            }
            p { style: "font-size: 0.84rem; color: var(--text-secondary); margin: 0; line-height: 1.5;",
                "{description}"
            }
        }
    }
}
