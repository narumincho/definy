use dioxus::prelude::*;

use super::common::*;
use crate::language::Language;

/// Fly.io から Fly.io への自己デプロイ（運用ブートストラップ）シーケンス図
#[component]
pub fn SelfDeploySequenceDiagram(language: Language) -> Element {
    let actor_user = language.label(
        "User / Client",
        "ユーザー / クライアント",
        "Uzanto / Kliento",
    );
    let actor_parent = language.label(
        "Parent definy-server",
        "親 definy-server (Fly.io)",
        "Gepatra definy-servilo",
    );
    let actor_db = language.label("SurrealDB", "SurrealDB (履歴)", "SurrealDB");
    let actor_fly = language.label(
        "fly.io Machines REST",
        "fly.io Machines REST API",
        "fly.io Machines REST API",
    );
    let actor_child = language.label(
        "Child definy-server",
        "子 definy-server (新世代VM)",
        "Ida definy-servilo",
    );

    rsx! {
        div { style: "display: grid; gap: 1.4rem; width: 100%;",
            p { style: "font-size: 0.88rem; color: var(--text-secondary); margin: 0; line-height: 1.55;",
                {
                    language
                        .label(
                            "Autonomous operational lifecycle where definy-server provisions, bootstraps, and delegates traffic to next-generation instances on fly.io without local CLI tools:",
                            "ターミナルや外部 CI に依存せず、稼働中の definy サーバー自身が fly.io Machines REST API を直接呼び出して次世代の子インスタンスを起動・配信する完全な自己複製（運用ブートストラップ）の通信シーケンス:",
                            "Memstara vivociklo kie definy mem provizas kaj delegas sekvajn instancojn en fly.io:",
                        )
                }
            }

            // SVG 自己デプロイ図
            div { style: "background: #090d16; border: 1px solid var(--border); border-radius: var(--radius-md); padding: 1.2rem 0.6rem; overflow-x: auto; width: 100%; box-sizing: border-box;",
                svg {
                    view_box: "0 0 1080 540",
                    style: "width: 100%; min-width: 880px; height: auto; display: block; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13px;",

                    defs {
                        MarkerDef { id: "self-arrow-blue", color: "#38bdf8" }
                        MarkerDef { id: "self-arrow-purple", color: "#c084fc" }
                        MarkerDef { id: "self-arrow-orange", color: "#fb923c" }
                        MarkerDef { id: "self-arrow-green", color: "#34d399" }
                    }

                    // ライフライン（縦線）
                    Lifeline { x: 105, y_start: 55, y_end: 510 }
                    Lifeline { x: 320, y_start: 55, y_end: 510 }
                    Lifeline { x: 535, y_start: 55, y_end: 510 }
                    Lifeline { x: 750, y_start: 55, y_end: 510 }
                    Lifeline { x: 970, y_start: 55, y_end: 510 }

                    // アクターボックス
                    ActorBox {
                        x: 20,
                        y: 12,
                        width: 170,
                        color: "#94a3b8",
                        border: "#475569",
                        title: actor_user,
                    }
                    ActorBox {
                        x: 230,
                        y: 12,
                        width: 180,
                        color: "#38bdf8",
                        border: "#0284c7",
                        title: actor_parent,
                    }
                    ActorBox {
                        x: 450,
                        y: 12,
                        width: 170,
                        color: "#c084fc",
                        border: "#9333ea",
                        title: actor_db,
                    }
                    ActorBox {
                        x: 660,
                        y: 12,
                        width: 180,
                        color: "#fb923c",
                        border: "#ea580c",
                        title: actor_fly,
                    }
                    ActorBox {
                        x: 880,
                        y: 12,
                        width: 180,
                        color: "#34d399",
                        border: "#059669",
                        title: actor_child,
                    }

                    // Step 1: DeployInstance RPC
                    SequenceArrow {
                        x1: 105,
                        y1: 85,
                        x2: 315,
                        y2: 85,
                        color: "#38bdf8",
                        marker: "self-arrow-blue",
                        dashed: false,
                        label: "1. DeployInstance(wasm_hash, region: 'nrt')",
                    }

                    // Step 2: Record pending status in SurrealDB
                    SequenceArrow {
                        x1: 320,
                        y1: 125,
                        x2: 530,
                        y2: 125,
                        color: "#c084fc",
                        marker: "self-arrow-purple",
                        dashed: false,
                        label: "2. Record deployment pending in DB",
                    }

                    // Step 3: Call fly.io Machines REST API with directly injected Wasm file
                    SequenceArrow {
                        x1: 320,
                        y1: 170,
                        x2: 745,
                        y2: 170,
                        color: "#fb923c",
                        marker: "self-arrow-orange",
                        dashed: false,
                        label: "3. REST POST /machines (config.files: Base64 injected Wasm)",
                    }

                    // Machine creation with direct injection
                    ActionBox {
                        x: 670,
                        y: 195,
                        width: 160,
                        height: 38,
                        bg: "#1c1917",
                        border: "#fb923c",
                        text_color: "#fdba74",
                        line1: "Direct File Injection",
                        line2: Some("guest_path: /app/definy_core.wasm"),
                    }

                    // Step 4: Machine Created (201 Created)
                    SequenceArrow {
                        x1: 750,
                        y1: 250,
                        x2: 325,
                        y2: 250,
                        color: "#fb923c",
                        marker: "self-arrow-orange",
                        dashed: true,
                        label: "4. 201 Created (MicroVM configured with Wasm on disk)",
                    }

                    // Step 5: Save container URL to SurrealDB
                    SequenceArrow {
                        x1: 320,
                        y1: 290,
                        x2: 530,
                        y2: 290,
                        color: "#c084fc",
                        marker: "self-arrow-purple",
                        dashed: false,
                        label: "5. Save URL to deployments table",
                    }

                    // Child VM boots directly from local injected file (No HTTP fetch required!)
                    ActionBox {
                        x: 885,
                        y: 325,
                        width: 170,
                        height: 42,
                        bg: "#064e3b",
                        border: "#34d399",
                        text_color: "#a7f3d0",
                        line1: "wasmtime serve (Local Disk)",
                        line2: Some("Zero Parent Fetch Dependency"),
                    }

                    // Step 6: Return child URL to client
                    SequenceArrow {
                        x1: 320,
                        y1: 395,
                        x2: 110,
                        y2: 395,
                        color: "#34d399",
                        marker: "self-arrow-green",
                        dashed: true,
                        label: "6. Deploy OK: https://definy-<id>.fly.dev",
                    }

                    // Step 7: User visits next-generation instance
                    SequenceArrow {
                        x1: 105,
                        y1: 445,
                        x2: 965,
                        y2: 445,
                        color: "#38bdf8",
                        marker: "self-arrow-blue",
                        dashed: false,
                        label: "7. Access Next-Gen definy instance (Generational Shift) ★",
                    }
                }
            }

            // ブートストラップ4階層の解説カード
            div { style: "display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 1rem;",
                StepDetailCard {
                    step_number: "Layer 1: 運用層",
                    title: language
                        .label(
                            "Operational Bootstrapping",
                            "運用層の自己完結 (Fly.io to Fly.io)",
                            "Operacia Memgastigo",
                        ),
                    color: "#38bdf8",
                    description: language
                        .label(
                            "definy-server itself calls fly.io Machines REST API, spawning new microVM instances on demand without local developer terminals or external CI.",
                            "稼働中の definy サーバー自身が fly.io Machines REST API を呼び出し、外部 CI やローカル端末に依存せずオンデマンドで新世代 VM を起動・案内。",
                            "definy mem vokas fly.io Machines REST API sen lokaj komandlinioj.",
                        ),
                }
                StepDetailCard {
                    step_number: "Layer 2: ビルド・注入層",
                    title: language
                        .label(
                            "Direct Bytecode Injection",
                            "デプロイ時直接注入 (親依存ゼロ起動)",
                            "Rekta Bajtokoda Injekto",
                        ),
                    color: "#a855f7",
                    description: language
                        .label(
                            "Instead of slow Docker builds or runtime HTTP fetching, Fly.io's 'config.files' directly writes the Wasm binary into '/app/definy_core.wasm', achieving immediate autonomous startup.",
                            "重い Docker ビルドや起動時の HTTP フェッチを全廃。Fly.io の 'config.files' で Wasm バイナリをゲストディスク (/app/definy_core.wasm) へ直接注入し、親サーバー依存なしで即座に自律起動。",
                            "Rekte injektas Wasm-dosieron per 'config.files' sen bezono de HTTP-elŝuto dum lanĉo.",
                        ),
                }
                StepDetailCard {
                    step_number: "Layer 3: I/O層",
                    title: language
                        .label(
                            "Capability I/O Runtime",
                            "WASI 0.3 による自己記述 (能力注入)",
                            "WASI 0.3 Kapabla Rultempo",
                        ),
                    color: "#fb923c",
                    description: language
                        .label(
                            "HTTP handlers and fly.io deployment requests expressed as pure definy expression parts via WASI 0.3 Capability Dependency Injection.",
                            "Fly.io Machines API 呼び出しや HTTP ハンドラ自体を、WASI 0.3 の能力注入 (wasi:http) として definy 言語内の純粋な式・パーツとして記述。",
                            "API-vokoj priskribitaj per definy-esprimoj kaj WASI 0.3 kapabloj.",
                        ),
                }
                StepDetailCard {
                    step_number: "Goal: 完全自己表現",
                    title: language
                        .label(
                            "Full Self-Hosting Loop",
                            "definy で definy を表現する閉ループ",
                            "Plena Mempriskriba Buklo",
                        ),
                    color: "#34d399",
                    description: language
                        .label(
                            "When the UI, compiler, and deployment runtime are all expressed as definy parts, definy achieves complete self-hosting: creating and deploying itself eternally.",
                            "UI・コンパイラ・HTTP・デプロイ機構のすべてが definy 言語のパーツとして記述された時、definy が自分自身を定義し永続的に世代交代する完全な自己表現が完結します。",
                            "Kiam ĉio estas priskribita per definy-partoj, la kompleta memgastigo estas atingita.",
                        ),
                }
            }
        }
    }
}
