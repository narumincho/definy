use dioxus::prelude::*;

use crate::language::Language;

#[component]
pub fn ArchitectureOverview(language: Language) -> Element {
    rsx! {
        div { style: "display: grid; gap: 1rem; line-height: 1.6;",
            div { style: "display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1rem;",
                // 1. 通信層: Connect-RPC
                div { style: "padding: 1rem 1.1rem; background: rgba(59, 130, 246, 0.08); border: 1px solid rgba(59, 130, 246, 0.25); border-radius: var(--radius-sm); display: grid; gap: 0.5rem;",
                    div { style: "display: flex; align-items: center; gap: 0.5rem; color: #60a5fa; font-weight: 600; font-size: 0.95rem;",
                        span { "🌐" }
                        span {
                            {
                                language
                                    .label(
                                        "1. Transport: Connect-RPC",
                                        "1. 通信層: Connect-RPC",
                                        "1. Transporto: Connect-RPC",
                                    )
                            }
                        }
                    }
                    p { style: "font-size: 0.83rem; color: var(--text-secondary); margin: 0;",
                        {
                            language
                                .label(
                                    "Standard RPC protocol built on HTTP POST. Uses proto/definy/v1/event.proto definitions. Supports both JSON (browser/dev) and Protobuf binary over standard HTTP/1.1 and HTTP/2 without browser gRPC-web proxy.",
                                    "HTTP POST 上に構築された最新の RPC プロトコル。proto/definy/v1/event.proto スキーマに基づき、ブラウザとサーバー間で JSON および Protobuf バイナリを直接やり取りします。gRPC-web プロキシ不要で標準 HTTP/1.1・HTTP/2 で動作します。",
                                    "Norma RPC-protokolo bazita sur HTTP POST. Ĝi subtenas JSON kaj Protobuf rekte sen gRPC-web prokurilo.",
                                )
                        }
                    }
                    div { style: "font-family: monospace; font-size: 0.76rem; background: rgba(0, 0, 0, 0.2); padding: 0.35rem 0.5rem; border-radius: 4px; color: #93c5fd;",
                        {"POST /definy.v1.EventService/{GetEvents, GetEvent, SubmitEvent}"}
                    }
                }

                // 2. 暗号・検証層: Deterministic CBOR
                div { style: "padding: 1rem 1.1rem; background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.25); border-radius: var(--radius-sm); display: grid; gap: 0.5rem;",
                    div { style: "display: flex; align-items: center; gap: 0.5rem; color: #34d399; font-weight: 600; font-size: 0.95rem;",
                        span { "🔐" }
                        span {
                            {
                                language
                                    .label(
                                        "2. Cryptography: Deterministic CBOR",
                                        "2. 暗号・検証層: Deterministic CBOR",
                                        "2. Kriptografio: Determina CBOR",
                                    )
                            }
                        }
                    }
                    p { style: "font-size: 0.83rem; color: var(--text-secondary); margin: 0;",
                        {
                            language
                                .label(
                                    "RFC 8949 Deterministic Encoding ensures identical bytes across all platforms. Ed25519 signs this exact byte string. EventHash and AST ContentHash are SHA-256 digests of these deterministic items.",
                                    "RFC 8949 に準拠した決定論的 CBOR。キー順や数値表現が一意に正規化され、どの環境でも完全同一のバイト列を生成。Ed25519 署名と SHA-256 ハッシュ（EventHash / ContentHash）により、サーバーを介しても改ざんが 100% 検知可能です。",
                                    "RFC 8949 certigas identajn bajtojn. Ed25519 subskribas tiun bajtoĉenon, kaj SHA-256 donas EventHash kaj ContentHash.",
                                )
                        }
                    }
                    div { style: "font-family: monospace; font-size: 0.76rem; background: rgba(0, 0, 0, 0.2); padding: 0.35rem 0.5rem; border-radius: 4px; color: #6ee7b7;",
                        {"bytes signed_event_bytes = Tag(24, CBOR_Bytes) + Ed25519_Sig"}
                    }
                }

                // 3. ゼロトラスト・オフライン
                div { style: "padding: 1rem 1.1rem; background: rgba(168, 85, 247, 0.08); border: 1px solid rgba(168, 85, 247, 0.25); border-radius: var(--radius-sm); display: grid; gap: 0.5rem;",
                    div { style: "display: flex; align-items: center; gap: 0.5rem; color: #c084fc; font-weight: 600; font-size: 0.95rem;",
                        span { "⚡" }
                        span {
                            {
                                language
                                    .label(
                                        "3. Zero-Trust & Offline First",
                                        "3. ゼロトラスト & オフライン即応",
                                        "3. Nula Fido & Senreta Unua",
                                    )
                            }
                        }
                    }
                    p { style: "font-size: 0.83rem; color: var(--text-secondary); margin: 0;",
                        {
                            language
                                .label(
                                    "Events are signed locally on the client. IndexedDB caches signed event bytes. Even if the server is compromised or offline, client-side signature verification guarantees authenticity and local edits can be queued.",
                                    "イベントはクライアントの秘密鍵でローカル署名。署名済みバイナリは IndexedDB に即時キャッシュされます。サーバーを信頼（トラスト）する必要がなく、オフライン時でもローカルキューから再送・検証が可能です。",
                                    "Eventoj estas subskribitaj loke. IndexedDB konservas ilin. Kliento ĉiam kontrolas subskribojn sen dependi de servila fido.",
                                )
                        }
                    }
                    div { style: "font-family: monospace; font-size: 0.76rem; background: rgba(0, 0, 0, 0.2); padding: 0.35rem 0.5rem; border-radius: 4px; color: #e9d5ff;",
                        {"verify_and_deserialize(bytes) -> Result<(Signature, Event)>"}
                    }
                }

                // 4. 差分ハッシュ・ネゴシエーション & CAS
                div { style: "padding: 1rem 1.1rem; background: rgba(245, 158, 11, 0.08); border: 1px solid rgba(245, 158, 11, 0.25); border-radius: var(--radius-sm); display: grid; gap: 0.5rem;",
                    div { style: "display: flex; align-items: center; gap: 0.5rem; color: #fbbf24; font-weight: 600; font-size: 0.95rem;",
                        span { "🌳" }
                        span {
                            {
                                language
                                    .label(
                                        "4. Diff Hash Negotiation & CAS",
                                        "4. 差分ハッシュ交渉 & CAS (Git方式)",
                                        "4. Diferenca Haŝ-Negocado & CAS",
                                    )
                            }
                        }
                    }
                    p { style: "font-size: 0.83rem; color: var(--text-secondary); margin: 0;",
                        {
                            language
                                .label(
                                    "Like Git's tree & blob separation, expressions are stored as content-addressed blobs. Commits only send metadata and content hashes. Missing hashes are negotiated and uploaded incrementally, avoiding redundant data transfer.",
                                    "Git の Tree / Blob 分離と同様に、パーツの式 (AST) は SHA-256 コンテンツアドレス (ch-) で分離管理。コミットはメタデータとハッシュ参照のみを含みます。サーバーと不足ハッシュを自動ネゴシエーションし、未登録の差分式バイナリのみを転送します。",
                                    "Simile al Git (arbo kaj blobo), esprimoj estas konservitaj laŭ enhav-adreso. Mankantaj haŝoj estas negocitaj kaj alŝutitaj diference.",
                                )
                        }
                    }
                    div { style: "font-family: monospace; font-size: 0.76rem; background: rgba(0, 0, 0, 0.2); padding: 0.35rem 0.5rem; border-radius: 4px; color: #fde68a;",
                        {"CheckMissingHashes -> UploadContent -> SubmitEvent"}
                    }
                }
            }
        }
    }
}
