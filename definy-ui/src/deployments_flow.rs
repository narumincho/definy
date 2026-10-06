use dioxus::prelude::*;

use crate::language::Language;

#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub enum DeploymentDiagramTab {
    HtmlRequestFlow,
    DeployPipelineFlow,
}

#[component]
pub fn DeploymentsFlowDiagram(language: Language) -> Element {
    let mut selected_tab = use_signal(|| DeploymentDiagramTab::HtmlRequestFlow);

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
                                        "fly.io Deployment & HTML Request Lifecycle",
                                        "fly.io デプロイ & HTML リクエスト ライフサイクルフロー図",
                                        "Vivocikla Fludiagramo de fly.io Deplojo kaj HTML-Peto",
                                    )
                            }
                        }
                    }
                    p { style: "font-size: 0.86rem; color: var(--text-secondary); margin: 0; line-height: 1.5; max-width: 680px;",
                        {
                            language
                                .label(
                                    "Visual sequence of client HTTP requests, fly.io proxy machine auto-start, server-side HTML rendering (SSR), and Dioxus WASM hydration.",
                                    "ブラウザの HTTP リクエストから fly.io プロキシによるマシン自動起動、Axum による SSR レンダリング、Dioxus WASM ハイドレーションまでの完全な通信フロー図。",
                                    "Vida sekvenco de HTTP-petoj, aŭtomata maŝinlanĉo de fly.io, servila HTML-generado (SSR), kaj Dioxus WASM-aktivigo.",
                                )
                        }
                    }
                }

                // タブ切り替えボタン
                div { style: "display: flex; gap: 0.5rem; flex-wrap: wrap;",
                    button {
                        r#type: "button",
                        style: if selected_tab() == DeploymentDiagramTab::HtmlRequestFlow { "padding: 0.45rem 0.95rem; border-radius: var(--radius-sm); border: 1px solid #c084fc; background: rgba(192, 132, 252, 0.15); color: #e9d5ff; font-size: 0.84rem; font-weight: 600; cursor: pointer; transition: all 0.15s ease;" } else { "padding: 0.45rem 0.95rem; border-radius: var(--radius-sm); border: 1px solid var(--border); background: transparent; color: var(--text-secondary); font-size: 0.84rem; font-weight: 400; cursor: pointer; transition: all 0.15s ease;" },
                        onclick: move |_| selected_tab.set(DeploymentDiagramTab::HtmlRequestFlow),
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
                        style: if selected_tab() == DeploymentDiagramTab::DeployPipelineFlow { "padding: 0.45rem 0.95rem; border-radius: var(--radius-sm); border: 1px solid #c084fc; background: rgba(192, 132, 252, 0.15); color: #e9d5ff; font-size: 0.84rem; font-weight: 600; cursor: pointer; transition: all 0.15s ease;" } else { "padding: 0.45rem 0.95rem; border-radius: var(--radius-sm); border: 1px solid var(--border); background: transparent; color: var(--text-secondary); font-size: 0.84rem; font-weight: 400; cursor: pointer; transition: all 0.15s ease;" },
                        onclick: move |_| selected_tab.set(DeploymentDiagramTab::DeployPipelineFlow),
                        {
                            language
                                .label(
                                    "2. CI/CD Deployment Pipeline",
                                    "2. CI/CD デプロイパイプライン",
                                    "2. CI/CD Deploja Dukto",
                                )
                        }
                    }
                }
            }

            // タブ別コンテンツ
            match selected_tab() {
                DeploymentDiagramTab::HtmlRequestFlow => rsx! {
                    HtmlRequestSequenceDiagram { language }
                },
                DeploymentDiagramTab::DeployPipelineFlow => rsx! {
                    DeployPipelineDiagram { language }
                },
            }
        }
    }
}

/// HTML リクエスト・ルーティング・SSR・ハイドレーションのシーケンス図
#[component]
fn HtmlRequestSequenceDiagram(language: Language) -> Element {
    let actor_browser = language.label(
        "Browser / Client",
        "ブラウザ / クライアント",
        "Retumilo / Kliento",
    );
    let actor_proxy = language.label(
        "fly.io Edge Proxy",
        "fly.io エッジプロキシ",
        "fly.io Randa Prokurilo",
    );
    let actor_server = language.label(
        "definy-server (Axum)",
        "definy-server (Axum)",
        "definy-servilo (Axum)",
    );
    let actor_db = language.label(
        "SurrealDB (Events)",
        "SurrealDB (イベント)",
        "SurrealDB (Eventoj)",
    );
    let actor_wasm = language.label(
        "Dioxus WASM App",
        "Dioxus WASM クライアント",
        "Dioxus WASM Kliento",
    );

    rsx! {
        div { style: "display: grid; gap: 1.4rem; width: 100%;",
            p { style: "font-size: 0.88rem; color: var(--text-secondary); margin: 0; line-height: 1.55;",
                {
                    language
                        .label(
                            "Detailed sequence from entering https://definy.fly.dev to initial SSR HTML display and interactive WASM client bootstrap:",
                            "https://definy.fly.dev へのアクセスから、プロキシによるマシン起動、307 言語リダイレクト、SSR HTML レンダリング、そしてブラウザ内 WASM 起動までの流れ:",
                            "Detala sekvenco de aliro al https://definy.fly.dev ĝis SSR HTML kaj WASM:",
                        )
                }
            }

            // SVG シーケンスダイアグラム
            div { style: "background: #090d16; border: 1px solid var(--border); border-radius: var(--radius-md); padding: 1.2rem 0.6rem; overflow-x: auto; width: 100%; box-sizing: border-box;",
                svg {
                    view_box: "0 0 1080 570",
                    style: "width: 100%; min-width: 880px; height: auto; display: block; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13px;",

                    defs {
                        MarkerDef { id: "flow-arrow-blue", color: "#38bdf8" }
                        MarkerDef { id: "flow-arrow-orange", color: "#fb923c" }
                        MarkerDef { id: "flow-arrow-purple", color: "#c084fc" }
                        MarkerDef { id: "flow-arrow-green", color: "#34d399" }
                    }

                    // ライフライン（縦線）
                    Lifeline { x: 100, y_start: 55, y_end: 540 }
                    Lifeline { x: 330, y_start: 55, y_end: 540 }
                    Lifeline { x: 570, y_start: 55, y_end: 540 }
                    Lifeline { x: 800, y_start: 55, y_end: 540 }
                    Lifeline { x: 990, y_start: 55, y_end: 540 }

                    // アクターボックス
                    ActorBox {
                        x: 20,
                        y: 12,
                        width: 160,
                        color: "#38bdf8",
                        border: "#0284c7",
                        title: actor_browser,
                    }
                    ActorBox {
                        x: 250,
                        y: 12,
                        width: 160,
                        color: "#fb923c",
                        border: "#ea580c",
                        title: actor_proxy,
                    }
                    ActorBox {
                        x: 490,
                        y: 12,
                        width: 160,
                        color: "#c084fc",
                        border: "#9333ea",
                        title: actor_server,
                    }
                    ActorBox {
                        x: 720,
                        y: 12,
                        width: 160,
                        color: "#34d399",
                        border: "#059669",
                        title: actor_db,
                    }
                    ActorBox {
                        x: 910,
                        y: 12,
                        width: 160,
                        color: "#60a5fa",
                        border: "#2563eb",
                        title: actor_wasm,
                    }

                    // Step 1: GET https://definy.fly.dev/
                    SequenceArrow {
                        x1: 100,
                        y1: 85,
                        x2: 325,
                        y2: 85,
                        color: "#38bdf8",
                        marker: "flow-arrow-blue",
                        dashed: false,
                        label: "1. GET https://definy.fly.dev/",
                    }

                    // Step 2: Auto-start Machine (if stopped)
                    ActionBox {
                        x: 260,
                        y: 105,
                        width: 140,
                        height: 30,
                        bg: "#1c1917",
                        border: "#fb923c",
                        text_color: "#fdba74",
                        line1: "Starting VM (1~2s)",
                        line2: None,
                    }

                    // Step 3: Forward to Axum (port 8000)
                    SequenceArrow {
                        x1: 330,
                        y1: 155,
                        x2: 565,
                        y2: 155,
                        color: "#38bdf8",
                        marker: "flow-arrow-blue",
                        dashed: false,
                        label: "2. Forward to [::]:8000",
                    }

                    // Step 4: 307 Redirect (Language Resolution)
                    SequenceArrow {
                        x1: 570,
                        y1: 190,
                        x2: 105,
                        y2: 190,
                        color: "#fb923c",
                        marker: "flow-arrow-orange",
                        dashed: true,
                        label: "3. 307 Redirect (location: /?lang=en)",
                    }

                    // Step 5: Follow Redirect: GET /?lang=en
                    SequenceArrow {
                        x1: 100,
                        y1: 230,
                        x2: 565,
                        y2: 230,
                        color: "#38bdf8",
                        marker: "flow-arrow-blue",
                        dashed: false,
                        label: "4. GET /?lang=en",
                    }

                    // Step 6: Query initial events for SSR
                    SequenceArrow {
                        x1: 570,
                        y1: 265,
                        x2: 795,
                        y2: 265,
                        color: "#c084fc",
                        marker: "flow-arrow-purple",
                        dashed: false,
                        label: "5. get_events(limit: 100)",
                    }

                    // Step 7: Return DB records
                    SequenceArrow {
                        x1: 800,
                        y1: 295,
                        x2: 575,
                        y2: 295,
                        color: "#34d399",
                        marker: "flow-arrow-green",
                        dashed: true,
                        label: "6. events data (CBOR bytes)",
                    }

                    // Step 8: Server-Side Rendering (render_inner)
                    ActionBox {
                        x: 500,
                        y: 315,
                        width: 140,
                        height: 30,
                        bg: "#1e1b4b",
                        border: "#c084fc",
                        text_color: "#e9d5ff",
                        line1: "SSR: HTML + SsrState",
                        line2: None,
                    }

                    // Step 9: 200 OK: Complete HTML Response
                    SequenceArrow {
                        x1: 570,
                        y1: 365,
                        x2: 105,
                        y2: 365,
                        color: "#34d399",
                        marker: "flow-arrow-green",
                        dashed: false,
                        label: "7. 200 OK (text/html; charset=utf-8, 787 KB)",
                    }

                    // Step 10: Browser First Render
                    ActionBox {
                        x: 30,
                        y: 385,
                        width: 140,
                        height: 28,
                        bg: "#0f172a",
                        border: "#38bdf8",
                        text_color: "#93c5fd",
                        line1: "FCP: Instant Screen Paint",
                        line2: None,
                    }

                    // Step 11: Fetch Client Assets
                    SequenceArrow {
                        x1: 100,
                        y1: 430,
                        x2: 565,
                        y2: 430,
                        color: "#38bdf8",
                        marker: "flow-arrow-blue",
                        dashed: false,
                        label: "8. GET /assets/definy_client*.js & .wasm",
                    }

                    // Step 12: Return Assets (200 OK)
                    SequenceArrow {
                        x1: 570,
                        y1: 460,
                        x2: 105,
                        y2: 460,
                        color: "#34d399",
                        marker: "flow-arrow-green",
                        dashed: false,
                        label: "9. 200 OK (JS & WASM Bytecode)",
                    }

                    // Step 13: Hydration & SPA Launch
                    SequenceArrow {
                        x1: 100,
                        y1: 495,
                        x2: 985,
                        y2: 495,
                        color: "#60a5fa",
                        marker: "flow-arrow-blue",
                        dashed: false,
                        label: "10. Hydrate with SsrState -> Interactive SPA",
                    }

                    // Step 14: Ready state
                    ActionBox {
                        x: 920,
                        y: 510,
                        width: 140,
                        height: 28,
                        bg: "#1e3a8a",
                        border: "#60a5fa",
                        text_color: "#bfdbfe",
                        line1: "data-client-ready: true",
                        line2: None,
                    }
                }
            }

            // 主要ステップの詳細解説カード
            div { style: "display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 1rem;",
                StepDetailCard {
                    step_number: "Phase A",
                    title: language
                        .label(
                            "Edge Anycast & Auto-Start",
                            "エッジ Anycast & コールドスタート",
                            "Randa Aŭtomata Lanĉo",
                        ),
                    color: "#fb923c",
                    description: language
                        .label(
                            "Fly.io router intercepts incoming requests. If the machine is stopped (0 running machines to save cost), it spins up a Firecracker MicroVM within 1-2 seconds.",
                            "Fly.io のエッジルーターがリクエストを受信。コスト削減のためマシンが stopped の場合、Firecracker MicroVM を 1〜2 秒で瞬時にコールドスタートします。",
                            "Fly.io ekigas MicroVM ene de 1-2 sekundoj se ĝi estas haltigita.",
                        ),
                }
                StepDetailCard {
                    step_number: "Phase B",
                    title: language
                        .label(
                            "307 Redirect & Language Negotiation",
                            "307 リダイレクトと言語判定",
                            "307 Alidirekto kaj Lingvo",
                        ),
                    color: "#f59e0b",
                    description: language
                        .label(
                            "Root '/' requests evaluate Accept-Language headers and query params. If unspecified, it immediately responds with a 307 Temporary Redirect to '/?lang=en'.",
                            "ルート '/' アクセス時、Accept-Language ヘッダーと URL を判定し、言語未決定時は即座に 307 Temporary Redirect（例: /?lang=en）を返して URL を正規化します。",
                            "Normaligas URL per 307 al /?lang=en.",
                        ),
                }
                StepDetailCard {
                    step_number: "Phase C",
                    title: language
                        .label(
                            "SSR & Embedded SsrState",
                            "サーバーサイド描画 & SsrState 埋め込み",
                            "SSR kaj Enkonstruita Stato",
                        ),
                    color: "#c084fc",
                    description: language
                        .label(
                            "Axum queries SurrealDB (or in-memory fallback), renders full semantic HTML via definy_ui::render_inner, and embeds deterministic CBOR into __DEFINY_INITIAL_STATE__.",
                            "Axum が SurrealDB を照会し、definy_ui::render_inner で完全な HTML を生成。初期イベント群を CBOR Base64 形式で HTML 内のスクリプトタグに埋め込みます。",
                            "Generas plenan HTML kaj enkonstruas CBOR-staton.",
                        ),
                }
                StepDetailCard {
                    step_number: "Phase D",
                    title: language
                        .label(
                            "WASM Hydration & Zero-Flicker SPA",
                            "WASM ハイドレーション & ゼロチラつき SPA",
                            "WASM Aktivigo",
                        ),
                    color: "#60a5fa",
                    description: language
                        .label(
                            "Browser renders the server HTML instantly (0ms blank page). Dioxus Web Client fetches Wasm, reads embedded SsrState, and activates reactive listeners seamlessly.",
                            "ブラウザは初期 HTML で即座に画面を表示（白画面なし）。続いて Dioxus WASM をロードし、埋め込み状態から即座にクライアント SPA としてアクティブ化します。",
                            "Tuj montras HTML kaj senprobleme ŝanĝas al interaga WASM-aplikaĵo.",
                        ),
                }
            }
        }
    }
}

/// CI/CD デプロイパイプラインのフロー図
#[component]
fn DeployPipelineDiagram(language: Language) -> Element {
    let actor_git = language.label("Git / Developer", "Git / 開発者", "Git / Programisto");
    let actor_gha = language.label("GitHub Actions", "GitHub Actions", "GitHub Actions");
    let actor_registry = language.label("Fly.io Registry", "Fly.io レジストリ", "Fly.io Registro");
    let actor_machines =
        language.label("Fly.io Machines", "Fly.io Machines (nrt)", "Fly.io Maŝinoj");

    rsx! {
        div { style: "display: grid; gap: 1.4rem; width: 100%;",
            p { style: "font-size: 0.88rem; color: var(--text-secondary); margin: 0; line-height: 1.55;",
                {
                    language
                        .label(
                            "Automated build and zero-downtime deployment pipeline executed upon merging to 'main' branch:",
                            "main ブランチへのマージを契機として実行される自動ビルドおよび Fly.io ロールアウトの流れ:",
                            "Aŭtomata konstruo kaj deplojo post kunfando al la 'main' branĉo:",
                        )
                }
            }

            // SVG パイプライン図
            div { style: "background: #090d16; border: 1px solid var(--border); border-radius: var(--radius-md); padding: 1.2rem 0.6rem; overflow-x: auto; width: 100%; box-sizing: border-box;",
                svg {
                    view_box: "0 0 980 430",
                    style: "width: 100%; min-width: 780px; height: auto; display: block; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13px;",

                    defs {
                        MarkerDef { id: "pipe-arrow-blue", color: "#38bdf8" }
                        MarkerDef { id: "pipe-arrow-green", color: "#34d399" }
                    }

                    // ライフライン
                    Lifeline { x: 120, y_start: 55, y_end: 400 }
                    Lifeline { x: 380, y_start: 55, y_end: 400 }
                    Lifeline { x: 640, y_start: 55, y_end: 400 }
                    Lifeline { x: 880, y_start: 55, y_end: 400 }

                    // アクター
                    ActorBox {
                        x: 30,
                        y: 12,
                        width: 180,
                        color: "#94a3b8",
                        border: "#475569",
                        title: actor_git,
                    }
                    ActorBox {
                        x: 290,
                        y: 12,
                        width: 180,
                        color: "#38bdf8",
                        border: "#0284c7",
                        title: actor_gha,
                    }
                    ActorBox {
                        x: 550,
                        y: 12,
                        width: 180,
                        color: "#c084fc",
                        border: "#9333ea",
                        title: actor_registry,
                    }
                    ActorBox {
                        x: 790,
                        y: 12,
                        width: 180,
                        color: "#34d399",
                        border: "#059669",
                        title: actor_machines,
                    }

                    // Step 1: Push to main
                    SequenceArrow {
                        x1: 120,
                        y1: 85,
                        x2: 375,
                        y2: 85,
                        color: "#38bdf8",
                        marker: "pipe-arrow-blue",
                        dashed: false,
                        label: "1. git push / merge PR -> main",
                    }

                    // Step 2: Build client & server
                    ActionBox {
                        x: 305,
                        y: 105,
                        width: 150,
                        height: 48,
                        bg: "#0c4a6e",
                        border: "#38bdf8",
                        text_color: "#e0f2fe",
                        line1: "dx build --release",
                        line2: Some("cargo build server --release"),
                    }

                    // Step 3: Package Docker image
                    ActionBox {
                        x: 305,
                        y: 168,
                        width: 150,
                        height: 30,
                        bg: "#1e1b4b",
                        border: "#818cf8",
                        text_color: "#e0e7ff",
                        line1: "Dockerfile.flyio-deploy",
                        line2: None,
                    }

                    // Step 4: flyctl deploy -> push image
                    SequenceArrow {
                        x1: 380,
                        y1: 215,
                        x2: 635,
                        y2: 215,
                        color: "#38bdf8",
                        marker: "pipe-arrow-blue",
                        dashed: false,
                        label: "2. flyctl deploy --local-only",
                    }

                    // Step 5: Registry pushes image
                    SequenceArrow {
                        x1: 640,
                        y1: 250,
                        x2: 875,
                        y2: 250,
                        color: "#c084fc",
                        marker: "pipe-arrow-blue",
                        dashed: false,
                        label: "3. Pull Image: definy:deployment-*",
                    }

                    // Step 6: Rollout Machine Version
                    ActionBox {
                        x: 810,
                        y: 270,
                        width: 140,
                        height: 42,
                        bg: "#064e3b",
                        border: "#34d399",
                        text_color: "#a7f3d0",
                        line1: "Rollout v43 -> v44",
                        line2: Some("Health check OK on 8000"),
                    }

                    // Step 7: Deploy Success
                    SequenceArrow {
                        x1: 880,
                        y1: 330,
                        x2: 385,
                        y2: 330,
                        color: "#34d399",
                        marker: "pipe-arrow-green",
                        dashed: true,
                        label: "4. Deployment Finished (Exit Code 0)",
                    }

                    // Step 8: Notify developer / GitHub Status
                    SequenceArrow {
                        x1: 380,
                        y1: 365,
                        x2: 125,
                        y2: 365,
                        color: "#34d399",
                        marker: "pipe-arrow-green",
                        dashed: true,
                        label: "5. GitHub Commit Status: PASS ✓",
                    }
                }
            }

            // CI/CD の解説カード
            div { style: "display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 1rem;",
                StepDetailCard {
                    step_number: "CI Step 1",
                    title: language
                        .label(
                            "Automated Release Build",
                            "リリースビルド自動化",
                            "Aŭtomata Eldona Konstruo",
                        ),
                    color: "#38bdf8",
                    description: language
                        .label(
                            "GitHub Actions runner executes 'dx build --release' (with custom sections preserved) and compiles optimized server binaries.",
                            "GitHub Actions 上で Dioxus CLI による WASM 最適化ビルドと Axum サーバーのリリースコンパイルを並列実行。",
                            "dx build kaj cargo build en GitHub Actions.",
                        ),
                }
                StepDetailCard {
                    step_number: "CI Step 2",
                    title: language
                        .label(
                            "Local-Only Docker Pack",
                            "Docker パッケージング",
                            "Docker Pakado",
                        ),
                    color: "#818cf8",
                    description: language
                        .label(
                            "Bins and static assets are copied into minimal Debian/Rust scratch images, avoiding slow remote Docker daemons.",
                            "生成されたバイナリと WASM/JS アセットを軽量 Docker イメージにまとめ、Fly.io Registry へダイレクトに転送。",
                            "Kopias dosierojn al minimala Docker-bildo.",
                        ),
                }
                StepDetailCard {
                    step_number: "CI Step 3",
                    title: language
                        .label(
                            "Rolling Machine Update",
                            "ゼロダウンタイム更新",
                            "Seninterrompa Ĝisdatigo",
                        ),
                    color: "#34d399",
                    description: language
                        .label(
                            "Fly.io spins up the new version, performs HTTP health checks on port 8000, and switches traffic with zero downtime.",
                            "Fly.io Machines が新バージョン（例: v44）を起動し、ポート 8000 でのヘルスチェック通過後にトラフィックを切り替えます。",
                            "Fly.io ŝanĝas maŝinon post sana kontrolo.",
                        ),
                }
            }
        }
    }
}

#[component]
fn MarkerDef(id: &'static str, color: &'static str) -> Element {
    rsx! {
        marker {
            id: "{id}",
            view_box: "0 0 10 10",
            ref_x: "8",
            ref_y: "5",
            marker_width: "6",
            marker_height: "6",
            orient: "auto-start-reverse",
            path { d: "M 0 1 L 10 5 L 0 9 z", fill: "{color}" }
        }
    }
}

#[component]
fn Lifeline(x: u32, y_start: u32, y_end: u32) -> Element {
    rsx! {
        line {
            x1: "{x}",
            y1: "{y_start}",
            x2: "{x}",
            y2: "{y_end}",
            stroke: "#1e293b",
            stroke_width: "1.5",
            stroke_dasharray: "5 5",
        }
    }
}

#[component]
fn ActorBox(
    x: u32,
    y: u32,
    width: u32,
    color: &'static str,
    border: &'static str,
    title: &'static str,
) -> Element {
    let center_x = x + width / 2;
    rsx! {
        rect {
            x: "{x}",
            y: "{y}",
            width: "{width}",
            height: "38",
            rx: "8",
            fill: "#0f172a",
            stroke: "{border}",
            stroke_width: "1.8",
        }
        text {
            x: "{center_x}",
            y: "35",
            fill: "{color}",
            font_weight: "bold",
            font_size: "13px",
            text_anchor: "middle",
            "{title}"
        }
    }
}

#[component]
fn SequenceArrow(
    x1: u32,
    y1: u32,
    x2: u32,
    y2: u32,
    color: &'static str,
    marker: &'static str,
    dashed: bool,
    label: &'static str,
) -> Element {
    let center_x = (x1 + x2) / 2;
    let label_y = y1 - 7;
    rsx! {
        line {
            x1: "{x1}",
            y1: "{y1}",
            x2: "{x2}",
            y2: "{y2}",
            stroke: "{color}",
            stroke_width: "2",
            stroke_dasharray: if dashed { "4 3" } else { "none" },
            marker_end: "url(#{marker})",
        }
        text {
            x: "{center_x}",
            y: "{label_y}",
            fill: "{color}",
            text_anchor: "middle",
            font_weight: "600",
            "{label}"
        }
    }
}

#[component]
fn ActionBox(
    x: u32,
    y: u32,
    width: u32,
    height: u32,
    bg: &'static str,
    border: &'static str,
    text_color: &'static str,
    line1: &'static str,
    line2: Option<&'static str>,
) -> Element {
    let center_x = x + width / 2;
    match line2 {
        Some(second) => {
            let y1 = y + 19;
            let y2 = y + 36;
            rsx! {
                rect {
                    x: "{x}",
                    y: "{y}",
                    width: "{width}",
                    height: "{height}",
                    rx: "6",
                    fill: "{bg}",
                    stroke: "{border}",
                    stroke_width: "1",
                }
                text {
                    x: "{center_x}",
                    y: "{y1}",
                    fill: "{text_color}",
                    text_anchor: "middle",
                    font_size: "11px",
                    font_weight: "600",
                    "{line1}"
                }
                text {
                    x: "{center_x}",
                    y: "{y2}",
                    fill: "{text_color}",
                    text_anchor: "middle",
                    font_size: "10.5px",
                    "{second}"
                }
            }
        }
        None => {
            let y_pos = y + height / 2 + 4;
            rsx! {
                rect {
                    x: "{x}",
                    y: "{y}",
                    width: "{width}",
                    height: "{height}",
                    rx: "6",
                    fill: "{bg}",
                    stroke: "{border}",
                    stroke_width: "1",
                }
                text {
                    x: "{center_x}",
                    y: "{y_pos}",
                    fill: "{text_color}",
                    text_anchor: "middle",
                    font_size: "11px",
                    "{line1}"
                }
            }
        }
    }
}

#[component]
fn StepDetailCard(
    step_number: &'static str,
    title: &'static str,
    color: &'static str,
    description: &'static str,
) -> Element {
    rsx! {
        div {
            class: "event-detail-card",
            style: "background: rgba(255, 255, 255, 0.02); border: 1px solid var(--border); border-radius: var(--radius-md); padding: 1rem 1.1rem; display: flex; flex-direction: column; gap: 0.45rem;",
            div { style: "display: flex; align-items: center; justify-content: space-between;",
                span { style: "font-size: 0.72rem; font-weight: 700; text-transform: uppercase; color: {color}; letter-spacing: 0.05em;",
                    "{step_number}"
                }
            }
            h3 { style: "font-size: 0.95rem; font-weight: 700; margin: 0; color: var(--text-primary);",
                "{title}"
            }
            p { style: "font-size: 0.82rem; color: var(--text-secondary); margin: 0; line-height: 1.5;",
                "{description}"
            }
        }
    }
}
