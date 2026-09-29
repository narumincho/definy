use dioxus::prelude::*;

use crate::language::Language;

#[component]
pub fn FetchSequenceDiagram(language: Language) -> Element {
    // 多言語ラベル
    let actor_screen = language.label("Browser Screen", "ブラウザ画面", "Retumila Ekrano");
    let actor_client = language.label(
        "definy-ui (WASM)",
        "definy-ui (WASMクライアント)",
        "definy-ui (WASM)",
    );
    let actor_idb = language.label(
        "IndexedDB (Cache)",
        "IndexedDB (キャッシュ)",
        "IndexedDB (Kaŝmemoro)",
    );
    let actor_server = language.label(
        "definy-server (Axum)",
        "definy-server (Axumサーバー)",
        "definy-server (Servilo)",
    );
    let actor_db = language.label(
        "SurrealDB (events)",
        "SurrealDB (events テーブル)",
        "SurrealDB (events)",
    );

    let step1_title = language.label(
        "1. Open /api, /modules, or /events Page",
        "1. /api やモジュール・イベント画面を開く",
        "1. Malfermi Paĝon /api aŭ /modules",
    );
    let step2_title = language.label(
        "2. POST /definy.v1.EventService/GetEvents",
        "2. POST /definy.v1.EventService/GetEvents",
        "2. POST /definy.v1.EventService/GetEvents",
    );
    let step2_sub = language.label(
        "Request: { event_type: \"...\", limit: 10, offset: 0 }",
        "リクエスト: { event_type: \"...\", limit: 10, offset: 0 }",
        "Peto: { event_type: \"...\", limit: 10, offset: 0 }",
    );
    let step3_title = language.label(
        "3. DB Query: get_events(event_type, limit, offset)",
        "3. DB 照会: get_events(event_type, limit, offset)",
        "3. DB Peto: get_events(event_type, limit, offset)",
    );
    let step4_title = language.label(
        "4. Return event records + raw CBOR bytes",
        "4. イベントレコードと生の決定論的 CBOR バイト列を返却",
        "4. Redoni eventajn rikordojn + CBOR bajtojn",
    );
    let step5_title = language.label(
        "5. 200 OK: GetEventsResponse { events: [EventItem] }",
        "5. 200 OK: GetEventsResponse { events: [EventItem] }",
        "5. 200 OK: GetEventsResponse { events: [EventItem] }",
    );
    let step5_sub = language.label(
        "Each EventItem contains signed_event_bytes (Base64)",
        "各項目に signed_event_bytes (Base64 エンコードされた署名済みCBOR) を内包",
        "Ĉiu ero enhavas signed_event_bytes (Base64)",
    );
    let step6_title = language.label(
        "6. store_events(&bytes) -> Cache in IndexedDB",
        "6. IndexedDB に各イベントバイナリをキャッシュ保存",
        "6. store_events(&bytes) -> Kaŝmemori en IndexedDB",
    );
    let step7_title = language.label(
        "7. verify_and_deserialize(&bytes) (Zero-Trust)",
        "7. クライアント側で Ed25519 署名 & CBOR を数学的に独立検証",
        "7. verify_and_deserialize(&bytes) (Nulfida Kontrolo)",
    );
    let step7_sub = language.label(
        "Verify Ed25519 signature & compute EventHash without trusting server",
        "サーバーを盲信せず、ブラウザ内 WASM で署名検証と EventHash 算出を実行",
        "Kontroli Ed25519 subskribon & kalkuli EventHash",
    );
    let step8_title = language.label(
        "8. Decode AST & compute ContentHash",
        "8. 式（AST）をパースし ContentHash による依存固定を確立",
        "8. Malkodi AST & kalkuli ContentHash",
    );
    let step8_sub = language.label(
        "Pure functional AST tree & type definitions resolved",
        "純粋関数型構文木および型定義が決定論的に解決される",
        "Pura funkcia AST arbo & tipdifinoj solvitaj",
    );
    let step9_title = language.label(
        "9. Render Verified Events, Expressions & Types in UI",
        "9. 検証済みイベント・式・型を UI にリアクティブ描画",
        "9. Montri Kontrolitajn Eventojn, Esprimojn & Tipojn",
    );

    rsx! {
        div { style: "display: grid; gap: 1.2rem; width: 100%;",
            p { style: "font-size: 0.92rem; color: var(--text-secondary); margin: 0; line-height: 1.6;",
                {
                    language
                        .label(
                            "Sequence of fetching events via Connect-RPC, caching into IndexedDB, and zero-trust cryptographic verification on the client:",
                            "Connect-RPC によるイベント取得、IndexedDB キャッシュ、クライアント側ゼロトラスト暗号署名検証・AST レンダリングの完全シーケンス図:",
                            "Sekvenco de evento-akiro per Connect-RPC kaj nulfida kontrolo:",
                        )
                }
            }

            // フル幅 SVG シーケンス図コンテナ
            div {
                class: "event-detail-card",
                style: "background: #080c14; border: 1px solid var(--border); border-radius: var(--radius-md); padding: 1.2rem 0.8rem; overflow-x: auto; width: 100%; box-sizing: border-box;",
                svg {
                    view_box: "0 0 1100 480",
                    style: "width: 100%; min-width: 860px; height: auto; display: block; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 13px;",

                    defs {
                        marker {
                            id: "fetch-arrow-blue",
                            view_box: "0 0 10 10",
                            ref_x: "8",
                            ref_y: "5",
                            marker_width: "6",
                            marker_height: "6",
                            orient: "auto-start-reverse",
                            path { d: "M 0 1 L 10 5 L 0 9 z", fill: "#38bdf8" }
                        }
                        marker {
                            id: "fetch-arrow-green",
                            view_box: "0 0 10 10",
                            ref_x: "8",
                            ref_y: "5",
                            marker_width: "6",
                            marker_height: "6",
                            orient: "auto-start-reverse",
                            path { d: "M 0 1 L 10 5 L 0 9 z", fill: "#34d399" }
                        }
                        marker {
                            id: "fetch-arrow-purple",
                            view_box: "0 0 10 10",
                            ref_x: "8",
                            ref_y: "5",
                            marker_width: "6",
                            marker_height: "6",
                            orient: "auto-start-reverse",
                            path { d: "M 0 1 L 10 5 L 0 9 z", fill: "#c084fc" }
                        }
                    }

                    // アクター縦線（ライフライン）
                    line {
                        x1: "100",
                        y1: "55",
                        x2: "100",
                        y2: "450",
                        stroke: "#1e293b",
                        stroke_width: "1.5",
                        stroke_dasharray: "5 5",
                    }
                    line {
                        x1: "330",
                        y1: "55",
                        x2: "330",
                        y2: "450",
                        stroke: "#1e293b",
                        stroke_width: "1.5",
                        stroke_dasharray: "5 5",
                    }
                    line {
                        x1: "570",
                        y1: "55",
                        x2: "570",
                        y2: "450",
                        stroke: "#1e293b",
                        stroke_width: "1.5",
                        stroke_dasharray: "5 5",
                    }
                    line {
                        x1: "800",
                        y1: "55",
                        x2: "800",
                        y2: "450",
                        stroke: "#1e293b",
                        stroke_width: "1.5",
                        stroke_dasharray: "5 5",
                    }
                    line {
                        x1: "990",
                        y1: "55",
                        x2: "990",
                        y2: "450",
                        stroke: "#1e293b",
                        stroke_width: "1.5",
                        stroke_dasharray: "5 5",
                    }

                    // アクターボックス
                    // 1. Browser Screen
                    rect {
                        x: "25",
                        y: "12",
                        width: "150",
                        height: "38",
                        rx: "8",
                        fill: "#0f172a",
                        stroke: "#3b82f6",
                        stroke_width: "1.8",
                    }
                    text {
                        x: "100",
                        y: "36",
                        fill: "#93c5fd",
                        font_weight: "bold",
                        font_size: "13.5px",
                        text_anchor: "middle",
                        "{actor_screen}"
                    }

                    // 2. Client
                    rect {
                        x: "235",
                        y: "12",
                        width: "190",
                        height: "38",
                        rx: "8",
                        fill: "#0f172a",
                        stroke: "#8b5cf6",
                        stroke_width: "1.8",
                    }
                    text {
                        x: "330",
                        y: "36",
                        fill: "#c4b5fd",
                        font_weight: "bold",
                        font_size: "13.5px",
                        text_anchor: "middle",
                        "{actor_client}"
                    }

                    // 3. IndexedDB
                    rect {
                        x: "475",
                        y: "12",
                        width: "190",
                        height: "38",
                        rx: "8",
                        fill: "#0f172a",
                        stroke: "#f59e0b",
                        stroke_width: "1.8",
                    }
                    text {
                        x: "570",
                        y: "36",
                        fill: "#fbbf24",
                        font_weight: "bold",
                        font_size: "13.5px",
                        text_anchor: "middle",
                        "{actor_idb}"
                    }

                    // 4. Server
                    rect {
                        x: "705",
                        y: "12",
                        width: "190",
                        height: "38",
                        rx: "8",
                        fill: "#0f172a",
                        stroke: "#10b981",
                        stroke_width: "1.8",
                    }
                    text {
                        x: "800",
                        y: "36",
                        fill: "#6ee7b7",
                        font_weight: "bold",
                        font_size: "13.5px",
                        text_anchor: "middle",
                        "{actor_server}"
                    }

                    // 5. DB
                    rect {
                        x: "910",
                        y: "12",
                        width: "160",
                        height: "38",
                        rx: "8",
                        fill: "#0f172a",
                        stroke: "#ec4899",
                        stroke_width: "1.8",
                    }
                    text {
                        x: "990",
                        y: "36",
                        fill: "#f472b6",
                        font_weight: "bold",
                        font_size: "13.5px",
                        text_anchor: "middle",
                        "{actor_db}"
                    }

                    // ----------------------------------------------------
                    // ステップ 1: 画面遷移
                    line {
                        x1: "100",
                        y1: "80",
                        x2: "325",
                        y2: "80",
                        stroke: "#38bdf8",
                        stroke_width: "1.8",
                        marker_end: "url(#fetch-arrow-blue)",
                    }
                    text {
                        x: "212",
                        y: "73",
                        fill: "#38bdf8",
                        font_weight: "600",
                        text_anchor: "middle",
                        "{step1_title}"
                    }

                    // ステップ 2: Connect-RPC POST GetEvents
                    line {
                        x1: "330",
                        y1: "115",
                        x2: "795",
                        y2: "115",
                        stroke: "#38bdf8",
                        stroke_width: "2.2",
                        marker_end: "url(#fetch-arrow-blue)",
                    }
                    rect {
                        x: "440",
                        y: "99",
                        width: "250",
                        height: "20",
                        rx: "4",
                        fill: "rgba(15, 23, 42, 0.95)",
                        stroke: "#0284c7",
                    }
                    text {
                        x: "565",
                        y: "113",
                        fill: "#38bdf8",
                        font_weight: "bold",
                        font_size: "12.5px",
                        text_anchor: "middle",
                        "{step2_title}"
                    }
                    text {
                        x: "565",
                        y: "133",
                        fill: "#94a3b8",
                        font_size: "11.5px",
                        text_anchor: "middle",
                        "{step2_sub}"
                    }

                    // ステップ 3: データベース照会
                    line {
                        x1: "800",
                        y1: "155",
                        x2: "985",
                        y2: "155",
                        stroke: "#ec4899",
                        stroke_width: "1.8",
                        marker_end: "url(#fetch-arrow-purple)",
                    }
                    text {
                        x: "892",
                        y: "148",
                        fill: "#f472b6",
                        font_weight: "600",
                        text_anchor: "middle",
                        "{step3_title}"
                    }

                    // ステップ 4: データベース応答
                    line {
                        x1: "990",
                        y1: "185",
                        x2: "805",
                        y2: "185",
                        stroke: "#ec4899",
                        stroke_width: "1.8",
                        stroke_dasharray: "4 4",
                        marker_end: "url(#fetch-arrow-purple)",
                    }
                    text {
                        x: "892",
                        y: "178",
                        fill: "#f472b6",
                        font_size: "12px",
                        text_anchor: "middle",
                        "{step4_title}"
                    }

                    // ステップ 5: Connect-RPC レスポンス
                    line {
                        x1: "800",
                        y1: "220",
                        x2: "335",
                        y2: "220",
                        stroke: "#34d399",
                        stroke_width: "2.2",
                        stroke_dasharray: "4 4",
                        marker_end: "url(#fetch-arrow-green)",
                    }
                    text {
                        x: "565",
                        y: "213",
                        fill: "#34d399",
                        font_weight: "bold",
                        font_size: "12.5px",
                        text_anchor: "middle",
                        "{step5_title}"
                    }
                    text {
                        x: "565",
                        y: "233",
                        fill: "#94a3b8",
                        font_size: "11.5px",
                        text_anchor: "middle",
                        "{step5_sub}"
                    }

                    // ステップ 6: IndexedDB キャッシュ保存
                    line {
                        x1: "330",
                        y1: "260",
                        x2: "565",
                        y2: "260",
                        stroke: "#fbbf24",
                        stroke_width: "1.8",
                        marker_end: "url(#fetch-arrow-purple)",
                    }
                    text {
                        x: "450",
                        y: "253",
                        fill: "#fde68a",
                        font_weight: "600",
                        text_anchor: "middle",
                        "{step6_title}"
                    }

                    // ステップ 7: クライアント側ゼロトラスト検証
                    path {
                        d: "M 330 285 H 430 V 315 H 335",
                        fill: "none",
                        stroke: "#c084fc",
                        stroke_width: "1.8",
                        marker_end: "url(#fetch-arrow-purple)",
                    }
                    text {
                        x: "440",
                        y: "297",
                        fill: "#d8b4fe",
                        font_weight: "600",
                        font_size: "13px",
                        text_anchor: "start",
                        "{step7_title}"
                    }
                    text {
                        x: "440",
                        y: "314",
                        fill: "#94a3b8",
                        font_size: "11.5px",
                        text_anchor: "start",
                        "{step7_sub}"
                    }

                    // ステップ 8: AST・パーツ・型のパース
                    path {
                        d: "M 330 335 H 430 V 365 H 335",
                        fill: "none",
                        stroke: "#c084fc",
                        stroke_width: "1.8",
                        marker_end: "url(#fetch-arrow-purple)",
                    }
                    text {
                        x: "440",
                        y: "347",
                        fill: "#d8b4fe",
                        font_weight: "600",
                        font_size: "13px",
                        text_anchor: "start",
                        "{step8_title}"
                    }
                    text {
                        x: "440",
                        y: "364",
                        fill: "#94a3b8",
                        font_size: "11.5px",
                        text_anchor: "start",
                        "{step8_sub}"
                    }

                    // ステップ 9: リアクティブ描画
                    line {
                        x1: "330",
                        y1: "400",
                        x2: "105",
                        y2: "400",
                        stroke: "#38bdf8",
                        stroke_width: "1.8",
                        stroke_dasharray: "4 4",
                        marker_end: "url(#fetch-arrow-blue)",
                    }
                    text {
                        x: "217",
                        y: "393",
                        fill: "#38bdf8",
                        font_weight: "600",
                        text_anchor: "middle",
                        "{step9_title}"
                    }
                }
            }

            // 説明注記
            div { style: "display: grid; gap: 0.6rem; font-size: 0.86rem; color: var(--text-secondary); background: rgba(0,0,0,0.15); padding: 1.2rem; border-radius: var(--radius-sm); border-left: 3px solid #10b981;",
                div { style: "font-weight: 700; color: var(--text-primary); font-size: 0.95rem;",
                    {
                        language
                            .label(
                                "Why Zero-Trust Client Verification Matters:",
                                "なぜクライアント側のゼロトラスト暗号検証が不可欠なのか:",
                                "Kial Nulfida Klienta Kontrolo Gravas:",
                            )
                    }
                }
                div { style: "line-height: 1.6;",
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
