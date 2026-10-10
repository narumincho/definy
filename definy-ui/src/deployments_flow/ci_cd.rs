use dioxus::prelude::*;

use super::common::*;
use crate::language::Language;

/// CI/CD デプロイパイプラインのフロー図
#[component]
pub fn DeployPipelineDiagram(language: Language) -> Element {
    let actor_git = language.label("Git / Developer", "Git / 開発者", "Git / Programisto");
    let actor_gha = language.label("GitHub Actions", "GitHub Actions", "GitHub Actions");
    let actor_registry = language.label(
        "Cloudflare API v4",
        "Cloudflare API v4",
        "Cloudflare API v4",
    );
    let actor_machines = language.label(
        "Cloudflare Workers Edge",
        "Cloudflare Workers (Edge)",
        "Cloudflare Workers Rando",
    );

    rsx! {
        div { style: "display: grid; gap: 1.4rem; width: 100%;",
            p { style: "font-size: 0.88rem; color: var(--text-secondary); margin: 0; line-height: 1.55;",
                {
                    language
                        .label(
                            "Automated build and zero-downtime deployment pipeline executed upon merging to 'main' branch:",
                            "main ブランチへのマージを契機として実行される自動ビルドおよび Cloudflare Workers ロールアウトの流れ:",
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

                    // Step 2: Build client & seed bundle
                    ActionBox {
                        x: 305,
                        y: 105,
                        width: 150,
                        height: 48,
                        bg: "#0c4a6e",
                        border: "#38bdf8",
                        text_color: "#e0f2fe",
                        line1: "dx build --release",
                        line2: Some("--export-seed-bundle"),
                    }

                    // Step 3: Package dist-assets
                    ActionBox {
                        x: 305,
                        y: 168,
                        width: 150,
                        height: 30,
                        bg: "#1e1b4b",
                        border: "#818cf8",
                        text_color: "#e0e7ff",
                        line1: "scripts/build-assets.sh",
                        line2: None,
                    }

                    // Step 4: wrangler deploy
                    SequenceArrow {
                        x1: 380,
                        y1: 215,
                        x2: 635,
                        y2: 215,
                        color: "#38bdf8",
                        marker: "pipe-arrow-blue",
                        dashed: false,
                        label: "2. wrangler deploy",
                    }

                    // Step 5: Propagate Worker + Static Assets
                    SequenceArrow {
                        x1: 640,
                        y1: 250,
                        x2: 875,
                        y2: 250,
                        color: "#c084fc",
                        marker: "pipe-arrow-blue",
                        dashed: false,
                        label: "3. Upload Worker + Static Assets",
                    }

                    // Step 6: Global Edge Activation
                    ActionBox {
                        x: 810,
                        y: 270,
                        width: 140,
                        height: 42,
                        bg: "#064e3b",
                        border: "#34d399",
                        text_color: "#a7f3d0",
                        line1: "Global Edge Rollout",
                        line2: Some("Health check /healthz OK"),
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
                            "GitHub Actions runner executes 'dx build --release' (with custom sections preserved) and exports the deterministic builtin seed bundle.",
                            "GitHub Actions 上で Dioxus CLI による WASM 最適化ビルドと組み込みシードバンドル出力を実行。",
                            "dx build kaj eksporto de sem-pako en GitHub Actions.",
                        ),
                }
                StepDetailCard {
                    step_number: "CI Step 2",
                    title: language
                        .label(
                            "Static Assets & Seed Bundle",
                            "Static Assets & シードパッケージング",
                            "Statikaj Aktivaĵoj Pakado",
                        ),
                    color: "#818cf8",
                    description: language
                        .label(
                            "WASM/JS assets, headers, and signed builtin seed bundle are assembled into dist-assets/ and uploaded via Wrangler.",
                            "生成された WASM/JS アセットと署名済みシードデータを dist-assets/ にまとめ、Wrangler で Cloudflare へダイレクトにアップロード。",
                            "Kunmetas aktivaĵojn kaj alŝutas per Wrangler.",
                        ),
                }
                StepDetailCard {
                    step_number: "CI Step 3",
                    title: language
                        .label(
                            "Global Edge Activation",
                            "グローバルエッジ即時反映",
                            "Tutmonda Randa Aktivigo",
                        ),
                    color: "#34d399",
                    description: language
                        .label(
                            "Cloudflare Workers distributes the new Worker version and Static Assets across 300+ global edge locations with zero downtime.",
                            "Cloudflare Workers が世界中のエッジ拠点へ新バージョンと Static Assets を展開し、ゼロダウンタイムでトラフィックを切り替えます。",
                            "Cloudflare Workers distribuas la novan version tutmonde sen interrompo.",
                        ),
                }
            }
        }
    }
}
