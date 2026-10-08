use dioxus::prelude::*;

use crate::Location;
use crate::page_context::PageContext;

#[derive(Clone, PartialEq)]
enum DeployStatusState {
    Idle,
    Deploying,
    Success(definy_event::rpc::DeployDenoResponse),
    Error(String),
}

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

                    div { style: "position: absolute; top: -40px; right: -40px; width: 180px; height: 180px; background: radial-gradient(circle, rgba(56, 189, 248, 0.25) 0%, transparent 70%); border-radius: 50%; pointer-events: none;" }
                    div { style: "position: absolute; bottom: -40px; left: -40px; width: 180px; height: 180px; background: radial-gradient(circle, rgba(168, 85, 247, 0.2) 0%, transparent 70%); border-radius: 50%; pointer-events: none;" }

                    div { style: "display: flex; align-items: center; justify-content: center; width: 64px; height: 64px; border-radius: 18px; background: rgba(56, 189, 248, 0.15); border: 1px solid rgba(56, 189, 248, 0.35); box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3); font-size: 2rem;",
                        "🦕"
                    }

                    h1 { style: "font-size: 2rem; font-weight: 800; margin: 0; background: linear-gradient(135deg, #ffffff 30%, #38bdf8 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent;",
                        {
                            lang.label(
                                "Operational Bootstrapping (Deno Deploy & Edge Runtime)",
                                "運用ブートストラップ (Deno Deploy & エッジランタイム)",
                                "Operacia Memgastigado (Deno Deploy)",
                            )
                        }
                    }

                    p { style: "font-size: 1.05rem; font-weight: 600; color: #38bdf8; margin: 0; max-width: 680px; line-height: 1.45;",
                        {
                            lang.label(
                                "Zero OS, Zero Containers: Deploying next-generation definy instances directly onto V8 isolates via Deno Deploy REST API v2.",
                                "OS層・コンテナ層の完全撤廃: Deno Deploy REST API v2 を通じて、V8 Isolate 上にミリ秒で次世代 definy インスタンスを展開・自律運用。",
                                "Nula operaciumo: Deploji definy rekte sur V8-izolitojn per Deno Deploy REST API v2.",
                            )
                        }
                    }

                    p { style: "font-size: 0.9rem; color: var(--text-secondary); margin: 0; max-width: 720px; line-height: 1.6;",
                        {
                            lang.label(
                                "Unlike traditional heavy VM environments, Deno Deploy executes WebAssembly and TypeScript natively on the global edge with deterministic revision pinning and instant routing.",
                                "重厚な VM や Docker ビルドを必要とせず、UI から Org Token を渡すだけで世界中のエッジに Wasm / Web 標準コードを即座にプロビジョニングし、恒久的なリビジョン URL を発行します。",
                                "Sen pezaj VM-medioj, Deno Deploy rulas WebAssembly kaj TypeScript rekte sur la tutmonda rando.",
                            )
                        }
                    }

                    div { style: "display: flex; gap: 0.75rem; flex-wrap: wrap; justify-content: center; margin-top: 0.4rem;",
                        a {
                            href: "https://api.deno.com/v2/docs",
                            target: "_blank",
                            rel: "noopener noreferrer",
                            style: "padding: 0.6rem 1.4rem; background: var(--primary); color: #fff; text-decoration: none; border-radius: var(--radius-sm); font-weight: 600; font-size: 0.9rem; transition: opacity 0.15s ease;",
                            {
                                lang.label(
                                    "Deno Deploy API v2 Docs ↗",
                                    "Deno Deploy API v2 仕様 ↗",
                                    "Deno Deploy API v2 Dokumento ↗",
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

                // Deno Deploy インタラクティブ実行フォーム
                DenoDeployCard { context: context.clone() }

                // 3つのブートストラップ階層
                div { style: "display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1rem;",
                    BootstrappingLayerCard {
                        context: context.clone(),
                        step_num: "Layer 1",
                        status_badge: lang.label("Active / V8 Isolate", "稼働中 / V8 Isolate", "Aktiva / V8 Izolito"),
                        status_color: "#38bdf8",
                        title: lang.label(
                            "Edge Bootstrapping",
                            "運用・エッジ層の自己完結",
                            "Randa Memgastigo",
                        ),
                        description: lang.label(
                            "definy provisions child edge instances on Deno Deploy REST API v2 without Docker builds, achieving near-zero millisecond cold starts.",
                            "Docker や Linux VM なしで Deno Deploy REST API v2 を直接叩き、子インスタンスをミリ秒で起動。履歴を SurrealDB に記録。",
                            "definy provizas randajn instancojn per Deno Deploy REST API v2 sen Docker.",
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

                // Connect-RPC デプロイ実行ガイド & cURL コマンド
                DeployCommandGuideCard { context: context.clone() }

                // デプロイ履歴一覧 (SurrealDB 永続化)
                DeploymentsHistoryCard { context: context.clone() }
            }
        }
    }
}

#[component]
fn DenoDeployCard(context: PageContext) -> Element {
    let lang = context.language;

    let mut token = use_signal(String::new);
    let mut show_token = use_signal(|| false);
    let mut app_slug = use_signal(String::new);
    let mut wasm_hash = use_signal(String::new);
    let mut deploy_state = use_signal(|| DeployStatusState::Idle);

    let on_submit = move |_| {
        let current_token = token.read().trim().to_string();
        if current_token.is_empty() {
            deploy_state.set(DeployStatusState::Error(
                lang.label(
                    "Please provide a Deno Deploy Org Token / Access Token.",
                    "Deno Deploy の Org Token (Access Token) を入力してください。",
                    "Bonvolu provizi Deno Deploy Org Token.",
                )
                .to_string(),
            ));
            return;
        }

        let current_app_slug = {
            let s = app_slug.read().trim().to_string();
            if s.is_empty() { None } else { Some(s) }
        };

        let current_wasm_hash = {
            let s = wasm_hash.read().trim().to_string();
            if s.is_empty() { None } else { Some(s) }
        };

        deploy_state.set(DeployStatusState::Deploying);

        spawn(async move {
            let req = definy_event::rpc::DeployDenoRequest {
                org_token: current_token,
                app_slug: current_app_slug,
                wasm_hash: current_wasm_hash,
                custom_script: None,
            };
            match crate::fetch::deploy_deno(&req).await {
                Ok(res) => {
                    deploy_state.set(DeployStatusState::Success(res));
                }
                Err(err) => {
                    deploy_state.set(DeployStatusState::Error(err.to_string()));
                }
            }
        });
    };

    rsx! {
        div {
            class: "event-detail-card",
            style: "background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: 1.8rem; display: flex; flex-direction: column; gap: 1.3rem;",

            div { style: "display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.5rem;",
                h2 { style: "font-size: 1.3rem; font-weight: 700; margin: 0; color: var(--text-primary); display: flex; align-items: center; gap: 0.6rem;",
                    span { "⚡" }
                    {
                        lang.label(
                            "Deploy to Deno Deploy Edge",
                            "Deno Deploy エッジへのデプロイ実行",
                            "Deploji al Deno Deploy Rando",
                        )
                    }
                }
                span { style: "font-size: 0.78rem; font-weight: 600; padding: 0.2rem 0.6rem; border-radius: 9999px; background: rgba(56, 189, 248, 0.12); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.3);",
                    "REST API v2"
                }
            }

            p { style: "font-size: 0.88rem; color: var(--text-secondary); margin: 0; line-height: 1.5;",
                {
                    lang.label(
                        "Enter your Deno Deploy Access Token (Organization or Personal). The token is used in-memory for this deployment request and is never persisted to databases or local storage.",
                        "Deno Deploy の Access Token (Org Token / Personal Token) を入力してください。入力されたトークンはデプロイ API 呼び出し時のみメモリ上で使用され、DB やローカルストレージには保存されません。",
                        "Enmetu vian Deno Deploy Access Token. La ĵetono neniam estas konservita en datumbazo.",
                    )
                }
            }

            // フォームコンテナ
            div { style: "display: grid; gap: 1.1rem;",

                // Org Token 入力
                div { style: "display: flex; flex-direction: column; gap: 0.4rem;",
                    label { style: "font-size: 0.84rem; font-weight: 600; color: var(--text-primary); display: flex; justify-content: space-between;",
                        span {
                            {
                                lang.label(
                                    "Deno Deploy Token (Org Token / Access Token) *",
                                    "Deno Deploy トークン (Org Token / Access Token) *",
                                    "Deno Deploy Token *",
                                )
                            }
                        }
                        a {
                            href: "https://dash.deno.com/account#access-tokens",
                            target: "_blank",
                            rel: "noopener noreferrer",
                            style: "font-size: 0.78rem; color: #38bdf8; text-decoration: none;",
                            {
                                lang.label(
                                    "Create token in Deno Dash ↗",
                                    "Deno Dash でトークンを発行 ↗",
                                    "Krei ĵetonon en Deno Dash ↗",
                                )
                            }
                        }
                    }
                    div { style: "display: flex; gap: 0.5rem;",
                        input {
                            r#type: if *show_token.read() { "text" } else { "password" },
                            placeholder: "ddp_...",
                            value: "{token.read()}",
                            oninput: move |e| token.set(e.value()),
                            style: "flex: 1; padding: 0.65rem 0.9rem; border-radius: var(--radius-sm); border: 1px solid var(--border); background: #090d16; color: #f8fafc; font-size: 0.9rem; font-family: monospace; outline: none;",
                        }
                        button {
                            r#type: "button",
                            onclick: move |_| {
                                let next = !*show_token.read();
                                show_token.set(next);
                            },
                            style: "padding: 0.65rem 0.9rem; background: rgba(255, 255, 255, 0.06); border: 1px solid var(--border); border-radius: var(--radius-sm); color: var(--text-secondary); cursor: pointer; font-size: 0.85rem;",
                            if *show_token.read() {
                                "Hide"
                            } else {
                                "Show"
                            }
                        }
                    }
                }

                // 2列グリッド: App Slug & Wasm Hash
                div { style: "display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 1rem;",

                    // App Slug
                    div { style: "display: flex; flex-direction: column; gap: 0.4rem;",
                        label { style: "font-size: 0.84rem; font-weight: 600; color: var(--text-primary);",
                            {
                                lang.label(
                                    "App Slug (optional)",
                                    "App Slug (アプリケーション識別名・任意)",
                                    "App Slug (nedeviga)",
                                )
                            }
                        }
                        input {
                            r#type: "text",
                            placeholder: lang.label(
                                "e.g. definy-sample-edge",
                                "例: definy-sample-edge",
                                "ekz. definy-sample-edge",
                            ),
                            value: "{app_slug.read()}",
                            oninput: move |e| app_slug.set(e.value()),
                            style: "padding: 0.65rem 0.9rem; border-radius: var(--radius-sm); border: 1px solid var(--border); background: #090d16; color: #f8fafc; font-size: 0.9rem; font-family: monospace; outline: none;",
                        }
                        span { style: "font-size: 0.74rem; color: var(--text-secondary);",
                            {
                                lang.label(
                                    "Omit to generate a random unique app slug automatically.",
                                    "省略時は一意なランダム slug が自動生成されます。",
                                    "Preterlasi por generi hazardan slug.",
                                )
                            }
                        }
                    }

                    // Wasm Hash
                    div { style: "display: flex; flex-direction: column; gap: 0.4rem;",
                        label { style: "font-size: 0.84rem; font-weight: 600; color: var(--text-primary);",
                            {
                                lang.label(
                                    "Virtual Wasm Hash (optional)",
                                    "仮想 Wasm ハッシュ (任意)",
                                    "Virtuala Wasm-hako (nedeviga)",
                                )
                            }
                        }
                        input {
                            r#type: "text",
                            placeholder: lang.label(
                                "e.g. definy_client_bg",
                                "例: definy_client_bg",
                                "ekz. definy_client_bg",
                            ),
                            value: "{wasm_hash.read()}",
                            oninput: move |e| wasm_hash.set(e.value()),
                            style: "padding: 0.65rem 0.9rem; border-radius: var(--radius-sm); border: 1px solid var(--border); background: #090d16; color: #f8fafc; font-size: 0.9rem; font-family: monospace; outline: none;",
                        }
                        span { style: "font-size: 0.74rem; color: var(--text-secondary);",
                            {
                                lang.label(
                                    "Bundle a compiled definy WebAssembly binary into edge assets.",
                                    "コンパイル済みの WebAssembly バイナリをエッジアセットに同梱します。",
                                    "Paki Wasm-binaron en randajn havaĵojn.",
                                )
                            }
                        }
                    }
                }

                // デプロイ実行ボタン
                div { style: "display: flex; align-items: center; gap: 1rem; margin-top: 0.4rem;",
                    button {
                        r#type: "button",
                        onclick: on_submit,
                        disabled: matches!(*deploy_state.read(), DeployStatusState::Deploying),
                        style: "padding: 0.75rem 1.8rem; background: linear-gradient(135deg, #0284c7 0%, #38bdf8 100%); color: #fff; border: none; border-radius: var(--radius-sm); font-size: 0.95rem; font-weight: 700; cursor: pointer; transition: transform 0.1s ease, opacity 0.15s ease; box-shadow: 0 4px 12px rgba(2, 132, 199, 0.35);",
                        match *deploy_state.read() {
                            DeployStatusState::Deploying => {
                                lang.label(
                                    "Deploying to Deno Deploy edge...",
                                    "Deno Deploy エッジへデプロイ中...",
                                    "Deplojas al Deno Deploy rando...",
                                )
                            }
                            _ => {
                                lang.label(
                                    "🚀 Deploy to Deno Deploy",
                                    "🚀 Deno Deploy へデプロイ",
                                    "🚀 Deploji al Deno Deploy",
                                )
                            }
                        }
                    }
                }
            }

            // 実行結果 / エラーメッセージ表示
            match deploy_state.read().clone() {
                DeployStatusState::Deploying => rsx! {
                    div { style: "padding: 1rem; background: rgba(56, 189, 248, 0.08); border: 1px solid rgba(56, 189, 248, 0.3); border-radius: var(--radius-sm); display: flex; align-items: center; gap: 0.8rem; color: #38bdf8; font-size: 0.88rem;",
                        span { style: "animation: spin 1s linear infinite; display: inline-block;", "⏳" }
                        span {
                            {
                                lang.label(
                                    "Connecting to Deno Deploy REST API v2, creating app revision, and assigning edge hostnames...",
                                    "Deno Deploy REST API v2 に接続し、リビジョンを作成してエッジホスト名を割り当てています...",
                                    "Konektas al Deno Deploy REST API v2...",
                                )
                            }
                        }
                    }
                },
                DeployStatusState::Success(res) => rsx! {
                    div { style: "padding: 1.2rem; background: rgba(34, 197, 94, 0.1); border: 1px solid rgba(34, 197, 94, 0.35); border-radius: var(--radius-sm); display: flex; flex-direction: column; gap: 0.75rem;",
                        div { style: "display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.5rem;",
                            div { style: "display: flex; align-items: center; gap: 0.5rem; color: #4ade80; font-weight: 700; font-size: 0.95rem;",
                                span { "🎉" }
                                span {
                                    {
                                        lang.label(
                                            "Deployment Successful!",
                                            "デプロイが完了しました！",
                                            "Deploja Sukceso!",
                                        )
                                    }
                                }
                            }
                            span { style: "font-size: 0.78rem; font-weight: 600; padding: 0.2rem 0.6rem; border-radius: 9999px; background: rgba(34, 197, 94, 0.2); color: #4ade80;",
                                "{res.status}"
                            }
                        }

                        div { style: "display: flex; flex-direction: column; gap: 0.35rem; font-size: 0.85rem;",
                            div { style: "display: flex; gap: 0.5rem; align-items: baseline;",
                                span { style: "color: var(--text-secondary); width: 85px;", "Public URL:" }
                                a {
                                    href: "{res.url}",
                                    target: "_blank",
                                    rel: "noopener noreferrer",
                                    style: "color: #38bdf8; font-weight: 700; font-size: 0.95rem; text-decoration: underline;",
                                    "{res.url} ↗"
                                }
                            }
                            div { style: "display: flex; gap: 0.5rem;",
                                span { style: "color: var(--text-secondary); width: 85px;", "App Slug:" }
                                span { style: "font-family: monospace; color: #f8fafc;", "{res.app_slug}" }
                            }
                            div { style: "display: flex; gap: 0.5rem;",
                                span { style: "color: var(--text-secondary); width: 85px;", "Revision ID:" }
                                span { style: "font-family: monospace; color: #f8fafc; font-size: 0.8rem;",
                                    "{res.revision_id}"
                                }
                            }
                        }
                    }
                },
                DeployStatusState::Error(err_msg) => rsx! {
                    div { style: "padding: 1rem; background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.35); border-radius: var(--radius-sm); display: flex; flex-direction: column; gap: 0.3rem; color: #f87171; font-size: 0.88rem;",
                        div { style: "font-weight: 700; display: flex; align-items: center; gap: 0.5rem;",
                            span { "⚠️" }
                            span {
                                {
                                    lang.label(
                                        "Deployment Failed",
                                        "デプロイに失敗しました",
                                        "Deploja Malsukceso",
                                    )
                                }
                            }
                        }
                        div { style: "font-family: monospace; font-size: 0.82rem; word-break: break-all;",
                            "{err_msg}"
                        }
                    }
                },
                DeployStatusState::Idle => rsx! {},
            }
        }
    }
}

#[component]
fn DeployCommandGuideCard(context: PageContext) -> Element {
    let lang = context.language;

    rsx! {
        div {
            class: "event-detail-card",
            style: "background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: 1.5rem; display: flex; flex-direction: column; gap: 1rem;",

            h2 { style: "font-size: 1.25rem; font-weight: 700; margin: 0; color: var(--text-primary); display: flex; align-items: center; gap: 0.5rem;",
                span { "💻" }
                {
                    lang.label(
                        "Trigger Deployment via Connect-RPC / cURL",
                        "Connect-RPC / cURL コマンドでの実行例",
                        "Deploji per Connect-RPC / cURL",
                    )
                }
            }

            p { style: "font-size: 0.88rem; color: var(--text-secondary); margin: 0; line-height: 1.5;",
                {
                    lang.label(
                        "You can trigger edge deployment directly from any Connect-RPC client, CI/CD pipeline, or cURL command:",
                        "Connect-RPC クライアントや CI/CD、cURL コマンドから直接 Deno Deploy を実行できます:",
                        "Vi povas deploji rekte per Connect-RPC aŭ cURL:",
                    )
                }
            }

            // Connect-RPC DeployDeno cURL 例
            div { style: "background: #090d16; border: 1px solid rgba(255, 255, 255, 0.1); border-radius: var(--radius-sm); padding: 1rem; overflow-x: auto; font-family: monospace; font-size: 0.84rem; line-height: 1.5; color: #e2e8f0; white-space: pre-wrap;",
                {
                    "curl -X POST https://definy.fly.dev/definy.v1.DeployService/DeployDeno \\\n  -H 'Content-Type: application/json' \\\n  -H 'connect-protocol-version: 1' \\\n  -d '{\"orgToken\": \"$DENO_DEPLOY_TOKEN\", \"appSlug\": \"my-definy-edge\"}'"
                }
            }

            div { style: "display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 0.75rem; margin-top: 0.5rem;",
                div { style: "padding: 0.8rem; background: rgba(255, 255, 255, 0.03); border: 1px solid var(--border); border-radius: var(--radius-sm); font-size: 0.82rem;",
                    div { style: "font-weight: 600; color: #38bdf8; margin-bottom: 0.25rem;",
                        "orgToken (required)"
                    }
                    div { style: "color: var(--text-secondary);",
                        {
                            lang.label(
                                "Deno Deploy Access Token. Resolved against organization scope.",
                                "Deno Deploy のアクセストークン。組織スコープで処理されます。",
                                "Deno Deploy Access Token.",
                            )
                        }
                    }
                }
                div { style: "padding: 0.8rem; background: rgba(255, 255, 255, 0.03); border: 1px solid var(--border); border-radius: var(--radius-sm); font-size: 0.82rem;",
                    div { style: "font-weight: 600; color: #93c5fd; margin-bottom: 0.25rem;",
                        "appSlug (optional)"
                    }
                    div { style: "color: var(--text-secondary);",
                        {
                            lang.label(
                                "Target app name. Created automatically if it does not exist.",
                                "対象のアプリ名。存在しない場合は自動作成されます。",
                                "Cela aplikaĵnomo.",
                            )
                        }
                    }
                }
                div { style: "padding: 0.8rem; background: rgba(255, 255, 255, 0.03); border: 1px solid var(--border); border-radius: var(--radius-sm); font-size: 0.82rem;",
                    div { style: "font-weight: 600; color: #a855f7; margin-bottom: 0.25rem;",
                        "wasmHash (optional)"
                    }
                    div { style: "color: var(--text-secondary);",
                        {
                            lang.label(
                                "Virtual WebAssembly hash bundled directly into edge assets.",
                                "エッジアセットに同梱する仮想 WebAssembly のハッシュ。",
                                "Virtuala Wasm-hako.",
                            )
                        }
                    }
                }
            }
        }
    }
}

#[component]
fn DeploymentsHistoryCard(context: PageContext) -> Element {
    let lang = context.language;

    let mut deployments = use_signal(Vec::<definy_event::rpc::DeploymentItem>::new);
    let mut loading = use_signal(|| true);
    let mut load_error = use_signal(|| Option::<String>::None);

    use_effect(move || {
        spawn(async move {
            loading.set(true);
            match crate::fetch::list_deployments(Some(10)).await {
                Ok(res) => {
                    deployments.set(res.deployments);
                    loading.set(false);
                }
                Err(err) => {
                    load_error.set(Some(err.to_string()));
                    loading.set(false);
                }
            }
        });
    });

    rsx! {
        div {
            class: "event-detail-card",
            style: "background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: 1.5rem; display: flex; flex-direction: column; gap: 1rem;",

            div { style: "display: flex; align-items: center; justify-content: space-between;",
                h2 { style: "font-size: 1.15rem; font-weight: 700; margin: 0; color: var(--text-primary); display: flex; align-items: center; gap: 0.5rem;",
                    span { "📋" }
                    {
                        lang.label(
                            "Deployment Records (SurrealDB)",
                            "デプロイ履歴一覧 (SurrealDB)",
                            "Deplojaj Rikordoj (SurrealDB)",
                        )
                    }
                }
                span { style: "font-size: 0.78rem; color: var(--text-secondary);",
                    {
                        lang.label(
                            "Immutably persisted in 'deployments' table",
                            "deployments テーブルに永続化",
                            "Konservita en 'deployments'",
                        )
                    }
                }
            }

            if *loading.read() {
                div { style: "padding: 1.5rem; text-align: center; color: var(--text-secondary); font-size: 0.85rem;",
                    {
                        lang.label(
                            "Loading deployment records...",
                            "デプロイ履歴を読み込み中...",
                            "Ŝarĝas rikordojn...",
                        )
                    }
                }
            } else if let Some(ref err) = *load_error.read() {
                div { style: "padding: 1rem; background: rgba(255, 255, 255, 0.03); border: 1px solid var(--border); border-radius: var(--radius-sm); font-size: 0.82rem; color: var(--text-secondary);",
                    span {
                        {
                            lang.label(
                                "Notice: Deployment history is currently unavailable: ",
                                "備考: デプロイ履歴は現在参照できません: ",
                                "Noto: Deplojaj rikordoj estas nuntempe neatingeblaj: ",
                            )
                        }
                    }
                    span { style: "font-family: monospace;", "{err}" }
                }
            } else if deployments.read().is_empty() {
                div { style: "padding: 1.5rem; text-align: center; color: var(--text-secondary); font-size: 0.85rem;",
                    {
                        lang.label(
                            "No deployment records found yet. Trigger your first deployment above!",
                            "デプロイ履歴はまだありません。上のフォームから最初のデプロイを実行してみましょう！",
                            "Ankoraŭ neniuj deplojaj rikordoj.",
                        )
                    }
                }
            } else {
                div { style: "display: flex; flex-direction: column; gap: 0.6rem;",
                    for item in deployments.read().iter() {
                        div {
                            key: "{item.machine_id}",
                            style: "padding: 0.85rem 1rem; background: rgba(255, 255, 255, 0.03); border: 1px solid var(--border); border-radius: var(--radius-sm); display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.6rem;",

                            div { style: "display: flex; flex-direction: column; gap: 0.2rem;",
                                div { style: "display: flex; align-items: center; gap: 0.5rem;",
                                    span { style: if item.provider.as_deref() == Some("deno_deploy") { "font-size: 0.72rem; font-weight: 700; padding: 0.15rem 0.5rem; border-radius: 9999px; background: rgba(56, 189, 248, 0.15); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.3);" } else { "font-size: 0.72rem; font-weight: 700; padding: 0.15rem 0.5rem; border-radius: 9999px; background: rgba(168, 85, 247, 0.15); color: #c084fc; border: 1px solid rgba(168, 85, 247, 0.3);" },
                                        if item.provider.as_deref() == Some("deno_deploy") {
                                            "🦕 Deno Deploy"
                                        } else {
                                            "🪰 fly.io"
                                        }
                                    }
                                    a {
                                        href: "{item.url}",
                                        target: "_blank",
                                        rel: "noopener noreferrer",
                                        style: "font-weight: 600; font-size: 0.88rem; color: #38bdf8; text-decoration: none;",
                                        "{item.url} ↗"
                                    }
                                }
                                span { style: "font-size: 0.75rem; color: var(--text-secondary); font-family: monospace;",
                                    "ID: {item.machine_id} · Region: {item.region}"
                                }
                            }

                            div { style: "display: flex; align-items: center; gap: 0.6rem;",
                                span { style: "font-size: 0.75rem; font-weight: 600; padding: 0.15rem 0.5rem; border-radius: 9999px; background: rgba(34, 197, 94, 0.15); color: #4ade80;",
                                    "{item.status}"
                                }
                                span { style: "font-size: 0.75rem; color: var(--text-secondary);",
                                    "{item.created_at_rfc3339}"
                                }
                            }
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
