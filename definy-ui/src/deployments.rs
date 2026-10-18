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
                    style: "background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: 2.2rem 1.8rem; display: flex; flex-direction: column; align-items: center; text-align: center; gap: 1.1rem; position: relative; overflow: hidden;",

                    div { style: "position: absolute; top: -40px; right: -40px; width: 180px; height: 180px; background: radial-gradient(circle, var(--orange-border) 0%, transparent 70%); border-radius: 50%; pointer-events: none;" }
                    div { style: "position: absolute; bottom: -40px; left: -40px; width: 180px; height: 180px; background: radial-gradient(circle, var(--purple-bg-strong) 0%, transparent 70%); border-radius: 50%; pointer-events: none;" }

                    div { style: "display: flex; align-items: center; justify-content: center; width: 64px; height: 64px; border-radius: 18px; background: var(--orange-bg-strong); border: 1px solid var(--orange-border); box-shadow: 0 8px 24px var(--shadow-color); font-size: 2rem;",
                        "⚡"
                    }

                    h1 { style: "font-size: 2rem; font-weight: 800; margin: 0; background: linear-gradient(135deg, var(--text-primary) 30%, var(--orange) 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent;",
                        {
                            lang.label(
                                "Operational Bootstrapping (Cloudflare Workers & Edge Runtime)",
                                "運用ブートストラップ (Cloudflare Workers & エッジランタイム)",
                                "Operacia Memgastigado (Cloudflare Workers)",
                            )
                        }
                    }

                    p { style: "font-size: 1.05rem; font-weight: 600; color: var(--orange); margin: 0; max-width: 680px; line-height: 1.45;",
                        {
                            lang.label(
                                "Zero OS, Zero Containers: Deploying next-generation definy instances directly onto V8 isolates via Cloudflare Workers REST API v4.",
                                "OS層・コンテナ層の完全撤廃: Cloudflare Workers REST API v4 を通じて、V8 Isolate 上にミリ秒で次世代 definy インスタンスを展開・自律運用。",
                                "Nula operaciumo: Deploji definy rekte sur V8-izolitojn per Cloudflare Workers REST API v4.",
                            )
                        }
                    }

                    p { style: "font-size: 0.9rem; color: var(--text-secondary); margin: 0; max-width: 720px; line-height: 1.6;",
                        {
                            lang.label(
                                "Unlike traditional heavy VM environments, Cloudflare Workers executes WebAssembly and ES Modules natively on global edge locations with deterministic routing and sub-millisecond cold starts.",
                                "重厚な VM や Docker ビルドを必要とせず、UI から API Token を渡すだけで世界中のエッジに Wasm / ES Modules コードを即座にプロビジョニングし、workers.dev サブドメインを即時有効化します。",
                                "Sen pezaj VM-medioj, Cloudflare Workers rulas WebAssembly kaj ES Modules rekte sur la tutmonda rando.",
                            )
                        }
                    }

                    div { style: "display: flex; gap: 0.75rem; flex-wrap: wrap; justify-content: center; margin-top: 0.4rem;",
                        a {
                            href: "https://developers.cloudflare.com/api/resources/workers/",
                            target: "_blank",
                            rel: "noopener noreferrer",
                            style: "padding: 0.6rem 1.4rem; background: var(--primary-solid); color: var(--text-primary); text-decoration: none; border-radius: var(--radius-sm); font-weight: 600; font-size: 0.9rem; transition: opacity 0.15s ease;",
                            {
                                lang.label(
                                    "Cloudflare Workers API Docs ↗",
                                    "Cloudflare Workers API 仕様 ↗",
                                    "Cloudflare Workers API Dokumento ↗",
                                )
                            }
                        }
                        a {
                            href: context.href_with_lang(Location::ApiOverview),
                            style: "padding: 0.6rem 1.4rem; background: var(--overlay-3); color: var(--text-primary); text-decoration: none; border: 1px solid var(--border); border-radius: var(--radius-sm); font-weight: 600; font-size: 0.9rem; transition: background 0.15s ease;",
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

                // 宣言的デプロイパーツ (definy:deploy) の仕様と解説カード
                DeployPartGuideCard { context: context.clone() }

                // 3つのブートストラップ階層
                div { style: "display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1rem;",
                    BootstrappingLayerCard {
                        context: context.clone(),
                        step_num: "Layer 1",
                        status_badge: lang.label("Active / V8 Isolate", "稼働中 / V8 Isolate", "Aktiva / V8 Izolito"),
                        status_color: "var(--orange)",
                        title: lang.label(
                            "Edge Bootstrapping",
                            "運用・エッジ層の自己完結",
                            "Randa Memgastigo",
                        ),
                        description: lang.label(
                            "definy provisions child edge instances on Cloudflare Workers REST API v4 without Docker builds, achieving near-zero millisecond cold starts.",
                            "Docker や Linux VM なしで Cloudflare Workers REST API v4 を直接叩き、子インスタンスをミリ秒で起動。履歴を SurrealDB に記録。",
                            "definy provizas randajn instancojn per Cloudflare Workers REST API v4 sen Docker.",
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
                        status_color: "var(--blue)",
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
                        status_color: "var(--purple)",
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
fn DeployPartGuideCard(context: PageContext) -> Element {
    let lang = context.language;
    let code_sample = "definy.deploy(\n  cloudflareToken: \"$CLOUDFLARE_API_TOKEN\",\n  cloudflareWorkerName: \"my-production-app\",\n  handler: fn(req: HttpRequest) => HttpResponse {\n    status: 200,\n    headers: [],\n    body: std.string-to-utf8-stream(\"Hello from Cloudflare Workers!\")\n  }\n)";

    rsx! {
        div {
            class: "event-detail-card",
            style: "background: var(--surface); border: 1px solid var(--orange-border); border-radius: var(--radius-lg); padding: 1.6rem; display: flex; flex-direction: column; gap: 1.1rem;",

            div { style: "display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.6rem;",
                div { style: "display: flex; align-items: center; gap: 0.6rem;",
                    span { style: "font-size: 1.5rem;", "⚡" }
                    h2 { style: "font-size: 1.25rem; font-weight: 700; margin: 0; color: var(--orange);",
                        {
                            lang.label(
                                "Declarative Edge Deployment (definy:deploy)",
                                "宣言的エッジデプロイパーツ (definy:deploy)",
                                "Deklara Deploj-parto (definy:deploy)",
                            )
                        }
                    }
                }
                span {
                    class: "preview-badge",
                    style: "background: var(--orange-bg-strong); border: 1px solid var(--orange-border); color: var(--orange); font-size: 0.78rem; font-weight: 600; padding: 0.2rem 0.6rem; border-radius: 999px;",
                    {
                        lang.label(
                            "Executed on Server",
                            "サーバー実行専用パーツ",
                            "Rulata sur Servilo",
                        )
                    }
                }
            }

            p { style: "font-size: 0.92rem; color: var(--text-secondary); margin: 0; line-height: 1.6;",
                {
                    lang.label(
                        "In definy, deployments are not triggered by manual input forms, but defined as pure parts using definy:deploy. The deploy part is the ONLY part executed on the backend server, bridging pure functional expressions with Cloudflare Workers REST API v4.",
                        "definy では、手動の入力フォームではなくパーツとして definy:deploy を定義します。deploy パーツは唯一サーバー側で実行される特殊なパーツであり、純粋関数型式を Cloudflare Workers REST API v4 経由で世界中の V8 Isolate に配備します。",
                        "En definy, deplojoj estas difinitaj kiel puraj partoj per definy:deploy. Ĝi estas la nura parto rulata sur la servilo.",
                    )
                }
            }

            // コード例表示
            div { style: "background: var(--bg-inset); border: 1px solid var(--overlay-3); border-radius: var(--radius-sm); padding: 1.1rem; overflow-x: auto; font-family: 'JetBrains Mono', monospace; font-size: 0.85rem; line-height: 1.6; color: var(--text); white-space: pre;",
                "{code_sample}"
            }

            div { style: "display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 0.85rem; margin-top: 0.2rem;",
                div { style: "padding: 0.85rem; background: var(--overlay-1); border: 1px solid var(--border); border-radius: var(--radius-sm); font-size: 0.82rem; line-height: 1.5;",
                    div { style: "font-weight: 700; color: var(--orange); margin-bottom: 0.25rem; display: flex; align-items: center; gap: 0.35rem;",
                        span { "1." }
                        {lang.label("Define Part", "パーツとして定義", "Difini Parton")}
                    }
                    div { style: "color: var(--text-secondary);",
                        {
                            lang.label(
                                "Create a part that calls definy:deploy with your token, worker name, and HTTP handler function.",
                                "token, worker 名, HTTP ハンドラ関数を指定して definy:deploy を呼び出すパーツを作成・保存します。",
                                "Kreu parton vokantan definy:deploy.",
                            )
                        }
                    }
                }
                div { style: "padding: 0.85rem; background: var(--overlay-1); border: 1px solid var(--border); border-radius: var(--radius-sm); font-size: 0.82rem; line-height: 1.5;",
                    div { style: "font-weight: 700; color: var(--blue); margin-bottom: 0.25rem; display: flex; align-items: center; gap: 0.35rem;",
                        span { "2." }
                        {
                            lang.label(
                                "Execute on Server",
                                "サーバーで実行 / デプロイ",
                                "Ruli sur Servilo",
                            )
                        }
                    }
                    div { style: "color: var(--text-secondary);",
                        {
                            lang.label(
                                "Click 'Deploy to Cloudflare Workers' on the part editor screen. The server executes deployment and records history in SurrealDB.",
                                "パーツ詳細画面の「Cloudflare Workers にデプロイ」または「評価」を実行すると、サーバー側がデプロイを行い、履歴に記録されます。",
                                "Alklaku 'Deploji sur Cloudflare Workers' en la redaktilo.",
                            )
                        }
                    }
                }
                div { style: "padding: 0.85rem; background: var(--overlay-1); border: 1px solid var(--border); border-radius: var(--radius-sm); font-size: 0.82rem; line-height: 1.5;",
                    div { style: "font-weight: 700; color: var(--purple); margin-bottom: 0.25rem; display: flex; align-items: center; gap: 0.35rem;",
                        span { "3." }
                        {
                            lang.label(
                                "Native Wasm Module on V8",
                                "V8 Isolate 上でのネイティブ Wasm 実行",
                                "Indiĝena Wasm-Modula Rulo",
                            )
                        }
                    }
                    div { style: "color: var(--text-secondary);",
                        {
                            lang.label(
                                "Both development verification and production runs use individual Cloudflare Workers with multipart application/wasm upload (~2s deploy).",
                                "開発時の動作確認も本番運用もすべて Cloudflare REST API v4 による個別 Worker デプロイ（application/wasm モジュール同梱・約2秒）に一本化されています。",
                                " Kaj evoluiga kontrolo kaj produktado uzas individuajn Cloudflare Workers.",
                            )
                        }
                    }
                }
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
                        "Connect-RPC クライアントや CI/CD、cURL コマンドから直接 Cloudflare Workers へのデプロイを実行できます:",
                        "Vi povas deploji rekte per Connect-RPC aŭ cURL:",
                    )
                }
            }

            // Connect-RPC DeployCloudflare cURL 例
            div { style: "background: var(--bg-inset); border: 1px solid var(--overlay-3); border-radius: var(--radius-sm); padding: 1rem; overflow-x: auto; font-family: monospace; font-size: 0.84rem; line-height: 1.5; color: var(--text); white-space: pre-wrap;",
                {
                    "curl -X POST https://definy.workers.dev/definy.v1.DeployService/DeployCloudflare \\\n  -H 'Content-Type: application/json' \\\n  -H 'connect-protocol-version: 1' \\\n  -d '{\"apiToken\": \"$CLOUDFLARE_API_TOKEN\", \"scriptName\": \"my-definy-edge\"}'"
                }
            }

            div { style: "display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 0.75rem; margin-top: 0.5rem;",
                div { style: "padding: 0.8rem; background: var(--overlay-1); border: 1px solid var(--border); border-radius: var(--radius-sm); font-size: 0.82rem;",
                    div { style: "font-weight: 600; color: var(--orange); margin-bottom: 0.25rem;",
                        "apiToken (required)"
                    }
                    div { style: "color: var(--text-secondary);",
                        {
                            lang.label(
                                "Cloudflare API Token with Workers Scripts Edit permissions.",
                                "Workers 編集権限を持つ Cloudflare API トークン。",
                                "Cloudflare API ĵetono.",
                            )
                        }
                    }
                }
                div { style: "padding: 0.8rem; background: var(--overlay-1); border: 1px solid var(--border); border-radius: var(--radius-sm); font-size: 0.82rem;",
                    div { style: "font-weight: 600; color: var(--blue-text); margin-bottom: 0.25rem;",
                        "scriptName (required)"
                    }
                    div { style: "color: var(--text-secondary);",
                        {
                            lang.label(
                                "Target Worker script name. Created or updated on Cloudflare.",
                                "デプロイ対象の Worker スクリプト名。自動作成または更新されます。",
                                "Cela Worker-nomo.",
                            )
                        }
                    }
                }
                div { style: "padding: 0.8rem; background: var(--overlay-1); border: 1px solid var(--border); border-radius: var(--radius-sm); font-size: 0.82rem;",
                    div { style: "font-weight: 600; color: var(--purple); margin-bottom: 0.25rem;",
                        "accountId (optional)"
                    }
                    div { style: "color: var(--text-secondary);",
                        {
                            lang.label(
                                "Cloudflare Account ID. Automatically detected from token if omitted.",
                                "Cloudflare Account ID。省略した場合はトークンから自動解決されます。",
                                "Cloudflare Konto ID.",
                            )
                        }
                    }
                }
                div { style: "padding: 0.8rem; background: var(--overlay-1); border: 1px solid var(--border); border-radius: var(--radius-sm); font-size: 0.82rem;",
                    div { style: "font-weight: 600; color: var(--yellow); margin-bottom: 0.25rem;",
                        "wasmHash (optional)"
                    }
                    div { style: "color: var(--text-secondary);",
                        {
                            lang.label(
                                "Virtual WebAssembly hash bundled directly into edge worker.",
                                "エッジ Worker に同梱する仮想 WebAssembly のハッシュ。",
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
                div { style: "padding: 1rem; background: var(--overlay-1); border: 1px solid var(--border); border-radius: var(--radius-sm); font-size: 0.82rem; color: var(--text-secondary);",
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
                            style: "padding: 0.85rem 1rem; background: var(--overlay-1); border: 1px solid var(--border); border-radius: var(--radius-sm); display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.6rem;",

                            div { style: "display: flex; flex-direction: column; gap: 0.2rem;",
                                div { style: "display: flex; align-items: center; gap: 0.5rem;",
                                    span { style: "font-size: 0.72rem; font-weight: 700; padding: 0.15rem 0.5rem; border-radius: 9999px; background: var(--orange-bg-strong); color: var(--orange); border: 1px solid var(--orange-border);",
                                        "⚡ Cloudflare"
                                    }
                                    a {
                                        href: "{item.url}",
                                        target: "_blank",
                                        rel: "noopener noreferrer",
                                        style: "font-weight: 600; font-size: 0.88rem; color: var(--blue); text-decoration: none;",
                                        "{item.url} ↗"
                                    }
                                }
                                span { style: "font-size: 0.75rem; color: var(--text-secondary); font-family: monospace;",
                                    "ID: {item.machine_id} · Region: {item.region}"
                                }
                            }

                            div { style: "display: flex; align-items: center; gap: 0.6rem;",
                                span { style: "font-size: 0.75rem; font-weight: 600; padding: 0.15rem 0.5rem; border-radius: 9999px; background: var(--green-bg-strong); color: var(--green);",
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
                span { style: "font-size: 0.75rem; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.05em;",
                    "{step_num}"
                }
                span { style: "font-size: 0.72rem; font-weight: 600; padding: 0.15rem 0.5rem; border-radius: 9999px; background: var(--overlay-2); border: 1px solid {status_color}; color: {status_color};",
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_deployments_view_renders_deploy_part_guide_and_history() {
        let context = crate::PageContext::from_path_and_query("/", "", Some("ja"));
        let mut renderer = dioxus_ssr::Renderer::new();
        let html = renderer.render_element(rsx! {
            DeploymentsView { context }
        });

        // 1. 宣言的デプロイパーツ (definy:deploy) のガイドが含まれていること
        assert!(
            html.contains("definy:deploy"),
            "Should contain definy:deploy guide, got: {html}"
        );
        assert!(
            html.contains("cloudflareWorkerName"),
            "Should contain cloudflareWorkerName example, got: {html}"
        );
        assert!(
            html.contains("サーバー実行専用パーツ"),
            "Should contain server execution label, got: {html}"
        );

        // 2. 廃止された手動デプロイフォーム（APIトークン入力フィールド）が存在しないこと
        assert!(
            !html.contains("Cloudflare ダッシュボードでトークンを発行"),
            "Should NOT contain deprecated manual token prompt, got: {html}"
        );
    }
}
