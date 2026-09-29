use dioxus::prelude::*;

use crate::language::Language;

#[component]
pub fn NegotiationSequenceDiagram(language: Language) -> Element {
    rsx! {
        div { style: "display: grid; gap: 1rem;",
            p { style: "font-size: 0.86rem; color: var(--text-secondary); margin: 0; line-height: 1.5;",
                {
                    language
                        .label(
                            "Sequence of Git-style Content-Addressed Storage (CAS) and Diff Hash Negotiation between client and server:",
                            "Git の Tree / Blob 分離モデルに基づくコンテンツアドレスストレージ (CAS) と、クライアント・サーバー間の差分ハッシュ・ネゴシエーションの通信シーケンス:",
                            "Sekvenco de enhav-adresita stokado kaj diferenca haŝ-negocado inter kliento kaj servilo:",
                        )
                }
            }

            // SVG シーケンス図
            div { style: "background: #090d16; border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 1rem; overflow-x: auto; display: flex; justify-content: center;",
                svg {
                    view_box: "0 0 920 620",
                    style: "width: 100%; height: auto; max-width: 920px; font-family: ui-monospace, monospace; font-size: 11px;",

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
                            path { d: "M 0 1 L 10 5 L 0 9 z", fill: "#a78bfa" }
                        }
                    }

                    // アクターライン
                    line {
                        x1: "80",
                        y1: "55",
                        x2: "80",
                        y2: "590",
                        stroke: "#334155",
                        stroke_dasharray: "4 4",
                    }
                    line {
                        x1: "250",
                        y1: "55",
                        x2: "250",
                        y2: "590",
                        stroke: "#334155",
                        stroke_dasharray: "4 4",
                    }
                    line {
                        x1: "470",
                        y1: "55",
                        x2: "470",
                        y2: "590",
                        stroke: "#334155",
                        stroke_dasharray: "4 4",
                    }
                    line {
                        x1: "690",
                        y1: "55",
                        x2: "690",
                        y2: "590",
                        stroke: "#334155",
                        stroke_dasharray: "4 4",
                    }
                    line {
                        x1: "850",
                        y1: "55",
                        x2: "850",
                        y2: "590",
                        stroke: "#334155",
                        stroke_dasharray: "4 4",
                    }

                    // アクターボックス
                    rect {
                        x: "20",
                        y: "15",
                        width: "120",
                        height: "36",
                        rx: "6",
                        fill: "#1e293b",
                        stroke: "#3b82f6",
                        stroke_width: "1.5",
                    }
                    text {
                        x: "80",
                        y: "37",
                        fill: "#93c5fd",
                        font_weight: "bold",
                        text_anchor: "middle",
                        "User / UI"
                    }

                    rect {
                        x: "185",
                        y: "15",
                        width: "130",
                        height: "36",
                        rx: "6",
                        fill: "#1e293b",
                        stroke: "#8b5cf6",
                        stroke_width: "1.5",
                    }
                    text {
                        x: "250",
                        y: "37",
                        fill: "#c4b5fd",
                        font_weight: "bold",
                        text_anchor: "middle",
                        "definy-ui (Client)"
                    }

                    rect {
                        x: "395",
                        y: "15",
                        width: "150",
                        height: "36",
                        rx: "6",
                        fill: "#1e293b",
                        stroke: "#0284c7",
                        stroke_width: "1.5",
                    }
                    text {
                        x: "470",
                        y: "37",
                        fill: "#38bdf8",
                        font_weight: "bold",
                        text_anchor: "middle",
                        "Connect-RPC Gateway"
                    }

                    rect {
                        x: "625",
                        y: "15",
                        width: "130",
                        height: "36",
                        rx: "6",
                        fill: "#1e293b",
                        stroke: "#f59e0b",
                        stroke_width: "1.5",
                    }
                    text {
                        x: "690",
                        y: "37",
                        fill: "#fbbf24",
                        font_weight: "bold",
                        text_anchor: "middle",
                        "CAS (contents)"
                    }

                    rect {
                        x: "795",
                        y: "15",
                        width: "110",
                        height: "36",
                        rx: "6",
                        fill: "#1e293b",
                        stroke: "#ec4899",
                        stroke_width: "1.5",
                    }
                    text {
                        x: "850",
                        y: "37",
                        fill: "#f472b6",
                        font_weight: "bold",
                        text_anchor: "middle",
                        "Event Store"
                    }

                    // ステップ 1: コミット作成・ハッシュ計算
                    line {
                        x1: "80",
                        y1: "80",
                        x2: "245",
                        y2: "80",
                        stroke: "#3b82f6",
                        stroke_width: "1.5",
                        marker_end: "url(#neg-arrow-blue)",
                    }
                    text {
                        x: "162",
                        y: "73",
                        fill: "#93c5fd",
                        text_anchor: "middle",
                        "1. Edit Part Expression"
                    }

                    path {
                        d: "M 250 95 H 320 V 125 H 255",
                        fill: "none",
                        stroke: "#a78bfa",
                        stroke_width: "1.5",
                        marker_end: "url(#neg-arrow-purple)",
                    }
                    text {
                        x: "328",
                        y: "107",
                        fill: "#c4b5fd",
                        text_anchor: "start",
                        "2. Compute ContentHash: ch = SHA256(CBOR(expr))"
                    }
                    text {
                        x: "328",
                        y: "120",
                        fill: "#94a3b8",
                        font_size: "9.5px",
                        text_anchor: "start",
                        "Create ModuleCommit with part.content_hash, sign Ed25519"
                    }

                    // ステップ 3: 初回 SubmitEvent (差分ネゴシエーション開始)
                    line {
                        x1: "250",
                        y1: "155",
                        x2: "465",
                        y2: "155",
                        stroke: "#38bdf8",
                        stroke_width: "2",
                        marker_end: "url(#neg-arrow-blue)",
                    }
                    rect {
                        x: "280",
                        y: "140",
                        width: "155",
                        height: "17",
                        rx: "3",
                        fill: "rgba(15, 23, 42, 0.9)",
                        stroke: "#0284c7",
                    }
                    text {
                        x: "357",
                        y: "152",
                        fill: "#38bdf8",
                        font_weight: "bold",
                        text_anchor: "middle",
                        "3. POST SubmitEvent"
                    }
                    text {
                        x: "357",
                        y: "170",
                        fill: "#94a3b8",
                        font_size: "9.5px",
                        text_anchor: "middle",
                        {"Payload: signed_event_bytes (references ch-abc)"}
                    }

                    // ステップ 4: サーバー側で CAS 照会
                    line {
                        x1: "470",
                        y1: "195",
                        x2: "685",
                        y2: "195",
                        stroke: "#fbbf24",
                        stroke_width: "1.5",
                        marker_end: "url(#neg-arrow-amber)",
                    }
                    text {
                        x: "577",
                        y: "188",
                        fill: "#fbbf24",
                        text_anchor: "middle",
                        "4. Check missing content hashes: filter_missing([ch-abc])"
                    }

                    line {
                        x1: "690",
                        y1: "220",
                        x2: "475",
                        y2: "220",
                        stroke: "#fbbf24",
                        stroke_width: "1.5",
                        stroke_dasharray: "4 4",
                        marker_end: "url(#neg-arrow-amber)",
                    }
                    text {
                        x: "577",
                        y: "213",
                        fill: "#fde68a",
                        text_anchor: "middle",
                        "Missing: [\"ch-abc\"]"
                    }

                    // ステップ 5: ネゴシエーションレスポンス: missing_content
                    line {
                        x1: "470",
                        y1: "250",
                        x2: "255",
                        y2: "250",
                        stroke: "#f59e0b",
                        stroke_width: "2",
                        marker_end: "url(#neg-arrow-amber)",
                    }
                    rect {
                        x: "285",
                        y: "235",
                        width: "150",
                        height: "17",
                        rx: "3",
                        fill: "rgba(15, 23, 42, 0.9)",
                        stroke: "#d97706",
                    }
                    text {
                        x: "360",
                        y: "247",
                        fill: "#fbbf24",
                        font_weight: "bold",
                        text_anchor: "middle",
                        "5. status: \"missing_content\""
                    }
                    text {
                        x: "360",
                        y: "265",
                        fill: "#fde68a",
                        font_size: "9.5px",
                        text_anchor: "middle",
                        {"missingContentHashes: [\"ch-abc\"]"}
                    }

                    // ステップ 6: 不足分のみ抽出して UploadContent
                    path {
                        d: "M 250 285 H 320 V 310 H 255",
                        fill: "none",
                        stroke: "#a78bfa",
                        stroke_width: "1.5",
                        marker_end: "url(#neg-arrow-purple)",
                    }
                    text {
                        x: "328",
                        y: "297",
                        fill: "#c4b5fd",
                        text_anchor: "start",
                        "6. Client isolates missing expression AST"
                    }
                    text {
                        x: "328",
                        y: "309",
                        fill: "#94a3b8",
                        font_size: "9.5px",
                        text_anchor: "start",
                        "Only new/modified parts are prepared for upload"
                    }

                    line {
                        x1: "250",
                        y1: "340",
                        x2: "465",
                        y2: "340",
                        stroke: "#38bdf8",
                        stroke_width: "2",
                        marker_end: "url(#neg-arrow-blue)",
                    }
                    rect {
                        x: "280",
                        y: "325",
                        width: "155",
                        height: "17",
                        rx: "3",
                        fill: "rgba(15, 23, 42, 0.9)",
                        stroke: "#0284c7",
                    }
                    text {
                        x: "357",
                        y: "337",
                        fill: "#38bdf8",
                        font_weight: "bold",
                        text_anchor: "middle",
                        "7. POST UploadContent"
                    }
                    text {
                        x: "357",
                        y: "355",
                        fill: "#94a3b8",
                        font_size: "9.5px",
                        text_anchor: "middle",
                        {"items: [{ contentHash: \"ch-abc\", contentBytes }]"}
                    }

                    // ステップ 8: サーバー側でハッシュ検証 & CAS 永続化
                    path {
                        d: "M 470 375 H 540 V 400 H 475",
                        fill: "none",
                        stroke: "#34d399",
                        stroke_width: "1.5",
                        marker_end: "url(#neg-arrow-green)",
                    }
                    text {
                        x: "548",
                        y: "387",
                        fill: "#6ee7b7",
                        text_anchor: "start",
                        "8. Verify: SHA256(bytes) == ch-abc"
                    }

                    line {
                        x1: "470",
                        y1: "420",
                        x2: "685",
                        y2: "420",
                        stroke: "#fbbf24",
                        stroke_width: "1.5",
                        marker_end: "url(#neg-arrow-amber)",
                    }
                    text {
                        x: "577",
                        y: "413",
                        fill: "#fbbf24",
                        text_anchor: "middle",
                        "9. save_content(ch-abc, bytes) -> SurrealDB contents"
                    }

                    line {
                        x1: "470",
                        y1: "445",
                        x2: "255",
                        y2: "445",
                        stroke: "#38bdf8",
                        stroke_width: "1.5",
                        stroke_dasharray: "4 4",
                        marker_end: "url(#neg-arrow-blue)",
                    }
                    text {
                        x: "362",
                        y: "440",
                        fill: "#7dd3fc",
                        text_anchor: "middle",
                        "10. storedContentHashes: [\"ch-abc\"]"
                    }

                    // ステップ 11: SubmitEvent 再送
                    line {
                        x1: "250",
                        y1: "480",
                        x2: "465",
                        y2: "480",
                        stroke: "#38bdf8",
                        stroke_width: "2",
                        marker_end: "url(#neg-arrow-blue)",
                    }
                    rect {
                        x: "280",
                        y: "465",
                        width: "155",
                        height: "17",
                        rx: "3",
                        fill: "rgba(15, 23, 42, 0.9)",
                        stroke: "#0284c7",
                    }
                    text {
                        x: "357",
                        y: "477",
                        fill: "#38bdf8",
                        font_weight: "bold",
                        text_anchor: "middle",
                        "11. Re-POST SubmitEvent"
                    }

                    // ステップ 12: 今度は全コンテンツ充足、Ed25519 検証、イベント保存
                    line {
                        x1: "470",
                        y1: "505",
                        x2: "685",
                        y2: "505",
                        stroke: "#fbbf24",
                        stroke_width: "1.5",
                        marker_end: "url(#neg-arrow-amber)",
                    }
                    text {
                        x: "577",
                        y: "500",
                        fill: "#fde68a",
                        text_anchor: "middle",
                        "12. All referenced hashes verified present in CAS"
                    }

                    line {
                        x1: "470",
                        y1: "535",
                        x2: "845",
                        y2: "535",
                        stroke: "#ec4899",
                        stroke_width: "1.5",
                        marker_end: "url(#neg-arrow-purple)",
                    }
                    text {
                        x: "657",
                        y: "528",
                        fill: "#f472b6",
                        text_anchor: "middle",
                        "13. save_event(event, sig, bytes) -> SurrealDB events"
                    }

                    line {
                        x1: "470",
                        y1: "565",
                        x2: "255",
                        y2: "565",
                        stroke: "#34d399",
                        stroke_width: "2",
                        marker_end: "url(#neg-arrow-green)",
                    }
                    rect {
                        x: "295",
                        y: "550",
                        width: "130",
                        height: "17",
                        rx: "3",
                        fill: "rgba(15, 23, 42, 0.9)",
                        stroke: "#059669",
                    }
                    text {
                        x: "360",
                        y: "562",
                        fill: "#34d399",
                        font_weight: "bold",
                        text_anchor: "middle",
                        "14. status: \"ok\""
                    }
                    text {
                        x: "360",
                        y: "580",
                        fill: "#6ee7b7",
                        font_size: "9.5px",
                        text_anchor: "middle",
                        {"eventHash: \"ev-xyz...\""}
                    }

                    line {
                        x1: "250",
                        y1: "590",
                        x2: "85",
                        y2: "590",
                        stroke: "#34d399",
                        stroke_width: "1.5",
                        stroke_dasharray: "4 4",
                        marker_end: "url(#neg-arrow-green)",
                    }
                    text {
                        x: "167",
                        y: "585",
                        fill: "#86efac",
                        text_anchor: "middle",
                        "15. UI Confirmed & Projected"
                    }
                }
            }

            // 説明ブロック
            div { style: "display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1rem; margin-top: 0.5rem;",
                div { style: "background: rgba(245, 158, 11, 0.05); border: 1px solid rgba(245, 158, 11, 0.2); border-radius: var(--radius-sm); padding: 1rem; display: grid; gap: 0.4rem;",
                    h4 { style: "font-size: 0.88rem; font-weight: 700; color: #fbbf24; margin: 0;",
                        {
                            language
                                .label(
                                    "Why Diff Negotiation?",
                                    "なぜ差分ネゴシエーションが必要か？",
                                    "Kial diferenca negocado?",
                                )
                        }
                    }
                    p { style: "font-size: 0.82rem; color: var(--text-secondary); margin: 0; line-height: 1.5;",
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

                div { style: "background: rgba(16, 185, 129, 0.05); border: 1px solid rgba(16, 185, 129, 0.2); border-radius: var(--radius-sm); padding: 1rem; display: grid; gap: 0.4rem;",
                    h4 { style: "font-size: 0.88rem; font-weight: 700; color: #34d399; margin: 0;",
                        {
                            language
                                .label(
                                    "Zero Trust & Cryptographic Integrity",
                                    "ゼロトラストと暗号学的完全性",
                                    "Nula Fido kaj Kriptografia Integreco",
                                )
                        }
                    }
                    p { style: "font-size: 0.82rem; color: var(--text-secondary); margin: 0; line-height: 1.5;",
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
