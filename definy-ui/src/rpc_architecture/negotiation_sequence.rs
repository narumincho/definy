use dioxus::prelude::*;

use crate::language::Language;

#[component]
pub fn NegotiationSequenceDiagram(language: Language) -> Element {
    // 多言語ラベル定義
    let actor_user = language.label("User / UI", "ユーザー / UI", "Uzanto / UI");
    let actor_client = language.label(
        "definy-ui (Client)",
        "definy-ui (クライアント)",
        "definy-ui (Kliento)",
    );
    let actor_gateway = language.label(
        "Connect-RPC Server",
        "Connect-RPC サーバー",
        "Connect-RPC Servilo",
    );
    let actor_cas = language.label(
        "CAS (contents テーブル)",
        "CAS (contents テーブル)",
        "CAS (contents Tabelo)",
    );
    let actor_store = language.label(
        "Event Store (events)",
        "イベントストア (events)",
        "Eventa Stokado (events)",
    );

    // ステップラベル
    let step1_title = language.label(
        "1. Edit Part Expression",
        "1. パーツの式（AST）を編集",
        "1. Redakti Partan Esprimon",
    );
    let step2_title = language.label(
        "2. Compute ContentHash: ch = SHA256(CBOR(expr))",
        "2. ContentHash 算出: ch = SHA256(CBOR(式))",
        "2. Kalkuli ContentHash: ch = SHA256(CBOR(espr))",
    );
    let step2_sub = language.label(
        "Create ModuleCommit with content_hash reference & sign with Ed25519",
        "式のハッシュを参照する ModuleCommit を構築し、Ed25519 秘密鍵で署名",
        "Krei ModuleCommit kun referenco de content_hash & subskribi per Ed25519",
    );

    let step3_title = language.label(
        "3. POST SubmitEvent (Optimistic Submit)",
        "3. POST SubmitEvent (楽観的送信)",
        "3. POST SubmitEvent (Optimisma Sendo)",
    );
    let step3_sub = language.label(
        "Payload: signed_event_bytes (Contains metadata + content_hashes, no AST blobs)",
        "送信データ: signed_event_bytes (メタデータとハッシュのみ含み、式バイナリは含めない)",
        "Ŝarĝo: signed_event_bytes (Metadatenoj + content_hashes, sen AST)",
    );

    let step4_title = language.label(
        "4. Check CAS: filter_missing([\"ch-abc\"])",
        "4. CAS 照会: 不足ハッシュを判定 filter_missing([\"ch-abc\"])",
        "4. Kontroli CAS: filtri mankantajn([\"ch-abc\"])",
    );
    let step4_sub = language.label(
        "Missing hashes: [\"ch-abc\"] (Unregistered expression)",
        "未登録のハッシュ: [\"ch-abc\"] (サーバー未所持)",
        "Mankantaj haŝoj: [\"ch-abc\"] (Neregistrita esprimo)",
    );

    let step5_title = language.label(
        "5. Respond: status = \"missing_content\"",
        "5. 応答: status = \"missing_content\" (不足通知)",
        "5. Respondo: status = \"missing_content\"",
    );
    let step5_sub = language.label(
        "missing_content_hashes: [\"ch-abc\"]",
        "不足ハッシュリスト: [\"ch-abc\"]",
        "mankantaj_enhav_haŝoj: [\"ch-abc\"]",
    );

    let step6_title = language.label(
        "6. Client isolates missing expression ASTs",
        "6. クライアントが不足分の式バイナリのみを抽出",
        "6. Kliento apartigas mankantajn esprimajn AST-ojn",
    );
    let step6_sub = language.label(
        "Only modified expressions are prepared (0 bytes sent for unchanged parts)",
        "変更があったパーツのみを準備（過去と共通のパーツは転送量 0 バイト）",
        "Nur modifitaj esprimoj estas pretigataj (0 bajtoj por senŝanĝaj partoj)",
    );

    let step7_title = language.label(
        "7. POST UploadContent",
        "7. POST UploadContent (式バイナリ送信)",
        "7. POST UploadContent",
    );
    let step7_sub = language.label(
        "items: [{ content_hash: \"ch-abc\", content_bytes }]",
        "アップロード配列: [{ content_hash: \"ch-abc\", content_bytes }]",
        "eroj: [{ content_hash: \"ch-abc\", content_bytes }]",
    );

    let step8_title = language.label(
        "8. Server validates SHA256(content_bytes) == content_hash",
        "8. サーバー側検証: SHA256(content_bytes) == content_hash",
        "8. Servilo kontrolas: SHA256(bajtoj) == content_hash",
    );
    let step9_title = language.label(
        "9. Save validated AST to SurrealDB contents table",
        "9. 検証済み式バイナリを SurrealDB contents テーブル (CAS) に永続化",
        "9. Konservi validigitajn esprimojn en SurrealDB contents (CAS)",
    );
    let step10_title = language.label(
        "10. Upload completed: uploaded_count = 1",
        "10. アップロード完了応答: uploaded_count = 1",
        "10. Alŝuto finita: uploaded_count = 1",
    );

    let step11_title = language.label(
        "11. Re-POST SubmitEvent (Retry Transaction)",
        "11. SubmitEvent を再送信 (トランザクション確定)",
        "11. Resendi SubmitEvent (Fini Transakcion)",
    );
    let step12_title = language.label(
        "12. Verify: All referenced content_hashes now exist in CAS",
        "12. 照会成功: 参照されている全ハッシュが CAS に存在することを確認",
        "12. Konfirmo: Ĉiuj referencitaj haŝoj nun ekzistas en CAS",
    );
    let step13_title = language.label(
        "13. Save signed commit event to SurrealDB events table",
        "13. 署名済みコミットイベントを SurrealDB events テーブルに保存",
        "13. Konservi subskribitan eventon en SurrealDB events tabelo",
    );
    let step14_title = language.label(
        "14. Respond: status = \"success\", event_hash = \"ev-...\"",
        "14. 成功応答: status = \"success\", event_hash = \"ev-...\"",
        "14. Sukcesa respondo: status = \"success\", event_hash = \"ev-...\"",
    );
    let step15_title = language.label(
        "15. UI Confirms Commit & Updates Local Projections",
        "15. UI がコミット完了を反映しローカル状態を更新",
        "15. UI Konfirmas Komiton kaj Ĝisdatigas Lokajn Projekciojn",
    );

    rsx! {
        div { style: "display: grid; gap: 1.2rem; width: 100%;",
            p { style: "font-size: 0.92rem; color: var(--text-secondary); margin: 0; line-height: 1.6;",
                {
                    language
                        .label(
                            "Sequence of Git-style Content-Addressed Storage (CAS) and Diff Hash Negotiation between client and server (Optimistic Submit, Upload Blobs, Commit Tree):",
                            "Git の Tree / Blob 分離モデルに基づくコンテンツアドレスストレージ (CAS) と、クライアント・サーバー間の差分ハッシュ・ネゴシエーション（楽観的送信、未登録Blobの一括転送、コミットTreeの確定）の完全シーケンス図:",
                            "Sekvenco de Git-stila enhav-adresita stokado (CAS) kaj diferenca haŝ-negocado inter kliento kaj servilo:",
                        )
                }
            }

            // フル幅 SVG シーケンス図コンテナ
            div {
                class: "event-detail-card",
                style: "background: #080c14; border: 1px solid var(--border); border-radius: var(--radius-md); padding: 1.2rem 0.8rem; overflow-x: auto; width: 100%; box-sizing: border-box;",
                svg {
                    view_box: "0 0 1140 700",
                    style: "width: 100%; min-width: 900px; height: auto; display: block; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 13px;",

                    defs {
                        marker {
                            id: "neg-arrow-blue",
                            view_box: "0 0 10 10",
                            ref_x: "8",
                            ref_y: "5",
                            marker_width: "6",
                            marker_height: "6",
                            orient: "auto-start-reverse",
                            path { d: "M 0 1 L 10 5 L 0 9 z", fill: "#38bdf8" }
                        }
                        marker {
                            id: "neg-arrow-amber",
                            view_box: "0 0 10 10",
                            ref_x: "8",
                            ref_y: "5",
                            marker_width: "6",
                            marker_height: "6",
                            orient: "auto-start-reverse",
                            path { d: "M 0 1 L 10 5 L 0 9 z", fill: "#fbbf24" }
                        }
                        marker {
                            id: "neg-arrow-green",
                            view_box: "0 0 10 10",
                            ref_x: "8",
                            ref_y: "5",
                            marker_width: "6",
                            marker_height: "6",
                            orient: "auto-start-reverse",
                            path { d: "M 0 1 L 10 5 L 0 9 z", fill: "#34d399" }
                        }
                        marker {
                            id: "neg-arrow-purple",
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
                        x1: "90",
                        y1: "55",
                        x2: "90",
                        y2: "675",
                        stroke: "#1e293b",
                        stroke_width: "1.5",
                        stroke_dasharray: "5 5",
                    }
                    line {
                        x1: "310",
                        y1: "55",
                        x2: "310",
                        y2: "675",
                        stroke: "#1e293b",
                        stroke_width: "1.5",
                        stroke_dasharray: "5 5",
                    }
                    line {
                        x1: "580",
                        y1: "55",
                        x2: "580",
                        y2: "675",
                        stroke: "#1e293b",
                        stroke_width: "1.5",
                        stroke_dasharray: "5 5",
                    }
                    line {
                        x1: "860",
                        y1: "55",
                        x2: "860",
                        y2: "675",
                        stroke: "#1e293b",
                        stroke_width: "1.5",
                        stroke_dasharray: "5 5",
                    }
                    line {
                        x1: "1050",
                        y1: "55",
                        x2: "1050",
                        y2: "675",
                        stroke: "#1e293b",
                        stroke_width: "1.5",
                        stroke_dasharray: "5 5",
                    }

                    // アクターヘッダーボックス
                    // 1. User
                    rect {
                        x: "20",
                        y: "12",
                        width: "140",
                        height: "38",
                        rx: "8",
                        fill: "#0f172a",
                        stroke: "#3b82f6",
                        stroke_width: "1.8",
                    }
                    text {
                        x: "90",
                        y: "36",
                        fill: "#93c5fd",
                        font_weight: "bold",
                        font_size: "13.5px",
                        text_anchor: "middle",
                        "{actor_user}"
                    }

                    // 2. Client
                    rect {
                        x: "220",
                        y: "12",
                        width: "180",
                        height: "38",
                        rx: "8",
                        fill: "#0f172a",
                        stroke: "#8b5cf6",
                        stroke_width: "1.8",
                    }
                    text {
                        x: "310",
                        y: "36",
                        fill: "#c4b5fd",
                        font_weight: "bold",
                        font_size: "13.5px",
                        text_anchor: "middle",
                        "{actor_client}"
                    }

                    // 3. Connect-RPC Server
                    rect {
                        x: "485",
                        y: "12",
                        width: "190",
                        height: "38",
                        rx: "8",
                        fill: "#0f172a",
                        stroke: "#0284c7",
                        stroke_width: "1.8",
                    }
                    text {
                        x: "580",
                        y: "36",
                        fill: "#38bdf8",
                        font_weight: "bold",
                        font_size: "13.5px",
                        text_anchor: "middle",
                        "{actor_gateway}"
                    }

                    // 4. CAS SurrealDB
                    rect {
                        x: "765",
                        y: "12",
                        width: "190",
                        height: "38",
                        rx: "8",
                        fill: "#0f172a",
                        stroke: "#f59e0b",
                        stroke_width: "1.8",
                    }
                    text {
                        x: "860",
                        y: "36",
                        fill: "#fbbf24",
                        font_weight: "bold",
                        font_size: "13.5px",
                        text_anchor: "middle",
                        "{actor_cas}"
                    }

                    // 5. Event Store
                    rect {
                        x: "965",
                        y: "12",
                        width: "170",
                        height: "38",
                        rx: "8",
                        fill: "#0f172a",
                        stroke: "#ec4899",
                        stroke_width: "1.8",
                    }
                    text {
                        x: "1050",
                        y: "36",
                        fill: "#f472b6",
                        font_weight: "bold",
                        font_size: "13.5px",
                        text_anchor: "middle",
                        "{actor_store}"
                    }

                    // ----------------------------------------------------
                    // ステップ 1: パーツ編集
                    line {
                        x1: "90",
                        y1: "80",
                        x2: "305",
                        y2: "80",
                        stroke: "#3b82f6",
                        stroke_width: "1.8",
                        marker_end: "url(#neg-arrow-blue)",
                    }
                    text {
                        x: "197",
                        y: "73",
                        fill: "#93c5fd",
                        font_weight: "600",
                        text_anchor: "middle",
                        "{step1_title}"
                    }

                    // ステップ 2: ハッシュ計算 & 署名
                    path {
                        d: "M 310 95 H 410 V 128 H 315",
                        fill: "none",
                        stroke: "#c084fc",
                        stroke_width: "1.8",
                        marker_end: "url(#neg-arrow-purple)",
                    }
                    text {
                        x: "420",
                        y: "107",
                        fill: "#d8b4fe",
                        font_weight: "600",
                        font_size: "13px",
                        text_anchor: "start",
                        "{step2_title}"
                    }
                    text {
                        x: "420",
                        y: "124",
                        fill: "#94a3b8",
                        font_size: "11.5px",
                        text_anchor: "start",
                        "{step2_sub}"
                    }

                    // ステップ 3: 初回 SubmitEvent (楽観的送信)
                    line {
                        x1: "310",
                        y1: "158",
                        x2: "575",
                        y2: "158",
                        stroke: "#38bdf8",
                        stroke_width: "2.2",
                        marker_end: "url(#neg-arrow-blue)",
                    }
                    rect {
                        x: "355",
                        y: "142",
                        width: "230",
                        height: "20",
                        rx: "4",
                        fill: "rgba(15, 23, 42, 0.95)",
                        stroke: "#0284c7",
                    }
                    text {
                        x: "470",
                        y: "156",
                        fill: "#38bdf8",
                        font_weight: "bold",
                        font_size: "12.5px",
                        text_anchor: "middle",
                        "{step3_title}"
                    }
                    text {
                        x: "470",
                        y: "176",
                        fill: "#94a3b8",
                        font_size: "11.5px",
                        text_anchor: "middle",
                        "{step3_sub}"
                    }

                    // ステップ 4: サーバー側で CAS 照会
                    line {
                        x1: "580",
                        y1: "200",
                        x2: "855",
                        y2: "200",
                        stroke: "#fbbf24",
                        stroke_width: "1.8",
                        marker_end: "url(#neg-arrow-amber)",
                    }
                    text {
                        x: "717",
                        y: "193",
                        fill: "#fbbf24",
                        font_weight: "600",
                        text_anchor: "middle",
                        "{step4_title}"
                    }

                    line {
                        x1: "860",
                        y1: "226",
                        x2: "585",
                        y2: "226",
                        stroke: "#fbbf24",
                        stroke_width: "1.8",
                        stroke_dasharray: "4 4",
                        marker_end: "url(#neg-arrow-amber)",
                    }
                    text {
                        x: "717",
                        y: "219",
                        fill: "#fde68a",
                        font_size: "12px",
                        text_anchor: "middle",
                        "{step4_sub}"
                    }

                    // ステップ 5: ネゴシエーションレスポンス: missing_content
                    line {
                        x1: "580",
                        y1: "258",
                        x2: "315",
                        y2: "258",
                        stroke: "#f59e0b",
                        stroke_width: "2.2",
                        marker_end: "url(#neg-arrow-amber)",
                    }
                    rect {
                        x: "360",
                        y: "242",
                        width: "230",
                        height: "20",
                        rx: "4",
                        fill: "rgba(15, 23, 42, 0.95)",
                        stroke: "#d97706",
                    }
                    text {
                        x: "475",
                        y: "256",
                        fill: "#fbbf24",
                        font_weight: "bold",
                        font_size: "12.5px",
                        text_anchor: "middle",
                        "{step5_title}"
                    }
                    text {
                        x: "475",
                        y: "276",
                        fill: "#fde68a",
                        font_size: "11.5px",
                        text_anchor: "middle",
                        "{step5_sub}"
                    }

                    // ステップ 6: クライアントが不足分のみ抽出
                    path {
                        d: "M 310 295 H 410 V 328 H 315",
                        fill: "none",
                        stroke: "#c084fc",
                        stroke_width: "1.8",
                        marker_end: "url(#neg-arrow-purple)",
                    }
                    text {
                        x: "420",
                        y: "307",
                        fill: "#d8b4fe",
                        font_weight: "600",
                        font_size: "13px",
                        text_anchor: "start",
                        "{step6_title}"
                    }
                    text {
                        x: "420",
                        y: "324",
                        fill: "#94a3b8",
                        font_size: "11.5px",
                        text_anchor: "start",
                        "{step6_sub}"
                    }

                    // ステップ 7: POST UploadContent
                    line {
                        x1: "310",
                        y1: "358",
                        x2: "575",
                        y2: "358",
                        stroke: "#38bdf8",
                        stroke_width: "2.2",
                        marker_end: "url(#neg-arrow-blue)",
                    }
                    rect {
                        x: "370",
                        y: "342",
                        width: "210",
                        height: "20",
                        rx: "4",
                        fill: "rgba(15, 23, 42, 0.95)",
                        stroke: "#0284c7",
                    }
                    text {
                        x: "475",
                        y: "356",
                        fill: "#38bdf8",
                        font_weight: "bold",
                        font_size: "12.5px",
                        text_anchor: "middle",
                        "{step7_title}"
                    }
                    text {
                        x: "475",
                        y: "376",
                        fill: "#94a3b8",
                        font_size: "11.5px",
                        text_anchor: "middle",
                        "{step7_sub}"
                    }

                    // ステップ 8 & 9: サーバー側検証 & CAS 保存
                    path {
                        d: "M 580 395 H 680 V 425 H 585",
                        fill: "none",
                        stroke: "#34d399",
                        stroke_width: "1.8",
                        marker_end: "url(#neg-arrow-green)",
                    }
                    text {
                        x: "690",
                        y: "414",
                        fill: "#6ee7b7",
                        font_weight: "600",
                        font_size: "13px",
                        text_anchor: "start",
                        "{step8_title}"
                    }

                    line {
                        x1: "580",
                        y1: "445",
                        x2: "855",
                        y2: "445",
                        stroke: "#fbbf24",
                        stroke_width: "1.8",
                        marker_end: "url(#neg-arrow-amber)",
                    }
                    text {
                        x: "717",
                        y: "438",
                        fill: "#fbbf24",
                        font_weight: "600",
                        text_anchor: "middle",
                        "{step9_title}"
                    }

                    // ステップ 10: アップロード完了通知
                    line {
                        x1: "580",
                        y1: "470",
                        x2: "315",
                        y2: "470",
                        stroke: "#38bdf8",
                        stroke_width: "1.8",
                        stroke_dasharray: "4 4",
                        marker_end: "url(#neg-arrow-blue)",
                    }
                    text {
                        x: "447",
                        y: "463",
                        fill: "#7dd3fc",
                        font_size: "12px",
                        text_anchor: "middle",
                        "{step10_title}"
                    }

                    // ステップ 11: SubmitEvent 再送
                    line {
                        x1: "310",
                        y1: "505",
                        x2: "575",
                        y2: "505",
                        stroke: "#38bdf8",
                        stroke_width: "2.2",
                        marker_end: "url(#neg-arrow-blue)",
                    }
                    rect {
                        x: "365",
                        y: "489",
                        width: "220",
                        height: "20",
                        rx: "4",
                        fill: "rgba(15, 23, 42, 0.95)",
                        stroke: "#0284c7",
                    }
                    text {
                        x: "475",
                        y: "503",
                        fill: "#38bdf8",
                        font_weight: "bold",
                        font_size: "12.5px",
                        text_anchor: "middle",
                        "{step11_title}"
                    }

                    // ステップ 12: 全コンテンツ充足確認
                    line {
                        x1: "580",
                        y1: "532",
                        x2: "855",
                        y2: "532",
                        stroke: "#fbbf24",
                        stroke_width: "1.8",
                        marker_end: "url(#neg-arrow-amber)",
                    }
                    text {
                        x: "717",
                        y: "525",
                        fill: "#fde68a",
                        font_size: "12.5px",
                        text_anchor: "middle",
                        "{step12_title}"
                    }

                    // ステップ 13: イベント保存
                    line {
                        x1: "580",
                        y1: "565",
                        x2: "1045",
                        y2: "565",
                        stroke: "#ec4899",
                        stroke_width: "1.8",
                        marker_end: "url(#neg-arrow-purple)",
                    }
                    text {
                        x: "812",
                        y: "558",
                        fill: "#f472b6",
                        font_weight: "600",
                        text_anchor: "middle",
                        "{step13_title}"
                    }

                    // ステップ 14: 確定成功レスポンス
                    line {
                        x1: "580",
                        y1: "605",
                        x2: "315",
                        y2: "605",
                        stroke: "#34d399",
                        stroke_width: "2.2",
                        marker_end: "url(#neg-arrow-green)",
                    }
                    rect {
                        x: "370",
                        y: "589",
                        width: "210",
                        height: "20",
                        rx: "4",
                        fill: "rgba(15, 23, 42, 0.95)",
                        stroke: "#059669",
                    }
                    text {
                        x: "475",
                        y: "603",
                        fill: "#34d399",
                        font_weight: "bold",
                        font_size: "12.5px",
                        text_anchor: "middle",
                        "{step14_title}"
                    }

                    // ステップ 15: UI 確定
                    line {
                        x1: "310",
                        y1: "645",
                        x2: "95",
                        y2: "645",
                        stroke: "#34d399",
                        stroke_width: "1.8",
                        stroke_dasharray: "4 4",
                        marker_end: "url(#neg-arrow-green)",
                    }
                    text {
                        x: "202",
                        y: "638",
                        fill: "#86efac",
                        font_weight: "600",
                        text_anchor: "middle",
                        "{step15_title}"
                    }
                }
            }

            // 説明ブロック
            div { style: "display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1.2rem; margin-top: 0.5rem;",
                div { style: "background: rgba(245, 158, 11, 0.05); border: 1px solid rgba(245, 158, 11, 0.2); border-radius: var(--radius-sm); padding: 1.2rem; display: grid; gap: 0.5rem;",
                    h4 { style: "font-size: 0.95rem; font-weight: 700; color: #fbbf24; margin: 0; display: flex; align-items: center; gap: 0.5rem;",
                        span { "💡" }
                        span {
                            {
                                language
                                    .label(
                                        "Why Diff Hash Negotiation?",
                                        "なぜ差分ハッシュ・ネゴシエーションが必要か？",
                                        "Kial diferenca negocado?",
                                    )
                            }
                        }
                    }
                    p { style: "font-size: 0.86rem; color: var(--text-secondary); margin: 0; line-height: 1.6;",
                        {
                            language
                                .label(
                                    "In definy, a module commit records a snapshot of all its parts. If expressions were embedded into every commit, updating 1 part in a module of 100 parts would re-send all 99 unchanged expressions. Content-addressing separates the immutable AST blobs from the commit metadata, enabling 0-byte transfer for unchanged parts.",
                                    "definy ではモジュールコミットはモジュール内全パーツのスナップショットを記録します。式全体をコミットバイナリに毎回インラインで埋め込むと、100個のパーツのうち1個を変更しただけで残り99個の重複した式も毎回送信・保存されてしまいます。CAS（コンテンツアドレス）により不変の式を独立管理し、差分ハッシュ交渉で未登録の式のみをアップロードします。",
                                    "En definy, modulo-komito enhavas ĉiujn partojn. Diferenca negocado evitas resendi netuŝitajn partojn.",
                                )
                        }
                    }
                }

                div { style: "background: rgba(16, 185, 129, 0.05); border: 1px solid rgba(16, 185, 129, 0.2); border-radius: var(--radius-sm); padding: 1.2rem; display: grid; gap: 0.5rem;",
                    h4 { style: "font-size: 0.95rem; font-weight: 700; color: #34d399; margin: 0; display: flex; align-items: center; gap: 0.5rem;",
                        span { "🛡️" }
                        span {
                            {
                                language
                                    .label(
                                        "Zero Trust & Cryptographic Integrity",
                                        "ゼロトラストと暗号学的完全性",
                                        "Nula Fido kaj Kriptografia Integreco",
                                    )
                            }
                        }
                    }
                    p { style: "font-size: 0.86rem; color: var(--text-secondary); margin: 0; line-height: 1.6;",
                        {
                            language
                                .label(
                                    "Every content item uploaded is verified: SHA256(content_bytes) must match the requested content_hash exactly. The commit event itself is signed with the author's Ed25519 private key. Tampering with either the commit or the expression blobs is mathematically impossible without detection.",
                                    "アップロードされた各コンテンツバイナリは、サーバーおよびクライアントの両方で SHA256(bytes) == content_hash が厳密に検証されます。コミットイベント自体も作成者の Ed25519 秘密鍵で署名されているため、メタデータまたは式のどちらか一方でも改ざんされた場合は即座に検知・拒絶されます。",
                                    "Ĉiu alŝutita enhavo estas kontrolata per SHA-256 kaj Ed25519. Neniu modifo povas pasi nerimarkita.",
                                )
                        }
                    }
                }
            }
        }
    }
}
