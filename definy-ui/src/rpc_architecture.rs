use dioxus::prelude::*;

use crate::language::Language;
use crate::page_context::PageContext;

#[derive(Clone, Copy, PartialEq, Eq, Debug)]
enum ArchitectureTab {
    Overview,
    SubmitSequence,
    FetchSequence,
    DataLayers,
}

#[component]
pub fn RpcArchitectureSection(context: PageContext) -> Element {
    let mut selected_tab = use_signal(|| ArchitectureTab::Overview);
    let lang = context.language;

    let tab_btn = |tab: ArchitectureTab, label: &'static str| {
        let is_active = selected_tab() == tab;
        rsx! {
            button {
                style: format!(
                    "padding: 0.45rem 0.9rem; border-radius: var(--radius-sm); border: 1px solid {}; background: {}; color: {}; font-size: 0.84rem; font-weight: {}; cursor: pointer; transition: all 0.15s ease;",
                    if is_active { "var(--primary)" } else { "var(--border)" },
                    if is_active { "rgba(59, 130, 246, 0.15)" } else { "transparent" },
                    if is_active { "var(--primary)" } else { "var(--text-secondary)" },
                    if is_active { "600" } else { "400" },
                ),
                onclick: move |_| selected_tab.set(tab),
                "{label}"
            }
        }
    };

    rsx! {
        div {
            class: "event-detail-card",
            style: "background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-md); padding: 1.4rem; display: grid; gap: 1.2rem; margin-bottom: 1.5rem;",

            // ヘッダー部
            div { style: "display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 0.75rem;",
                div { style: "display: grid; gap: 0.3rem;",
                    div { style: "display: flex; align-items: center; gap: 0.5rem;",
                        span { style: "font-size: 1.3rem;", "📐" }
                        h2 { style: "font-size: 1.15rem; font-weight: 700; margin: 0; color: var(--text-primary);",
                            {
                                lang.label(
                                    "Architecture & Communication Mechanism",
                                    "API アーキテクチャと通信の仕組み",
                                    "Arkitekturo kaj Komunika Mekanismo",
                                )
                            }
                        }
                    }
                    p { style: "font-size: 0.85rem; color: var(--text-secondary); margin: 0; line-height: 1.45;",
                        {
                            lang.label(
                                "How definy unifies Connect-RPC transport and RFC 8949 Deterministic CBOR cryptographic storage.",
                                "definy における Connect-RPC 通信層と RFC 8949 Deterministic CBOR 暗号検証層の二重構造とシーケンス。",
                                "Kiel definy kunigas Connect-RPC transporton kaj RFC 8949 Determinan CBOR stokadon.",
                            )
                        }
                    }
                }

                // タブナビゲーション
                div { style: "display: flex; gap: 0.4rem; flex-wrap: wrap;",
                    {tab_btn(ArchitectureTab::Overview, lang.label("Overview", "概要", "Superrigardo"))}
                    {tab_btn(ArchitectureTab::SubmitSequence, lang.label("Submit Sequence", "書き込みシーケンス", "Sendada Sekvenco"))}
                    {tab_btn(ArchitectureTab::FetchSequence, lang.label("Fetch Sequence", "読み込みシーケンス", "Legada Sekvenco"))}
                    {tab_btn(ArchitectureTab::DataLayers, lang.label("Envelope & Payload", "データの二重構造", "Koverto kaj Utilaĵo"))}
                }
            }

            // タブコンテンツ
            div { style: "display: grid; gap: 1rem;",
                match selected_tab() {
                    ArchitectureTab::Overview => rsx! { ArchitectureOverview { language: lang } },
                    ArchitectureTab::SubmitSequence => rsx! { SubmitSequenceDiagram { language: lang } },
                    ArchitectureTab::FetchSequence => rsx! { FetchSequenceDiagram { language: lang } },
                    ArchitectureTab::DataLayers => rsx! { DataLayersExplanation { language: lang } },
                }
            }
        }
    }
}

#[component]
fn ArchitectureOverview(language: Language) -> Element {
    rsx! {
        div { style: "display: grid; gap: 1rem; line-height: 1.6;",
            div { style: "display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1rem;",
                // 外層カード
                div { style: "padding: 1rem 1.1rem; background: rgba(59, 130, 246, 0.08); border: 1px solid rgba(59, 130, 246, 0.25); border-radius: var(--radius-sm); display: grid; gap: 0.5rem;",
                    div { style: "display: flex; align-items: center; gap: 0.5rem; color: #60a5fa; font-weight: 600; font-size: 0.95rem;",
                        span { "🌐" }
                        span { { language.label("1. Transport: Connect-RPC", "1. 通信層: Connect-RPC", "1. Transporto: Connect-RPC") } }
                    }
                    p { style: "font-size: 0.83rem; color: var(--text-secondary); margin: 0;",
                        {
                            language.label(
                                "Standard RPC protocol built on HTTP POST. Uses proto/definy/v1/event.proto definitions. Supports both JSON (browser/dev) and Protobuf binary over standard HTTP/1.1 and HTTP/2 without browser gRPC-web proxy.",
                                "HTTP POST 上に構築された最新の RPC プロトコル。proto/definy/v1/event.proto スキーマに基づき、ブラウザとサーバー間で JSON および Protobuf バイナリを直接やり取りします。gRPC-web プロキシ不要で標準 HTTP/1.1・HTTP/2 で動作します。",
                                "Norma RPC-protokolo bazita sur HTTP POST. Ĝi subtenas JSON kaj Protobuf rekte sen gRPC-web prokurilo.",
                            )
                        }
                    }
                    div { style: "font-family: monospace; font-size: 0.76rem; background: rgba(0, 0, 0, 0.2); padding: 0.35rem 0.5rem; border-radius: 4px; color: #93c5fd;",
                        { "POST /definy.v1.EventService/{GetEvents, GetEvent, SubmitEvent}" }
                    }
                }

                // 内層カード
                div { style: "padding: 1rem 1.1rem; background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.25); border-radius: var(--radius-sm); display: grid; gap: 0.5rem;",
                    div { style: "display: flex; align-items: center; gap: 0.5rem; color: #34d399; font-weight: 600; font-size: 0.95rem;",
                        span { "🔐" }
                        span { { language.label("2. Cryptography: Deterministic CBOR", "2. 暗号・検証層: Deterministic CBOR", "2. Kriptografio: Determina CBOR") } }
                    }
                    p { style: "font-size: 0.83rem; color: var(--text-secondary); margin: 0;",
                        {
                            language.label(
                                "RFC 8949 Deterministic Encoding ensures identical bytes across all platforms. Ed25519 signs this exact byte string. EventHash and AST ContentHash are SHA-256 digests of these deterministic items.",
                                "RFC 8949 に準拠した決定論的 CBOR。キー順や数値表現が一意に正規化され、どの環境でも完全同一のバイト列を生成。Ed25519 署名と SHA-256 ハッシュ（EventHash / ContentHash）により、サーバーを介しても改ざんが 100% 検知可能です。",
                                "RFC 8949 certigas identajn bajtojn. Ed25519 subskribas tiun bajtoĉenon, kaj SHA-256 donas EventHash kaj ContentHash.",
                            )
                        }
                    }
                    div { style: "font-family: monospace; font-size: 0.76rem; background: rgba(0, 0, 0, 0.2); padding: 0.35rem 0.5rem; border-radius: 4px; color: #6ee7b7;",
                        { "bytes signed_event_bytes = Tag(24, CBOR_Bytes) + Ed25519_Sig" }
                    }
                }

                // ゼロトラスト・オフラインカード
                div { style: "padding: 1rem 1.1rem; background: rgba(168, 85, 247, 0.08); border: 1px solid rgba(168, 85, 247, 0.25); border-radius: var(--radius-sm); display: grid; gap: 0.5rem;",
                    div { style: "display: flex; align-items: center; gap: 0.5rem; color: #c084fc; font-weight: 600; font-size: 0.95rem;",
                        span { "⚡" }
                        span { { language.label("3. Zero-Trust & Offline First", "3. ゼロトラスト & オフライン即応", "3. Nula Fido & Senreta Unua") } }
                    }
                    p { style: "font-size: 0.83rem; color: var(--text-secondary); margin: 0;",
                        {
                            language.label(
                                "Events are signed locally on the client. IndexedDB caches signed event bytes. Even if the server is compromised or offline, client-side signature verification guarantees authenticity and local edits can be queued.",
                                "イベントはクライアントの秘密鍵でローカル署名。署名済みバイナリは IndexedDB に即時キャッシュされます。サーバーを信頼（トラスト）する必要がなく、オフライン時でもローカルキューから再送・検証が可能です。",
                                "Eventoj estas subskribitaj loke. IndexedDB konservas ilin. Kliento ĉiam kontrolas subskribojn sen dependi de servila fido.",
                            )
                        }
                    }
                    div { style: "font-family: monospace; font-size: 0.76rem; background: rgba(0, 0, 0, 0.2); padding: 0.35rem 0.5rem; border-radius: 4px; color: #e9d5ff;",
                        { "verify_and_deserialize(bytes) -> Result<(Signature, Event)>" }
                    }
                }
            }
        }
    }
}

#[component]
fn SubmitSequenceDiagram(language: Language) -> Element {
    rsx! {
        div { style: "display: grid; gap: 1rem;",
            p { style: "font-size: 0.86rem; color: var(--text-secondary); margin: 0; line-height: 1.5;",
                {
                    language.label(
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
                    line { x1: "90", y1: "55", x2: "90", y2: "450", stroke: "#334155", stroke_dasharray: "4 4" }
                    line { x1: "270", y1: "55", x2: "270", y2: "450", stroke: "#334155", stroke_dasharray: "4 4" }
                    line { x1: "450", y1: "55", x2: "450", y2: "450", stroke: "#334155", stroke_dasharray: "4 4" }
                    line { x1: "630", y1: "55", x2: "630", y2: "450", stroke: "#334155", stroke_dasharray: "4 4" }
                    line { x1: "780", y1: "55", x2: "780", y2: "450", stroke: "#334155", stroke_dasharray: "4 4" }

                    // アクターボックス
                    rect { x: "25", y: "15", width: "130", height: "36", rx: "6", fill: "#1e293b", stroke: "#3b82f6", stroke_width: "1.5" }
                    text { x: "90", y: "37", fill: "#93c5fd", font_weight: "bold", text_anchor: "middle", "User / UI" }

                    rect { x: "205", y: "15", width: "130", height: "36", rx: "6", fill: "#1e293b", stroke: "#8b5cf6", stroke_width: "1.5" }
                    text { x: "270", y: "37", fill: "#c4b5fd", font_weight: "bold", text_anchor: "middle", "definy-ui (WASM)" }

                    rect { x: "395", y: "15", width: "110", height: "36", rx: "6", fill: "#1e293b", stroke: "#f59e0b", stroke_width: "1.5" }
                    text { x: "450", y: "37", fill: "#fcd34d", font_weight: "bold", text_anchor: "middle", "IndexedDB" }

                    rect { x: "560", y: "15", width: "140", height: "36", rx: "6", fill: "#1e293b", stroke: "#10b981", stroke_width: "1.5" }
                    text { x: "630", y: "37", fill: "#6ee7b7", font_weight: "bold", text_anchor: "middle", "definy-server (Axum)" }

                    rect { x: "725", y: "15", width: "110", height: "36", rx: "6", fill: "#1e293b", stroke: "#ec4899", stroke_width: "1.5" }
                    text { x: "780", y: "37", fill: "#f472b6", font_weight: "bold", text_anchor: "middle", "SurrealDB" }

                    // ステップ 1: ユーザー操作
                    line { x1: "90", y1: "80", x2: "265", y2: "80", stroke: "#38bdf8", stroke_width: "1.5", marker_end: "url(#arrow-blue)" }
                    text { x: "180", y: "73", fill: "#38bdf8", text_anchor: "middle", "1. Edit Module / Parts & Click Submit" }

                    // ステップ 2: AST構築と決定論的CBORシリアライズ
                    path { d: "M 270 100 H 330 V 125 H 275", fill: "none", stroke: "#a78bfa", stroke_width: "1.5", marker_end: "url(#arrow-purple)" }
                    text { x: "338", y: "110", fill: "#c4b5fd", text_anchor: "start", "2. Build AST & Deterministic CBOR (RFC 8949)" }
                    text { x: "338", y: "123", fill: "#94a3b8", font_size: "9.5px", text_anchor: "start", "Canonical key sort, IEEE 754 float norm" }

                    // ステップ 3: Ed25519 署名
                    path { d: "M 270 145 H 330 V 170 H 275", fill: "none", stroke: "#a78bfa", stroke_width: "1.5", marker_end: "url(#arrow-purple)" }
                    text { x: "338", y: "155", fill: "#c4b5fd", text_anchor: "start", "3. Local Ed25519 Sign with SecretKey" }
                    text { x: "338", y: "168", fill: "#94a3b8", font_size: "9.5px", text_anchor: "start", "Produces Tag(24, event_bin) + 64B Signature" }

                    // ステップ 4: IndexedDB 即時保存
                    line { x1: "270", y1: "195", x2: "445", y2: "195", stroke: "#f59e0b", stroke_width: "1.5", marker_end: "url(#arrow-purple)" }
                    text { x: "360", y: "188", fill: "#fcd34d", text_anchor: "middle", "4. store_events(signed_bytes) -> Local Cache" }

                    // ステップ 5: Connect-RPC POST
                    line { x1: "270", y1: "235", x2: "625", y2: "235", stroke: "#38bdf8", stroke_width: "2", marker_end: "url(#arrow-blue)" }
                    rect { x: "310", y: "218", width: "275", height: "18", rx: "3", fill: "rgba(15, 23, 42, 0.9)", stroke: "#0284c7" }
                    text { x: "447", y: "231", fill: "#38bdf8", font_weight: "bold", text_anchor: "middle", "5. POST /definy.v1.EventService/SubmitEvent" }
                    text { x: "447", y: "250", fill: "#94a3b8", font_size: "9.5px", text_anchor: "middle", { "Payload: { signed_event_bytes: Base64(CBOR) }" } }

                    // ステップ 6: サーバー検証 (Zero-Trust)
                    path { d: "M 630 270 H 690 V 295 H 635", fill: "none", stroke: "#34d399", stroke_width: "1.5", marker_end: "url(#arrow-green)" }
                    text { x: "698", y: "280", fill: "#6ee7b7", text_anchor: "start", "6. verify_and_deserialize(&body)" }
                    text { x: "698", y: "293", fill: "#94a3b8", font_size: "9.5px", text_anchor: "start", "Verify Ed25519 signature & CBOR parse" }

                    // ステップ 7: SurrealDB 保存
                    line { x1: "630", y1: "320", x2: "775", y2: "320", stroke: "#ec4899", stroke_width: "1.5", marker_end: "url(#arrow-purple)" }
                    text { x: "705", y: "313", fill: "#f472b6", text_anchor: "middle", "7. save_event(data, sig, bytes)" }

                    // ステップ 8: SurrealDB OK
                    line { x1: "780", y1: "350", x2: "635", y2: "350", stroke: "#ec4899", stroke_width: "1.5", stroke_dasharray: "4 4", marker_end: "url(#arrow-purple)" }
                    text { x: "705", y: "343", fill: "#f472b6", text_anchor: "middle", "8. OK" }

                    // ステップ 9: Connect-RPC レスポンス
                    line { x1: "630", y1: "385", x2: "275", y2: "385", stroke: "#34d399", stroke_width: "1.8", stroke_dasharray: "4 4", marker_end: "url(#arrow-green)" }
                    text { x: "450", y: "378", fill: "#34d399", font_weight: "bold", text_anchor: "middle", { "9. 200 OK: { event_hash, status: \"ok\" }" } }

                    // ステップ 10: UI 更新
                    line { x1: "270", y1: "420", x2: "95", y2: "420", stroke: "#38bdf8", stroke_width: "1.5", stroke_dasharray: "4 4", marker_end: "url(#arrow-blue)" }
                    text { x: "180", y: "413", fill: "#38bdf8", text_anchor: "middle", "10. Render Success & Updated State" }
                }
            }

            // ステップ詳細説明
            div { style: "display: grid; gap: 0.5rem; font-size: 0.82rem; color: var(--text-secondary); background: rgba(0,0,0,0.15); padding: 0.8rem 1rem; border-radius: var(--radius-sm); border-left: 3px solid var(--primary);",
                div { style: "font-weight: 600; color: var(--text-primary);",
                    { language.label("Key Security & Reliability Points:", "重要ポイント（セキュリティと信頼性）:", "Gravaj Sekurecaj Punktoj:") }
                }
                div {
                    "• "
                    strong { { language.label("Client-Side Proof: ", "クライアント完結の暗号証明: ", "Klient-Flanka Pruvo: ") } }
                    { language.label(
                        "The server never sees the private key. It only checks the Ed25519 signature against the deterministic CBOR payload.",
                        "秘密鍵はクライアント外に一切漏洩しません。サーバーは決定論的 CBOR バイト列に対する Ed25519 署名のみを数学的に検証します。",
                        "La privata ŝlosilo neniam forlasas la klienton. La servilo nur kontrolas la subskribon.",
                    )}
                }
                div {
                    "• "
                    strong { { language.label("Immediate Offline UX: ", "オフライン即時反映: ", "Tuj Senreta Sperto: ") } }
                    { language.label(
                        "Step 4 caches the event to IndexedDB before or in parallel with network transit, guaranteeing optimistic responsiveness.",
                        "ネットワーク送信と並行して Step 4 で IndexedDB にキャッシュされるため、通信遅延や切断時にも即座にローカルへ反映されます。",
                        "IndexedDB konservas la eventon antaŭ aŭ paralele kun reta dissendo.",
                    )}
                }
            }
        }
    }
}

#[component]
fn FetchSequenceDiagram(language: Language) -> Element {
    rsx! {
        div { style: "display: grid; gap: 1rem;",
            p { style: "font-size: 0.86rem; color: var(--text-secondary); margin: 0; line-height: 1.5;",
                {
                    language.label(
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
                    line { x1: "100", y1: "55", x2: "100", y2: "410", stroke: "#334155", stroke_dasharray: "4 4" }
                    line { x1: "280", y1: "55", x2: "280", y2: "410", stroke: "#334155", stroke_dasharray: "4 4" }
                    line { x1: "460", y1: "55", x2: "460", y2: "410", stroke: "#334155", stroke_dasharray: "4 4" }
                    line { x1: "640", y1: "55", x2: "640", y2: "410", stroke: "#334155", stroke_dasharray: "4 4" }
                    line { x1: "780", y1: "55", x2: "780", y2: "410", stroke: "#334155", stroke_dasharray: "4 4" }

                    // アクターボックス
                    rect { x: "35", y: "15", width: "130", height: "36", rx: "6", fill: "#1e293b", stroke: "#3b82f6", stroke_width: "1.5" }
                    text { x: "100", y: "37", fill: "#93c5fd", font_weight: "bold", text_anchor: "middle", "Browser Screen" }

                    rect { x: "215", y: "15", width: "130", height: "36", rx: "6", fill: "#1e293b", stroke: "#8b5cf6", stroke_width: "1.5" }
                    text { x: "280", y: "37", fill: "#c4b5fd", font_weight: "bold", text_anchor: "middle", "definy-ui (WASM)" }

                    rect { x: "405", y: "15", width: "110", height: "36", rx: "6", fill: "#1e293b", stroke: "#f59e0b", stroke_width: "1.5" }
                    text { x: "460", y: "37", fill: "#fcd34d", font_weight: "bold", text_anchor: "middle", "IndexedDB" }

                    rect { x: "570", y: "15", width: "140", height: "36", rx: "6", fill: "#1e293b", stroke: "#10b981", stroke_width: "1.5" }
                    text { x: "640", y: "37", fill: "#6ee7b7", font_weight: "bold", text_anchor: "middle", "definy-server (Axum)" }

                    rect { x: "725", y: "15", width: "110", height: "36", rx: "6", fill: "#1e293b", stroke: "#ec4899", stroke_width: "1.5" }
                    text { x: "780", y: "37", fill: "#f472b6", font_weight: "bold", text_anchor: "middle", "SurrealDB" }

                    // ステップ 1: ページナビゲーション
                    line { x1: "100", y1: "80", x2: "275", y2: "80", stroke: "#38bdf8", stroke_width: "1.5", marker_end: "url(#arrow-blue2)" }
                    text { x: "190", y: "73", fill: "#38bdf8", text_anchor: "middle", "1. Open /api or Module/Event View" }

                    // ステップ 2: Connect-RPC GetEvents
                    line { x1: "280", y1: "115", x2: "635", y2: "115", stroke: "#38bdf8", stroke_width: "2", marker_end: "url(#arrow-blue2)" }
                    rect { x: "320", y: "98", width: "275", height: "18", rx: "3", fill: "rgba(15, 23, 42, 0.9)", stroke: "#0284c7" }
                    text { x: "457", y: "111", fill: "#38bdf8", font_weight: "bold", text_anchor: "middle", "2. POST /definy.v1.EventService/GetEvents" }
                    text { x: "457", y: "130", fill: "#94a3b8", font_size: "9.5px", text_anchor: "middle", { "Request: { event_type: \"...\", limit: 10 }" } }

                    // ステップ 3: データベース問い合わせ
                    line { x1: "640", y1: "150", x2: "775", y2: "150", stroke: "#ec4899", stroke_width: "1.5", marker_end: "url(#arrow-purple2)" }
                    text { x: "710", y: "143", fill: "#f472b6", text_anchor: "middle", "3. get_events(limit, offset)" }

                    // ステップ 4: データベース応答
                    line { x1: "780", y1: "180", x2: "645", y2: "180", stroke: "#ec4899", stroke_width: "1.5", stroke_dasharray: "4 4", marker_end: "url(#arrow-purple2)" }
                    text { x: "710", y: "173", fill: "#f472b6", text_anchor: "middle", "4. Event records + raw bytes" }

                    // ステップ 5: Connect-RPC レスポンス
                    line { x1: "640", y1: "215", x2: "285", y2: "215", stroke: "#34d399", stroke_width: "1.8", stroke_dasharray: "4 4", marker_end: "url(#arrow-green2)" }
                    text { x: "460", y: "208", fill: "#34d399", font_weight: "bold", text_anchor: "middle", { "5. 200 OK: GetEventsResponse { events: [EventItem] }" } }
                    text { x: "460", y: "228", fill: "#94a3b8", font_size: "9.5px", text_anchor: "middle", "Each Item has signed_event_bytes (Base64)" }

                    // ステップ 6: IndexedDB キャッシュ保存
                    line { x1: "280", y1: "255", x2: "455", y2: "255", stroke: "#f59e0b", stroke_width: "1.5", marker_end: "url(#arrow-purple2)" }
                    text { x: "370", y: "248", fill: "#fcd34d", text_anchor: "middle", "6. store_events(&bytes)" }

                    // ステップ 7: クライアント側ゼロトラスト検証
                    path { d: "M 280 280 H 340 V 305 H 285", fill: "none", stroke: "#a78bfa", stroke_width: "1.5", marker_end: "url(#arrow-purple2)" }
                    text { x: "348", y: "290", fill: "#c4b5fd", text_anchor: "start", "7. verify_and_deserialize(&bytes)" }
                    text { x: "348", y: "303", fill: "#94a3b8", font_size: "9.5px", text_anchor: "start", "Verify Ed25519 signature & compute EventHash" }

                    // ステップ 8: AST・パーツ・型のパース
                    path { d: "M 280 325 H 340 V 350 H 285", fill: "none", stroke: "#a78bfa", stroke_width: "1.5", marker_end: "url(#arrow-purple2)" }
                    text { x: "348", y: "335", fill: "#c4b5fd", text_anchor: "start", "8. Decode AST & compute ContentHash" }
                    text { x: "348", y: "348", fill: "#94a3b8", font_size: "9.5px", text_anchor: "start", "Lock function ASTs with content hashes" }

                    // ステップ 9: リアクティブ描画
                    line { x1: "280", y1: "380", x2: "105", y2: "380", stroke: "#38bdf8", stroke_width: "1.5", stroke_dasharray: "4 4", marker_end: "url(#arrow-blue2)" }
                    text { x: "190", y: "373", fill: "#38bdf8", text_anchor: "middle", "9. Render Verified Events, AST, and Types" }
                }
            }

            // 説明注記
            div { style: "display: grid; gap: 0.5rem; font-size: 0.82rem; color: var(--text-secondary); background: rgba(0,0,0,0.15); padding: 0.8rem 1rem; border-radius: var(--radius-sm); border-left: 3px solid #10b981;",
                div { style: "font-weight: 600; color: var(--text-primary);",
                    { language.label("Why Zero-Trust Client Verification Matters:", "なぜクライアント側のゼロトラスト検証が重要か:", "Kial Nulfida Klienta Kontrolo Gravas:") }
                }
                div {
                    { language.label(
                        "Even if a malicious server alters an event or database record, the client's WebAssembly code independently verifies the Ed25519 signature in Step 7. Tampered events are instantly flagged as invalid before being rendered.",
                        "万が一サーバーやデータベースが攻撃者によって改ざんされた場合でも、Step 7 でクライアント（WebAssembly）が Ed25519 署名を独立検証するため、不正データは即座に弾かれ、改ざんされたコードが実行・表示されることはありません。",
                        "Eĉ se la servilo estas modifita, la kliento ĉiam kontrolas la subskribon en Paŝo 7.",
                    )}
                }
            }
        }
    }
}

#[component]
fn DataLayersExplanation(language: Language) -> Element {
    rsx! {
        div { style: "display: grid; gap: 1rem;",
            p { style: "font-size: 0.86rem; color: var(--text-secondary); margin: 0; line-height: 1.5;",
                {
                    language.label(
                        "Comparison between the outer transport envelope (Connect-RPC) and the inner cryptographic payload (Deterministic CBOR):",
                        "外側の通信エンベロープ（Connect-RPC）と内側の暗号化・決定論的ペイロード（Deterministic CBOR）の比較と役割分担:",
                        "Komparo inter la ekstera transporta koverto kaj la interna kriptografia utilaĵo:",
                    )
                }
            }

            // テーブル・カード比較
            div { style: "display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 1rem;",
                // 外側
                div { style: "border: 1px solid rgba(59, 130, 246, 0.3); background: rgba(59, 130, 246, 0.05); border-radius: var(--radius-sm); padding: 1.2rem; display: grid; gap: 0.8rem;",
                    div { style: "display: flex; justify-content: space-between; align-items: center;",
                        span { style: "font-weight: 700; color: #60a5fa; font-size: 1rem;", "Outer: Connect-RPC Envelope" }
                        span { style: "background: rgba(59, 130, 246, 0.2); color: #93c5fd; font-size: 0.72rem; padding: 0.2rem 0.5rem; border-radius: 4px; font-weight: 600;", "Transport Layer" }
                    }
                    ul { style: "margin: 0; padding-left: 1.2rem; font-size: 0.82rem; color: var(--text-secondary); display: grid; gap: 0.4rem;",
                        li {
                            strong { { language.label("Role: ", "役割: ", "Rolo: ") } }
                            { language.label("Routing, HTTP negotiation, streaming, error codes.", "ルーティング、HTTP ネゴシエーション、ストリーミング、標準エラー応答。", "Enkursigo, HTTP negocado, erarkodoj.") }
                        }
                        li {
                            strong { { language.label("Format: ", "形式: ", "Formato: ") } }
                            "Protobuf binary / JSON (Connect-Protocol-Version: 1)"
                        }
                        li {
                            strong { { language.label("Determinism: ", "決定論性: ", "Determinismo: ") } }
                            { language.label("Non-deterministic (field order and zero-value omission may vary).", "非決定論的（フィールド順や未設定値のシリアライズ順序が不定）。", "Ne-determina.") }
                        }
                        li {
                            strong { { language.label("Lifespan: ", "寿命: ", "Vivdaŭro: ") } }
                            { language.label("Ephemeral (exists only during HTTP request/response transit).", "一時的（HTTP 送受信中のみ存在）。", "Efema (dum HTTP transporto).") }
                        }
                    }
                    div { style: "font-family: monospace; font-size: 0.74rem; background: rgba(0, 0, 0, 0.3); padding: 0.6rem; border-radius: 4px; color: #bfdbfe; overflow-x: auto; white-space: pre;",
                        { "message EventItem {\n  string event_hash = 1;\n  bytes signed_event_bytes = 2;\n  string account_id = 3;\n  string event_type = 4;\n  string created_at_rfc3339 = 5;\n}" }
                    }
                }

                // 内側
                div { style: "border: 1px solid rgba(16, 185, 129, 0.3); background: rgba(16, 185, 129, 0.05); border-radius: var(--radius-sm); padding: 1.2rem; display: grid; gap: 0.8rem;",
                    div { style: "display: flex; justify-content: space-between; align-items: center;",
                        span { style: "font-weight: 700; color: #34d399; font-size: 1rem;", "Inner: Deterministic CBOR" }
                        span { style: "background: rgba(16, 185, 129, 0.2); color: #a7f3d0; font-size: 0.72rem; padding: 0.2rem 0.5rem; border-radius: 4px; font-weight: 600;", "Cryptographic Layer" }
                    }
                    ul { style: "margin: 0; padding-left: 1.2rem; font-size: 0.82rem; color: var(--text-secondary); display: grid; gap: 0.4rem;",
                        li {
                            strong { { language.label("Role: ", "役割: ", "Rolo: ") } }
                            { language.label("Permanent tamper-evident event log, AST storage, ContentHash linkage.", "改ざん不能な永続イベントログ、AST・型定義の保持、ContentHash 連鎖。", "Nekoruptebla eventprotokolo, AST, ContentHash.") }
                        }
                        li {
                            strong { { language.label("Format: ", "形式: ", "Formato: ") } }
                            "RFC 8949 Deterministic CBOR + Ed25519 Signature"
                        }
                        li {
                            strong { { language.label("Determinism: ", "決定論性: ", "Determinismo: ") } }
                            { language.label("Strictly deterministic (canonical map sorting, fixed float representations).", "厳密に決定論的（キーのバイト順ソート・浮動小数点正規化により同一バイトを保証）。", "Strikte determina.") }
                        }
                        li {
                            strong { { language.label("Lifespan: ", "寿命: ", "Vivdaŭro: ") } }
                            { language.label("Permanent (stored in SurrealDB, IndexedDB, and content-addressed).", "永続（SurrealDB、IndexedDB にそのまま保存され未来永劫検証可能）。", "Konstanta.") }
                        }
                    }
                    div { style: "font-family: monospace; font-size: 0.74rem; background: rgba(0, 0, 0, 0.3); padding: 0.6rem; border-radius: 4px; color: #a7f3d0; overflow-x: auto; white-space: pre;",
                        { "SignedEvent {\n  signature: [u8; 64], // Ed25519\n  event_binary: Tag(24, Event {\n    account_id,\n    created_at,\n    content: ModuleCommit { ... }\n  })\n}" }
                    }
                }
            }
        }
    }
}
