use dioxus::prelude::*;

use super::common::*;
use crate::language::Language;

/// HTML リクエスト・ルーティング・SSR・ハイドレーションのシーケンス図
#[component]
pub fn HtmlRequestSequenceDiagram(language: Language) -> Element {
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
