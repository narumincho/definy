use dioxus::prelude::*;

use crate::language::Language;

#[component]
pub fn DataLayersExplanation(language: Language) -> Element {
    rsx! {
        div { style: "display: grid; gap: 1rem;",
            p { style: "font-size: 0.86rem; color: var(--text-secondary); margin: 0; line-height: 1.5;",
                {
                    language
                        .label(
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
                        span { style: "font-weight: 700; color: #60a5fa; font-size: 1rem;",
                            "Outer: Connect-RPC Envelope"
                        }
                        span { style: "background: rgba(59, 130, 246, 0.2); color: #93c5fd; font-size: 0.72rem; padding: 0.2rem 0.5rem; border-radius: 4px; font-weight: 600;",
                            "Transport Layer"
                        }
                    }
                    ul { style: "margin: 0; padding-left: 1.2rem; font-size: 0.82rem; color: var(--text-secondary); display: grid; gap: 0.4rem;",
                        li {
                            strong { {language.label("Role: ", "役割: ", "Rolo: ")} }
                            {
                                language
                                    .label(
                                        "Routing, HTTP negotiation, streaming, error codes.",
                                        "ルーティング、HTTP ネゴシエーション、ストリーミング、標準エラー応答。",
                                        "Enkursigo, HTTP negocado, erarkodoj.",
                                    )
                            }
                        }
                        li {
                            strong { {language.label("Format: ", "形式: ", "Formato: ")} }
                            "Protobuf binary / JSON (Connect-Protocol-Version: 1)"
                        }
                        li {
                            strong { {language.label("Determinism: ", "決定論性: ", "Determinismo: ")} }
                            {
                                language
                                    .label(
                                        "Non-deterministic (field order and zero-value omission may vary).",
                                        "非決定論的（フィールド順や未設定値のシリアライズ順序が不定）。",
                                        "Ne-determina.",
                                    )
                            }
                        }
                        li {
                            strong { {language.label("Lifespan: ", "寿命: ", "Vivdaŭro: ")} }
                            {
                                language
                                    .label(
                                        "Ephemeral (exists only during HTTP request/response transit).",
                                        "一時的（HTTP 送受信中のみ存在）。",
                                        "Efema (dum HTTP transporto).",
                                    )
                            }
                        }
                    }
                    div { style: "font-family: monospace; font-size: 0.74rem; background: rgba(0, 0, 0, 0.3); padding: 0.6rem; border-radius: 4px; color: #bfdbfe; overflow-x: auto; white-space: pre;",
                        {
                            "message EventItem {\n  string event_hash = 1;\n  bytes signed_event_bytes = 2;\n  string account_id = 3;\n  string event_type = 4;\n  string created_at_rfc3339 = 5;\n}"
                        }
                    }
                }

                // 内側
                div { style: "border: 1px solid rgba(16, 185, 129, 0.3); background: rgba(16, 185, 129, 0.05); border-radius: var(--radius-sm); padding: 1.2rem; display: grid; gap: 0.8rem;",
                    div { style: "display: flex; justify-content: space-between; align-items: center;",
                        span { style: "font-weight: 700; color: #34d399; font-size: 1rem;",
                            "Inner: Deterministic CBOR"
                        }
                        span { style: "background: rgba(16, 185, 129, 0.2); color: #a7f3d0; font-size: 0.72rem; padding: 0.2rem 0.5rem; border-radius: 4px; font-weight: 600;",
                            "Cryptographic Layer"
                        }
                    }
                    ul { style: "margin: 0; padding-left: 1.2rem; font-size: 0.82rem; color: var(--text-secondary); display: grid; gap: 0.4rem;",
                        li {
                            strong { {language.label("Role: ", "役割: ", "Rolo: ")} }
                            {
                                language
                                    .label(
                                        "Permanent tamper-evident event log, AST storage, ContentHash linkage.",
                                        "改ざん不能な永続イベントログ、AST・型定義の保持、ContentHash 連鎖。",
                                        "Nekoruptebla eventprotokolo, AST, ContentHash.",
                                    )
                            }
                        }
                        li {
                            strong { {language.label("Format: ", "形式: ", "Formato: ")} }
                            "RFC 8949 Deterministic CBOR + Ed25519 Signature"
                        }
                        li {
                            strong { {language.label("Determinism: ", "決定論性: ", "Determinismo: ")} }
                            {
                                language
                                    .label(
                                        "Strictly deterministic (canonical map sorting, fixed float representations).",
                                        "厳密に決定論的（キーのバイト順ソート・浮動小数点正規化により同一バイトを保証）。",
                                        "Strikte determina.",
                                    )
                            }
                        }
                        li {
                            strong { {language.label("Lifespan: ", "寿命: ", "Vivdaŭro: ")} }
                            {
                                language
                                    .label(
                                        "Permanent (stored in SurrealDB, IndexedDB, and content-addressed).",
                                        "永続（SurrealDB、IndexedDB にそのまま保存され未来永劫検証可能）。",
                                        "Konstanta.",
                                    )
                            }
                        }
                    }
                    div { style: "font-family: monospace; font-size: 0.74rem; background: rgba(0, 0, 0, 0.3); padding: 0.6rem; border-radius: 4px; color: #a7f3d0; overflow-x: auto; white-space: pre;",
                        {
                            "SignedEvent {\n  signature: [u8; 64], // Ed25519\n  event_binary: Tag(24, Event {\n    account_id,\n    created_at,\n    content: ModuleCommit { ... }\n  })\n}"
                        }
                    }
                }
            }
        }
    }
}
