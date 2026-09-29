use dioxus::prelude::*;

use crate::language::Language;

#[component]
pub fn SubmitSequenceDiagram(language: Language) -> Element {
    rsx! {
        div { style: "display: grid; gap: 1rem;",
            p { style: "font-size: 0.86rem; color: var(--text-secondary); margin: 0; line-height: 1.5;",
                {
                    language
                        .label(
                            "Sequence of creating, deterministically encoding, signing, caching, and submitting an event:",
                            "イベントの作成、決定論的 CBOR エンコード、Ed25519 署名、IndexedDB キャッシュ、Connect-RPC 送信の一連のシーケンス:",
                            "Sekvenco de kreado, determina kodigo, subskribo, kaŝmemoro, kaj sendo de evento:",
                        )
                }
            }

            // SVG シーケンス図
            div { style: "background: #090d16; border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 1rem; overflow-x: auto; display: flex; justify-content: center;",
                svg {
                    view_box: "0 0 860 480",
                    style: "width: 100%; height: auto; max-width: 860px; font-family: ui-monospace, monospace; font-size: 11px;",

                    defs {
                        marker {
                            id: "arrow-blue",
                            view_box: "0 0 10 10",
                            ref_x: "8",
                            ref_y: "5",
                            marker_width: "6",
                            marker_height: "6",
                            orient: "auto-start-reverse",
                            path { d: "M 0 1 L 10 5 L 0 9 z", fill: "#38bdf8" }
                        }
                        marker {
                            id: "arrow-green",
                            view_box: "0 0 10 10",
                            ref_x: "8",
                            ref_y: "5",
                            marker_width: "6",
                            marker_height: "6",
                            orient: "auto-start-reverse",
                            path { d: "M 0 1 L 10 5 L 0 9 z", fill: "#34d399" }
                        }
                        marker {
                            id: "arrow-purple",
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
                        x1: "90",
                        y1: "55",
                        x2: "90",
                        y2: "450",
                        stroke: "#334155",
                        stroke_dasharray: "4 4",
                    }
                    line {
                        x1: "270",
                        y1: "55",
                        x2: "270",
                        y2: "450",
                        stroke: "#334155",
                        stroke_dasharray: "4 4",
                    }
                    line {
                        x1: "450",
                        y1: "55",
                        x2: "450",
                        y2: "450",
                        stroke: "#334155",
                        stroke_dasharray: "4 4",
                    }
                    line {
                        x1: "630",
                        y1: "55",
                        x2: "630",
                        y2: "450",
                        stroke: "#334155",
                        stroke_dasharray: "4 4",
                    }
                    line {
                        x1: "780",
                        y1: "55",
                        x2: "780",
                        y2: "450",
                        stroke: "#334155",
                        stroke_dasharray: "4 4",
                    }

                    // アクターボックス
                    rect {
                        x: "25",
                        y: "15",
                        width: "130",
                        height: "36",
                        rx: "6",
                        fill: "#1e293b",
                        stroke: "#3b82f6",
                        stroke_width: "1.5",
                    }
                    text {
                        x: "90",
                        y: "37",
                        fill: "#93c5fd",
                        font_weight: "bold",
                        text_anchor: "middle",
                        "User / UI"
                    }

                    rect {
                        x: "205",
                        y: "15",
                        width: "130",
                        height: "36",
                        rx: "6",
                        fill: "#1e293b",
                        stroke: "#8b5cf6",
                        stroke_width: "1.5",
                    }
                    text {
                        x: "270",
                        y: "37",
                        fill: "#c4b5fd",
                        font_weight: "bold",
                        text_anchor: "middle",
                        "definy-ui (WASM)"
                    }

                    rect {
                        x: "395",
                        y: "15",
                        width: "110",
                        height: "36",
                        rx: "6",
                        fill: "#1e293b",
                        stroke: "#f59e0b",
                        stroke_width: "1.5",
                    }
                    text {
                        x: "450",
                        y: "37",
                        fill: "#fcd34d",
                        font_weight: "bold",
                        text_anchor: "middle",
                        "IndexedDB"
                    }

                    rect {
                        x: "560",
                        y: "15",
                        width: "140",
                        height: "36",
                        rx: "6",
                        fill: "#1e293b",
                        stroke: "#10b981",
                        stroke_width: "1.5",
                    }
                    text {
                        x: "630",
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

                    // ステップ 1: ユーザー操作
                    line {
                        x1: "90",
                        y1: "80",
                        x2: "265",
                        y2: "80",
                        stroke: "#38bdf8",
                        stroke_width: "1.5",
                        marker_end: "url(#arrow-blue)",
                    }
                    text {
                        x: "180",
                        y: "73",
                        fill: "#38bdf8",
                        text_anchor: "middle",
                        "1. Edit Module / Parts & Click Submit"
                    }

                    // ステップ 2: AST構築と決定論的CBORシリアライズ
                    path {
                        d: "M 270 100 H 330 V 125 H 275",
                        fill: "none",
                        stroke: "#a78bfa",
                        stroke_width: "1.5",
                        marker_end: "url(#arrow-purple)",
                    }
                    text {
                        x: "338",
                        y: "110",
                        fill: "#c4b5fd",
                        text_anchor: "start",
                        "2. Build AST & Deterministic CBOR (RFC 8949)"
                    }
                    text {
                        x: "338",
                        y: "123",
                        fill: "#94a3b8",
                        font_size: "9.5px",
                        text_anchor: "start",
                        "Canonical key sort, IEEE 754 float norm"
                    }

                    // ステップ 3: Ed25519 署名
                    path {
                        d: "M 270 145 H 330 V 170 H 275",
                        fill: "none",
                        stroke: "#a78bfa",
                        stroke_width: "1.5",
                        marker_end: "url(#arrow-purple)",
                    }
                    text {
                        x: "338",
                        y: "155",
                        fill: "#c4b5fd",
                        text_anchor: "start",
                        "3. Local Ed25519 Sign with SecretKey"
                    }
                    text {
                        x: "338",
                        y: "168",
                        fill: "#94a3b8",
                        font_size: "9.5px",
                        text_anchor: "start",
                        "Produces Tag(24, event_bin) + 64B Signature"
                    }

                    // ステップ 4: IndexedDB 即時保存
                    line {
                        x1: "270",
                        y1: "195",
                        x2: "445",
                        y2: "195",
                        stroke: "#f59e0b",
                        stroke_width: "1.5",
                        marker_end: "url(#arrow-purple)",
                    }
                    text {
                        x: "360",
                        y: "188",
                        fill: "#fcd34d",
                        text_anchor: "middle",
                        "4. store_events(signed_bytes) -> Local Cache"
                    }

                    // ステップ 5: Connect-RPC POST
                    line {
                        x1: "270",
                        y1: "235",
                        x2: "625",
                        y2: "235",
                        stroke: "#38bdf8",
                        stroke_width: "2",
                        marker_end: "url(#arrow-blue)",
                    }
                    rect {
                        x: "310",
                        y: "218",
                        width: "275",
                        height: "18",
                        rx: "3",
                        fill: "rgba(15, 23, 42, 0.9)",
                        stroke: "#0284c7",
                    }
                    text {
                        x: "447",
                        y: "231",
                        fill: "#38bdf8",
                        font_weight: "bold",
                        text_anchor: "middle",
                        "5. POST /definy.v1.EventService/SubmitEvent"
                    }
                    text {
                        x: "447",
                        y: "250",
                        fill: "#94a3b8",
                        font_size: "9.5px",
                        text_anchor: "middle",
                        {"Payload: { signed_event_bytes: Base64(CBOR) }"}
                    }

                    // ステップ 6: サーバー検証 (Zero-Trust)
                    path {
                        d: "M 630 270 H 690 V 295 H 635",
                        fill: "none",
                        stroke: "#34d399",
                        stroke_width: "1.5",
                        marker_end: "url(#arrow-green)",
                    }
                    text {
                        x: "698",
                        y: "280",
                        fill: "#6ee7b7",
                        text_anchor: "start",
                        "6. verify_and_deserialize(&body)"
                    }
                    text {
                        x: "698",
                        y: "293",
                        fill: "#94a3b8",
                        font_size: "9.5px",
                        text_anchor: "start",
                        "Verify Ed25519 signature & CBOR parse"
                    }

                    // ステップ 7: SurrealDB 保存
                    line {
                        x1: "630",
                        y1: "320",
                        x2: "775",
                        y2: "320",
                        stroke: "#ec4899",
                        stroke_width: "1.5",
                        marker_end: "url(#arrow-purple)",
                    }
                    text {
                        x: "705",
                        y: "313",
                        fill: "#f472b6",
                        text_anchor: "middle",
                        "7. save_event(data, sig, bytes)"
                    }

                    // ステップ 8: SurrealDB OK
                    line {
                        x1: "780",
                        y1: "350",
                        x2: "635",
                        y2: "350",
                        stroke: "#ec4899",
                        stroke_width: "1.5",
                        stroke_dasharray: "4 4",
                        marker_end: "url(#arrow-purple)",
                    }
                    text {
                        x: "705",
                        y: "343",
                        fill: "#f472b6",
                        text_anchor: "middle",
                        "8. OK"
                    }

                    // ステップ 9: Connect-RPC レスポンス
                    line {
                        x1: "630",
                        y1: "385",
                        x2: "275",
                        y2: "385",
                        stroke: "#34d399",
                        stroke_width: "1.8",
                        stroke_dasharray: "4 4",
                        marker_end: "url(#arrow-green)",
                    }
                    text {
                        x: "450",
                        y: "378",
                        fill: "#34d399",
                        font_weight: "bold",
                        text_anchor: "middle",
                        {"9. 200 OK: { event_hash, status: \"ok\" }"}
                    }

                    // ステップ 10: UI 更新
                    line {
                        x1: "270",
                        y1: "420",
                        x2: "95",
                        y2: "420",
                        stroke: "#38bdf8",
                        stroke_width: "1.5",
                        stroke_dasharray: "4 4",
                        marker_end: "url(#arrow-blue)",
                    }
                    text {
                        x: "180",
                        y: "413",
                        fill: "#38bdf8",
                        text_anchor: "middle",
                        "10. Render Success & Updated State"
                    }
                }
            }

            // ステップ詳細説明
            div { style: "display: grid; gap: 0.5rem; font-size: 0.82rem; color: var(--text-secondary); background: rgba(0,0,0,0.15); padding: 0.8rem 1rem; border-radius: var(--radius-sm); border-left: 3px solid var(--primary);",
                div { style: "font-weight: 600; color: var(--text-primary);",
                    {
                        language
                            .label(
                                "Key Security & Reliability Points:",
                                "重要ポイント（セキュリティと信頼性）:",
                                "Gravaj Sekurecaj Punktoj:",
                            )
                    }
                }
                div {
                    "• "
                    strong {
                        {
                            language
                                .label(
                                    "Client-Side Proof: ",
                                    "クライアント完結の暗号証明: ",
                                    "Klient-Flanka Pruvo: ",
                                )
                        }
                    }
                    {
                        language
                            .label(
                                "The server never sees the private key. It only checks the Ed25519 signature against the deterministic CBOR payload.",
                                "秘密鍵はクライアント外に一切漏洩しません。サーバーは決定論的 CBOR バイト列に対する Ed25519 署名のみを数学的に検証します。",
                                "La privata ŝlosilo neniam forlasas la klienton. La servilo nur kontrolas la subskribon.",
                            )
                    }
                }
                div {
                    "• "
                    strong {
                        {
                            language
                                .label(
                                    "Immediate Offline UX: ",
                                    "オフライン即時反映: ",
                                    "Tuj Senreta Sperto: ",
                                )
                        }
                    }
                    {
                        language
                            .label(
                                "Step 4 caches the event to IndexedDB before or in parallel with network transit, guaranteeing optimistic responsiveness.",
                                "ネットワーク送信と並行して Step 4 で IndexedDB にキャッシュされるため、通信遅延や切断時にも即座にローカルへ反映されます。",
                                "IndexedDB konservas la eventon antaŭ aŭ paralele kun reta dissendo.",
                            )
                    }
                }
            }
        }
    }
}
