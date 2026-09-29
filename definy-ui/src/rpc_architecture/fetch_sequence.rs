use dioxus::prelude::*;

use crate::language::Language;

#[component]
pub fn FetchSequenceDiagram(language: Language) -> Element {
    rsx! {
        div { style: "display: grid; gap: 1rem;",
            p { style: "font-size: 0.86rem; color: var(--text-secondary); margin: 0; line-height: 1.5;",
                {
                    language
                        .label(
                            "Sequence of fetching events via Connect-RPC, storing into IndexedDB, and zero-trust verification on client:",
                            "Connect-RPC によるイベント取得、IndexedDB キャッシュ、クライアント側ゼロトラスト署名検証・AST レンダリングのシーケンス:",
                            "Sekvenco de evento-akiro per Connect-RPC kaj nulfida kontrolo:",
                        )
                }
            }

            // SVG シーケンス図
            div { style: "background: #090d16; border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 1rem; overflow-x: auto; display: flex; justify-content: center;",
                svg {
                    view_box: "0 0 860 440",
                    style: "width: 100%; height: auto; max-width: 860px; font-family: ui-monospace, monospace; font-size: 11px;",

                    defs {
                        marker {
                            id: "arrow-blue2",
                            view_box: "0 0 10 10",
                            ref_x: "8",
                            ref_y: "5",
                            marker_width: "6",
                            marker_height: "6",
                            orient: "auto-start-reverse",
                            path { d: "M 0 1 L 10 5 L 0 9 z", fill: "#38bdf8" }
                        }
                        marker {
                            id: "arrow-green2",
                            view_box: "0 0 10 10",
                            ref_x: "8",
                            ref_y: "5",
                            marker_width: "6",
                            marker_height: "6",
                            orient: "auto-start-reverse",
                            path { d: "M 0 1 L 10 5 L 0 9 z", fill: "#34d399" }
                        }
                        marker {
                            id: "arrow-purple2",
                            view_box: "0 0 10 10",
                            ref_x: "8",
                            ref_y: "5",
                            marker_width: "6",
                            marker_height: "6",
                            orient: "auto-start-reverse",
                            path { d: "M 0 1 L 10 5 L 0 9 z", fill: "#a78bfa" }
                        }
                    }

                    // アクターライン
                    line {
                        x1: "100",
                        y1: "55",
                        x2: "100",
                        y2: "410",
                        stroke: "#334155",
                        stroke_dasharray: "4 4",
                    }
                    line {
                        x1: "280",
                        y1: "55",
                        x2: "280",
                        y2: "410",
                        stroke: "#334155",
                        stroke_dasharray: "4 4",
                    }
                    line {
                        x1: "460",
                        y1: "55",
                        x2: "460",
                        y2: "410",
                        stroke: "#334155",
                        stroke_dasharray: "4 4",
                    }
                    line {
                        x1: "640",
                        y1: "55",
                        x2: "640",
                        y2: "410",
                        stroke: "#334155",
                        stroke_dasharray: "4 4",
                    }
                    line {
                        x1: "780",
                        y1: "55",
                        x2: "780",
                        y2: "410",
                        stroke: "#334155",
                        stroke_dasharray: "4 4",
                    }

                    // アクターボックス
                    rect {
                        x: "35",
                        y: "15",
                        width: "130",
                        height: "36",
                        rx: "6",
                        fill: "#1e293b",
                        stroke: "#3b82f6",
                        stroke_width: "1.5",
                    }
                    text {
                        x: "100",
                        y: "37",
                        fill: "#93c5fd",
                        font_weight: "bold",
                        text_anchor: "middle",
                        "Browser Screen"
                    }

                    rect {
                        x: "215",
                        y: "15",
                        width: "130",
                        height: "36",
                        rx: "6",
                        fill: "#1e293b",
                        stroke: "#8b5cf6",
                        stroke_width: "1.5",
                    }
                    text {
                        x: "280",
                        y: "37",
                        fill: "#c4b5fd",
                        font_weight: "bold",
                        text_anchor: "middle",
                        "definy-ui (WASM)"
                    }

                    rect {
                        x: "405",
                        y: "15",
                        width: "110",
                        height: "36",
                        rx: "6",
                        fill: "#1e293b",
                        stroke: "#f59e0b",
                        stroke_width: "1.5",
                    }
                    text {
                        x: "460",
                        y: "37",
                        fill: "#fcd34d",
                        font_weight: "bold",
                        text_anchor: "middle",
                        "IndexedDB"
                    }

                    rect {
                        x: "570",
                        y: "15",
                        width: "140",
                        height: "36",
                        rx: "6",
                        fill: "#1e293b",
                        stroke: "#10b981",
                        stroke_width: "1.5",
                    }
                    text {
                        x: "640",
                        y: "37",
                        fill: "#6ee7b7",
                        font_weight: "bold",
                        text_anchor: "middle",
                        "definy-server (Axum)"
                    }

                    rect {
                        x: "725",
                        y: "15",
                        width: "110",
                        height: "36",
                        rx: "6",
                        fill: "#1e293b",
                        stroke: "#ec4899",
                        stroke_width: "1.5",
                    }
                    text {
                        x: "780",
                        y: "37",
                        fill: "#f472b6",
                        font_weight: "bold",
                        text_anchor: "middle",
                        "SurrealDB"
                    }

                    // ステップ 1: ページナビゲーション
                    line {
                        x1: "100",
                        y1: "80",
                        x2: "275",
                        y2: "80",
                        stroke: "#38bdf8",
                        stroke_width: "1.5",
                        marker_end: "url(#arrow-blue2)",
                    }
                    text {
                        x: "190",
                        y: "73",
                        fill: "#38bdf8",
                        text_anchor: "middle",
                        "1. Open /api or Module/Event View"
                    }

                    // ステップ 2: Connect-RPC GetEvents
                    line {
                        x1: "280",
                        y1: "115",
                        x2: "635",
                        y2: "115",
                        stroke: "#38bdf8",
                        stroke_width: "2",
                        marker_end: "url(#arrow-blue2)",
                    }
                    rect {
                        x: "320",
                        y: "98",
                        width: "275",
                        height: "18",
                        rx: "3",
                        fill: "rgba(15, 23, 42, 0.9)",
                        stroke: "#0284c7",
                    }
                    text {
                        x: "457",
                        y: "111",
                        fill: "#38bdf8",
                        font_weight: "bold",
                        text_anchor: "middle",
                        "2. POST /definy.v1.EventService/GetEvents"
                    }
                    text {
                        x: "457",
                        y: "130",
                        fill: "#94a3b8",
                        font_size: "9.5px",
                        text_anchor: "middle",
                        {"Request: { event_type: \"...\", limit: 10 }"}
                    }

                    // ステップ 3: データベース問い合わせ
                    line {
                        x1: "640",
                        y1: "150",
                        x2: "775",
                        y2: "150",
                        stroke: "#ec4899",
                        stroke_width: "1.5",
                        marker_end: "url(#arrow-purple2)",
                    }
                    text {
                        x: "710",
                        y: "143",
                        fill: "#f472b6",
                        text_anchor: "middle",
                        "3. get_events(limit, offset)"
                    }

                    // ステップ 4: データベース応答
                    line {
                        x1: "780",
                        y1: "180",
                        x2: "645",
                        y2: "180",
                        stroke: "#ec4899",
                        stroke_width: "1.5",
                        stroke_dasharray: "4 4",
                        marker_end: "url(#arrow-purple2)",
                    }
                    text {
                        x: "710",
                        y: "173",
                        fill: "#f472b6",
                        text_anchor: "middle",
                        "4. Event records + raw bytes"
                    }

                    // ステップ 5: Connect-RPC レスポンス
                    line {
                        x1: "640",
                        y1: "215",
                        x2: "285",
                        y2: "215",
                        stroke: "#34d399",
                        stroke_width: "1.8",
                        stroke_dasharray: "4 4",
                        marker_end: "url(#arrow-green2)",
                    }
                    text {
                        x: "460",
                        y: "208",
                        fill: "#34d399",
                        font_weight: "bold",
                        text_anchor: "middle",
                        {"5. 200 OK: GetEventsResponse { events: [EventItem] }"}
                    }
                    text {
                        x: "460",
                        y: "228",
                        fill: "#94a3b8",
                        font_size: "9.5px",
                        text_anchor: "middle",
                        "Each Item has signed_event_bytes (Base64)"
                    }

                    // ステップ 6: IndexedDB キャッシュ保存
                    line {
                        x1: "280",
                        y1: "255",
                        x2: "455",
                        y2: "255",
                        stroke: "#f59e0b",
                        stroke_width: "1.5",
                        marker_end: "url(#arrow-purple2)",
                    }
                    text {
                        x: "370",
                        y: "248",
                        fill: "#fcd34d",
                        text_anchor: "middle",
                        "6. store_events(&bytes)"
                    }

                    // ステップ 7: クライアント側ゼロトラスト検証
                    path {
                        d: "M 280 280 H 340 V 305 H 285",
                        fill: "none",
                        stroke: "#a78bfa",
                        stroke_width: "1.5",
                        marker_end: "url(#arrow-purple2)",
                    }
                    text {
                        x: "348",
                        y: "290",
                        fill: "#c4b5fd",
                        text_anchor: "start",
                        "7. verify_and_deserialize(&bytes)"
                    }
                    text {
                        x: "348",
                        y: "303",
                        fill: "#94a3b8",
                        font_size: "9.5px",
                        text_anchor: "start",
                        "Verify Ed25519 signature & compute EventHash"
                    }

                    // ステップ 8: AST・パーツ・型のパース
                    path {
                        d: "M 280 325 H 340 V 350 H 285",
                        fill: "none",
                        stroke: "#a78bfa",
                        stroke_width: "1.5",
                        marker_end: "url(#arrow-purple2)",
                    }
                    text {
                        x: "348",
                        y: "335",
                        fill: "#c4b5fd",
                        text_anchor: "start",
                        "8. Decode AST & compute ContentHash"
                    }
                    text {
                        x: "348",
                        y: "348",
                        fill: "#94a3b8",
                        font_size: "9.5px",
                        text_anchor: "start",
                        "Lock function ASTs with content hashes"
                    }

                    // ステップ 9: リアクティブ描画
                    line {
                        x1: "280",
                        y1: "380",
                        x2: "105",
                        y2: "380",
                        stroke: "#38bdf8",
                        stroke_width: "1.5",
                        stroke_dasharray: "4 4",
                        marker_end: "url(#arrow-blue2)",
                    }
                    text {
                        x: "190",
                        y: "373",
                        fill: "#38bdf8",
                        text_anchor: "middle",
                        "9. Render Verified Events, AST, and Types"
                    }
                }
            }

            // 説明注記
            div { style: "display: grid; gap: 0.5rem; font-size: 0.82rem; color: var(--text-secondary); background: rgba(0,0,0,0.15); padding: 0.8rem 1rem; border-radius: var(--radius-sm); border-left: 3px solid #10b981;",
                div { style: "font-weight: 600; color: var(--text-primary);",
                    {
                        language
                            .label(
                                "Why Zero-Trust Client Verification Matters:",
                                "なぜクライアント側のゼロトラスト検証が重要か:",
                                "Kial Nulfida Klienta Kontrolo Gravas:",
                            )
                    }
                }
                div {
                    {
                        language
                            .label(
                                "Even if a malicious server alters an event or database record, the client's WebAssembly code independently verifies the Ed25519 signature in Step 7. Tampered events are instantly flagged as invalid before being rendered.",
                                "万が一サーバーやデータベースが攻撃者によって改ざんされた場合でも、Step 7 でクライアント（WebAssembly）が Ed25519 署名を独立検証するため、不正データは即座に弾かれ、改ざんされたコードが実行・表示されることはありません。",
                                "Eĉ se la servilo estas modifita, la kliento ĉiam kontrolas la subskribon en Paŝo 7.",
                            )
                    }
                }
            }
        }
    }
}
