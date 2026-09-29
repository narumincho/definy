use dioxus::prelude::*;

use crate::language::Language;

#[component]
pub fn SubmitSequenceDiagram(language: Language) -> Element {
    // 多言語ラベル
    let actor_user = language.label("User / UI", "ユーザー / UI", "Uzanto / UI");
    let actor_client = language.label(
        "definy-ui (WASM)",
        "definy-ui (WASMクライアント)",
        "definy-ui (WASM)",
    );
    let actor_idb = language.label(
        "IndexedDB (Cache)",
        "IndexedDB (ローカルキャッシュ)",
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
        "1. Edit Module / Part & Click Submit",
        "1. モジュールまたはパーツを編集し送信を実行",
        "1. Redakti Modulon / Parton & Klaki Sendi",
    );
    let step2_title = language.label(
        "2. Deterministic CBOR Encoding (RFC 8949)",
        "2. 決定論的 CBOR エンコード (RFC 8949)",
        "2. Determina CBOR Kodigo (RFC 8949)",
    );
    let step2_sub = language.label(
        "Canonical key sorting, floating point normalization",
        "辞書キーの長さ・辞書順ソート、浮動小数点正規化",
        "Kanonika ŝlosilordigo, flosanta punkto normaligo",
    );
    let step3_title = language.label(
        "3. Local Ed25519 Signing with SecretKey",
        "3. クライアント秘密鍵による Ed25519 署名",
        "3. Loka Ed25519 Subskribo per Privata Ŝlosilo",
    );
    let step3_sub = language.label(
        "Generates Tag(24, event_bin) + 64-byte Ed25519 Signature",
        "Tag(24, event_bin) + 64バイト署名バイナリを生成",
        "Generas Tag(24, event_bin) + 64B Subskribo",
    );
    let step4_title = language.label(
        "4. store_events(signed_bytes) -> Local IndexedDB Cache",
        "4. IndexedDB ローカルキャッシュに即座に先行保存",
        "4. store_events(signed_bytes) -> Loka IndexedDB",
    );
    let step5_title = language.label(
        "5. POST /definy.v1.EventService/SubmitEvent",
        "5. POST /definy.v1.EventService/SubmitEvent",
        "5. POST /definy.v1.EventService/SubmitEvent",
    );
    let step5_sub = language.label(
        "Payload: { signed_event_bytes: Base64(CBOR) }",
        "送信データ: { signed_event_bytes: Base64(決定論的CBOR) }",
        "Ŝarĝo: { signed_event_bytes: Base64(CBOR) }",
    );
    let step6_title = language.label(
        "6. verify_and_deserialize(&body) (Zero-Trust)",
        "6. verify_and_deserialize (ゼロトラスト暗号検証)",
        "6. verify_and_deserialize (Nulfida Kontrolo)",
    );
    let step6_sub = language.label(
        "Server verifies author's Ed25519 signature & CBOR integrity",
        "作成者の Ed25519 署名と CBOR 整合性を数学的に検証",
        "Servilo kontrolas la subskribon kaj CBOR",
    );
    let step7_title = language.label(
        "7. save_event(data, sig, bytes) -> SurrealDB",
        "7. SurrealDB events テーブルへ不変保存",
        "7. save_event(data, sig, bytes) -> SurrealDB",
    );
    let step8_title = language.label(
        "8. DB Transaction Committed (OK)",
        "8. DB トランザクション完了 (OK)",
        "8. DB Transakcio Finita (OK)",
    );
    let step9_title = language.label(
        "9. 200 OK: { event_hash: \"ev-...\", status: \"success\" }",
        "9. 200 OK: { event_hash: \"ev-...\", status: \"success\" }",
        "9. 200 OK: { event_hash: \"ev-...\", status: \"success\" }",
    );
    let step10_title = language.label(
        "10. Render Success & Projected State in UI",
        "10. UI にコミット成功と最新射影状態を反映",
        "10. Montri Sukceson & Projekciitan Staton en UI",
    );

    rsx! {
        div { style: "display: grid; gap: 1.2rem; width: 100%;",
            p { style: "font-size: 0.92rem; color: var(--text-secondary); margin: 0; line-height: 1.6;",
                {
                    language
                        .label(
                            "Sequence of creating, deterministically encoding, signing, caching, and submitting an event to the server:",
                            "イベントの作成、決定論的 CBOR エンコード、Ed25519 署名、IndexedDB キャッシュ、Connect-RPC 送信の一連のシーケンス図:",
                            "Sekvenco de kreado, determina kodigo, subskribo, kaŝmemoro, kaj sendo de evento al servilo:",
                        )
                }
            }

            // フル幅 SVG シーケンス図コンテナ
            div {
                class: "event-detail-card",
                style: "background: #080c14; border: 1px solid var(--border); border-radius: var(--radius-md); padding: 1.2rem 0.8rem; overflow-x: auto; width: 100%; box-sizing: border-box;",
                svg {
                    view_box: "0 0 1100 540",
                    style: "width: 100%; min-width: 860px; height: auto; display: block; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 13px;",

                    defs {
                        marker {
                            id: "sub-arrow-blue",
                            view_box: "0 0 10 10",
                            ref_x: "8",
                            ref_y: "5",
                            marker_width: "6",
                            marker_height: "6",
                            orient: "auto-start-reverse",
                            path { d: "M 0 1 L 10 5 L 0 9 z", fill: "#38bdf8" }
                        }
                        marker {
                            id: "sub-arrow-green",
                            view_box: "0 0 10 10",
                            ref_x: "8",
                            ref_y: "5",
                            marker_width: "6",
                            marker_height: "6",
                            orient: "auto-start-reverse",
                            path { d: "M 0 1 L 10 5 L 0 9 z", fill: "#34d399" }
                        }
                        marker {
                            id: "sub-arrow-purple",
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
                    line { x1: "100", y1: "55", x2: "100", y2: "510", stroke: "#1e293b", stroke_width: "1.5", stroke_dasharray: "5 5" }
                    line { x1: "330", y1: "55", x2: "330", y2: "510", stroke: "#1e293b", stroke_width: "1.5", stroke_dasharray: "5 5" }
                    line { x1: "570", y1: "55", x2: "570", y2: "510", stroke: "#1e293b", stroke_width: "1.5", stroke_dasharray: "5 5" }
                    line { x1: "800", y1: "55", x2: "800", y2: "510", stroke: "#1e293b", stroke_width: "1.5", stroke_dasharray: "5 5" }
                    line { x1: "990", y1: "55", x2: "990", y2: "510", stroke: "#1e293b", stroke_width: "1.5", stroke_dasharray: "5 5" }

                    // アクターボックス
                    // 1. User
                    rect { x: "25", y: "12", width: "150", height: "38", rx: "8", fill: "#0f172a", stroke: "#3b82f6", stroke_width: "1.8" }
                    text { x: "100", y: "36", fill: "#93c5fd", font_weight: "bold", font_size: "13.5px", text_anchor: "middle", "{actor_user}" }

                    // 2. Client
                    rect { x: "235", y: "12", width: "190", height: "38", rx: "8", fill: "#0f172a", stroke: "#8b5cf6", stroke_width: "1.8" }
                    text { x: "330", y: "36", fill: "#c4b5fd", font_weight: "bold", font_size: "13.5px", text_anchor: "middle", "{actor_client}" }

                    // 3. IndexedDB
                    rect { x: "475", y: "12", width: "190", height: "38", rx: "8", fill: "#0f172a", stroke: "#f59e0b", stroke_width: "1.8" }
                    text { x: "570", y: "36", fill: "#fbbf24", font_weight: "bold", font_size: "13.5px", text_anchor: "middle", "{actor_idb}" }

                    // 4. Server
                    rect { x: "705", y: "12", width: "190", height: "38", rx: "8", fill: "#0f172a", stroke: "#10b981", stroke_width: "1.8" }
                    text { x: "800", y: "36", fill: "#6ee7b7", font_weight: "bold", font_size: "13.5px", text_anchor: "middle", "{actor_server}" }

                    // 5. DB
                    rect { x: "910", y: "12", width: "160", height: "38", rx: "8", fill: "#0f172a", stroke: "#ec4899", stroke_width: "1.8" }
                    text { x: "990", y: "36", fill: "#f472b6", font_weight: "bold", font_size: "13.5px", text_anchor: "middle", "{actor_db}" }

                    // ----------------------------------------------------
                    // ステップ 1: 送信クリック
                    line { x1: "100", y1: "80", x2: "325", y2: "80", stroke: "#38bdf8", stroke_width: "1.8", marker_end: "url(#sub-arrow-blue)" }
                    text { x: "212", y: "73", fill: "#38bdf8", font_weight: "600", text_anchor: "middle", "{step1_title}" }

                    // ステップ 2: 決定論的CBOR
                    path { d: "M 330 95 H 430 V 128 H 335", fill: "none", stroke: "#c084fc", stroke_width: "1.8", marker_end: "url(#sub-arrow-purple)" }
                    text { x: "440", y: "107", fill: "#d8b4fe", font_weight: "600", font_size: "13px", text_anchor: "start", "{step2_title}" }
                    text { x: "440", y: "124", fill: "#94a3b8", font_size: "11.5px", text_anchor: "start", "{step2_sub}" }

                    // ステップ 3: Ed25519 署名
                    path { d: "M 330 145 H 430 V 178 H 335", fill: "none", stroke: "#c084fc", stroke_width: "1.8", marker_end: "url(#sub-arrow-purple)" }
                    text { x: "440", y: "157", fill: "#d8b4fe", font_weight: "600", font_size: "13px", text_anchor: "start", "{step3_title}" }
                    text { x: "440", y: "174", fill: "#94a3b8", font_size: "11.5px", text_anchor: "start", "{step3_sub}" }

                    // ステップ 4: IndexedDB 即時保存
                    line { x1: "330", y1: "205", x2: "565", y2: "205", stroke: "#fbbf24", stroke_width: "1.8", marker_end: "url(#sub-arrow-purple)" }
                    text { x: "450", y: "198", fill: "#fde68a", font_weight: "600", text_anchor: "middle", "{step4_title}" }

                    // ステップ 5: Connect-RPC POST
                    line { x1: "330", y1: "248", x2: "795", y2: "248", stroke: "#38bdf8", stroke_width: "2.2", marker_end: "url(#sub-arrow-blue)" }
                    rect { x: "430", y: "232", width: "270", height: "20", rx: "4", fill: "rgba(15, 23, 42, 0.95)", stroke: "#0284c7" }
                    text { x: "565", y: "246", fill: "#38bdf8", font_weight: "bold", font_size: "12.5px", text_anchor: "middle", "{step5_title}" }
                    text { x: "565", y: "266", fill: "#94a3b8", font_size: "11.5px", text_anchor: "middle", "{step5_sub}" }

                    // ステップ 6: サーバー検証
                    path { d: "M 800 285 H 900 V 315 H 805", fill: "none", stroke: "#34d399", stroke_width: "1.8", marker_end: "url(#sub-arrow-green)" }
                    text { x: "910", y: "297", fill: "#6ee7b7", font_weight: "600", font_size: "13px", text_anchor: "start", "{step6_title}" }
                    text { x: "910", y: "314", fill: "#94a3b8", font_size: "11.5px", text_anchor: "start", "{step6_sub}" }

                    // ステップ 7: DB保存
                    line { x1: "800", y1: "345", x2: "985", y2: "345", stroke: "#ec4899", stroke_width: "1.8", marker_end: "url(#sub-arrow-purple)" }
                    text { x: "892", y: "338", fill: "#f472b6", font_weight: "600", text_anchor: "middle", "{step7_title}" }

                    // ステップ 8: DB応答
                    line { x1: "990", y1: "375", x2: "805", y2: "375", stroke: "#ec4899", stroke_width: "1.8", stroke_dasharray: "4 4", marker_end: "url(#sub-arrow-purple)" }
                    text { x: "892", y: "368", fill: "#f472b6", font_size: "12px", text_anchor: "middle", "{step8_title}" }

                    // ステップ 9: Connect-RPC レスポンス
                    line { x1: "800", y1: "415", x2: "335", y2: "415", stroke: "#34d399", stroke_width: "2.2", stroke_dasharray: "4 4", marker_end: "url(#sub-arrow-green)" }
                    text { x: "565", y: "408", fill: "#34d399", font_weight: "bold", font_size: "13px", text_anchor: "middle", "{step9_title}" }

                    // ステップ 10: UI 更新
                    line { x1: "330", y1: "455", x2: "105", y2: "455", stroke: "#38bdf8", stroke_width: "1.8", stroke_dasharray: "4 4", marker_end: "url(#sub-arrow-blue)" }
                    text { x: "217", y: "448", fill: "#38bdf8", font_weight: "600", text_anchor: "middle", "{step10_title}" }
                }
            }

            // 説明ブロック
            div { style: "display: grid; gap: 0.6rem; font-size: 0.86rem; color: var(--text-secondary); background: rgba(0,0,0,0.15); padding: 1.2rem; border-radius: var(--radius-sm); border-left: 3px solid var(--primary);",
                div { style: "font-weight: 700; color: var(--text-primary); font-size: 0.95rem;",
                    {
                        language
                            .label(
                                "Key Security & Reliability Points:",
                                "セキュリティと信頼性の重要ポイント:",
                                "Gravaj Sekurecaj Punktoj:",
                            )
                    }
                }
                div { style: "line-height: 1.6;",
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
                                "秘密鍵はクライアント外に一切送信されません。サーバーは決定論的 CBOR バイト列に対する Ed25519 署名のみを数学的に検証します。",
                                "La privata ŝlosilo neniam forlasas la klienton. La servilo nur kontrolas la subskribon.",
                            )
                    }
                }
                div { style: "line-height: 1.6;",
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
