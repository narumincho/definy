use dioxus::prelude::*;

use crate::Location;
use crate::page_context::PageContext;

#[component]
pub fn AboutView(context: PageContext) -> Element {
    let lang = context.language;
    let page_shell_style = crate::layout::page_shell_style("1.2rem");

    rsx! {
        div { class: "page-shell", style: "{page_shell_style}",
            div { style: "display: grid; gap: 2rem; max-width: 960px; margin: 0 auto;",

                // ヒーローセクション
                div {
                    class: "event-detail-card",
                    style: "background: linear-gradient(135deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.9) 100%); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: 2.5rem 2rem; display: flex; flex-direction: column; align-items: center; text-align: center; gap: 1.2rem; position: relative; overflow: hidden;",

                    // 背景アクセントグロー
                    div { style: "position: absolute; top: -40px; right: -40px; width: 180px; height: 180px; background: radial-gradient(circle, rgba(59, 130, 246, 0.25) 0%, transparent 70%); border-radius: 50%; pointer-events: none;" }
                    div { style: "position: absolute; bottom: -40px; left: -40px; width: 180px; height: 180px; background: radial-gradient(circle, rgba(16, 185, 129, 0.2) 0%, transparent 70%); border-radius: 50%; pointer-events: none;" }

                    // ロゴ / アイコンバッジ
                    div { style: "display: flex; align-items: center; justify-content: center; width: 72px; height: 72px; border-radius: 20px; background: rgba(59, 130, 246, 0.15); border: 1px solid rgba(59, 130, 246, 0.35); box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3); font-size: 2.2rem;",
                        "✦"
                    }

                    h1 { style: "font-size: 2.2rem; font-weight: 800; margin: 0; background: linear-gradient(135deg, #ffffff 30%, #93c5fd 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent;",
                        "definy"
                    }

                    p { style: "font-size: 1.15rem; font-weight: 600; color: #60a5fa; margin: 0; max-width: 680px; line-height: 1.45;",
                        {
                            lang.label(
                                "Pure functional language with content-addressed code and structured editing.",
                                "コンテンツアドレスと構造化編集による、壊れない純粋関数型プログラミング環境",
                                "Pura funkcia lingvo kun enhav-adresita kodo kaj strukturita redaktado.",
                            )
                        }
                    }

                    p { style: "font-size: 0.92rem; color: var(--text-secondary); margin: 0; max-width: 720px; line-height: 1.6;",
                        {
                            lang.label(
                                "definy rethinks software development from first principles. Instead of storing text files with syntax errors and fragile dependency versioning, definy treats syntax trees as first-class cryptographic objects and connects distributed developers through zero-trust event sourcing.",
                                "definy（デフィニー）は、従来の「テキストファイルと壊れやすい依存管理」からプログラミングを根本的に再構築するプロジェクトです。コードを文字列ではなく純粋な構文木（AST）として扱い、SHA-256 のコンテンツハッシュで厳密にバージョン固定。さらに決定論的 CBOR と暗号署名によるイベントソーシングにより、安全で分散協調可能な開発を実現します。",
                                "definy rekonsideras programadon. Anstataŭ tekstaj dosieroj kun sintaksaj eraroj, definy traktas sintaksarbojn kiel kriptografiajn objektojn.",
                            )
                        }
                    }

                    // クイックアクション
                    div { style: "display: flex; gap: 0.75rem; flex-wrap: wrap; justify-content: center; margin-top: 0.5rem;",
                        a {
                            href: context.href_with_lang(Location::ModuleList),
                            style: "padding: 0.6rem 1.4rem; background: var(--primary); color: #fff; text-decoration: none; border-radius: var(--radius-sm); font-weight: 600; font-size: 0.9rem; transition: opacity 0.15s ease;",
                            {
                                lang.label(
                                    "Explore Modules →",
                                    "モジュールを探す →",
                                    "Esplori Modulojn →",
                                )
                            }
                        }
                        a {
                            href: context.href_with_lang(Location::ApiOverview),
                            style: "padding: 0.6rem 1.4rem; background: rgba(255, 255, 255, 0.08); color: var(--text-primary); text-decoration: none; border: 1px solid var(--border); border-radius: var(--radius-sm); font-weight: 600; font-size: 0.9rem; transition: background 0.15s ease;",
                            {
                                lang.label(
                                    "Connect-RPC & API Specs →",
                                    "Connect-RPC API 仕様・構造 →",
                                    "Connect-RPC Specifigoj →",
                                )
                            }
                        }
                    }
                }

                // 4大コアピラー
                div { style: "display: grid; gap: 1.2rem;",
                    h2 { style: "font-size: 1.4rem; font-weight: 700; margin: 0; display: flex; align-items: center; gap: 0.6rem; color: var(--text-primary);",
                        span { "🏛️" }
                        span {
                            {
                                lang.label(
                                    "The 4 Core Pillars of definy",
                                    "definy を支える 4 つの柱",
                                    "La 4 Kolonoj de definy",
                                )
                            }
                        }
                    }

                    div { style: "display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 1.2rem;",
                        // 1. 構造化編集
                        FeatureCard {
                            icon: "🧩",
                            accent_color: "#3b82f6",
                            title: lang.label(
                                "1. Structured Editing (No Syntax Errors)",
                                "1. 構文エラーのない構造化編集",
                                "1. Strukturita Redaktado",
                            ),
                            description: lang.label(
                                "Code is edited directly as an Abstract Syntax Tree (AST), not characters in text. Parenthesis mismatches, typoed keywords, and syntax errors are mathematically impossible.",
                                "コードを文字列テキストではなく「抽象構文木（AST）」そのものとして直接編集します。括弧の閉じ忘れやキーワードのタイポといったシンタックスエラーは原理的に発生しません。整然とした Tree Layout で可視化されます。",
                                "Kodo estas redaktata rekte kiel sintaksarbo. Sintaksaj eraroj estas matematike neeblaj.",
                            ),
                            tag: "Projectional Editor",
                        }

                        // 2. コンテンツアドレス
                        FeatureCard {
                            icon: "🔗",
                            accent_color: "#10b981",
                            title: lang.label(
                                "2. Content-Addressed Immutability",
                                "2. コンテンツアドレスによる完全な依存固定",
                                "2. Enhav-Adresita Senŝanĝeco",
                            ),
                            description: lang.label(
                                "Functions and types are identified by their SHA-256 ContentHash. External updates will never silently break your code because references point to exact expressions forever.",
                                "すべての式（パーツ）や型は、正規化バイナリの SHA-256 ハッシュ（ContentHash）で一意に特定されます。関数参照は名前ではなくハッシュで固定されるため、外部ライブラリの更新で突然コードが動かなくなる事故（Breaking Changes）が永久に防がれます。",
                                "Funkcioj kaj tipoj estas identigitaj per ContentHash. Eksteraj ŝanĝoj neniam rompos vian kodon.",
                            ),
                            tag: "Deterministic SHA-256",
                        }

                        // 3. イベントソーシング & 暗号署名
                        FeatureCard {
                            icon: "🛡️",
                            accent_color: "#8b5cf6",
                            title: lang.label(
                                "3. Zero-Trust Cryptographic Events",
                                "3. ゼロトラストな暗号署名とイベントソーシング",
                                "3. Nulfidaj Kriptografiaj Eventoj",
                            ),
                            description: lang.label(
                                "Every commit and account creation is signed with Ed25519 and encoded into RFC 8949 Deterministic CBOR. The client independently verifies proofs in WebAssembly without trusting the server.",
                                "モジュールコミットやアカウント作成はすべて RFC 8949 Deterministic CBOR に変換され、Ed25519 鍵で署名された不変のイベントとして記録されます。ブラウザ内の WebAssembly が独自に署名を検証するため、中央サーバーを信用する必要がありません。",
                                "Ĉiu evento estas subskribita per Ed25519 kaj kodita per Determina CBOR.",
                            ),
                            tag: "RFC 8949 + Ed25519",
                        }

                        // 4. WebAssembly & 自己ホスティング
                        FeatureCard {
                            icon: "⚡",
                            accent_color: "#f59e0b",
                            title: lang.label(
                                "4. Self-Hosting & Native WebAssembly",
                                "4. 高速実行と自己ホスティング性",
                                "4. Mem-Gastigado & Reta Asembleo",
                            ),
                            description: lang.label(
                                "definy's compiler, typechecker, and WebAssembly emitter can run directly in the browser. definy is capable of evaluating and compiling its own language constructs natively.",
                                "definy の型検査器、AST 評価器、WebAssembly コード生成器はブラウザ（WebAssembly）上でネイティブに動作します。definy 自身の構文を definy 自身で解釈・実行できる自己ホスティング性を備えています。",
                                "La kompililo kaj tipo-kontrolilo de definy funkcias rekte en la retumilo.",
                            ),
                            tag: "WASM Compiler",
                        }
                    }
                }

                // 比較表セクション
                div { style: "display: grid; gap: 1rem;",
                    h2 { style: "font-size: 1.4rem; font-weight: 700; margin: 0; display: flex; align-items: center; gap: 0.6rem; color: var(--text-primary);",
                        span { "⚖️" }
                        span {
                            {
                                lang.label(
                                    "Traditional Programming vs. definy",
                                    "従来のプログラミング言語・環境との比較",
                                    "Tradicia Programado kontraŭ definy",
                                )
                            }
                        }
                    }

                    div { style: "overflow-x: auto; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-md);",
                        table { style: "width: 100%; border-collapse: collapse; font-size: 0.86rem; text-align: left;",
                            thead {
                                tr { style: "background: rgba(0, 0, 0, 0.25); border-bottom: 1px solid var(--border);",
                                    th { style: "padding: 0.85rem 1rem; color: var(--text-secondary); font-weight: 600;",
                                        {lang.label("Dimension", "比較項目", "Dimensio")}
                                    }
                                    th { style: "padding: 0.85rem 1rem; color: #f87171; font-weight: 600;",
                                        {
                                            lang.label(
                                                "Traditional Ecosystems",
                                                "従来のエコシステム",
                                                "Tradiciaj Ekosistemoj",
                                            )
                                        }
                                    }
                                    th { style: "padding: 0.85rem 1rem; color: #34d399; font-weight: 600;",
                                        "definy"
                                    }
                                }
                            }
                            tbody {
                                ComparisonRow {
                                    dimension: lang.label("Code Representation", "コードの保持形式", "Koda Reprezento"),
                                    traditional: lang.label(
                                        "Flat text files (.ts, .rs, .py)",
                                        "テキストファイル（文字列）",
                                        "Plataj tekstaj dosieroj",
                                    ),
                                    definy_val: lang.label(
                                        "Cryptographic AST Nodes (ContentHash)",
                                        "暗号化された構文木（ContentHash）",
                                        "Kriptografiaj AST-nodoj",
                                    ),
                                }
                                ComparisonRow {
                                    dimension: lang.label("Syntax Errors", "構文エラー", "Sintaksaj Eraroj"),
                                    traditional: lang.label(
                                        "Frequent parse/syntax errors during typing",
                                        "入力中のスペルミスやパースエラーが頻発",
                                        "Oftaj sintaksaj eraroj",
                                    ),
                                    definy_val: lang.label(
                                        "Impossible by design (Structure Editor)",
                                        "構造化編集により原理的に発生不可能",
                                        "Strukture neebla",
                                    ),
                                }
                                ComparisonRow {
                                    dimension: lang.label("Dependency Locking", "依存関係の固定", "Dependeca Ŝlosado"),
                                    traditional: lang.label(
                                        "SemVer string ranges (vulnerabilities & breakage)",
                                        "SemVer 文字列（意図しない破壊や脆弱性混入）",
                                        "SemVer vicoj",
                                    ),
                                    definy_val: lang.label(
                                        "Exact ContentHash linkage (Never breaks)",
                                        "厳密な ContentHash リンク（未来永劫不変）",
                                        "Strikta ContentHash ligo",
                                    ),
                                }
                                ComparisonRow {
                                    dimension: lang.label("Transport Protocol", "通信プロトコル", "Komunika Protokolo"),
                                    traditional: lang.label(
                                        "Ad-hoc REST / GraphQL endpoints",
                                        "アドホックな REST / GraphQL",
                                        "Ad-hoc REST / GraphQL",
                                    ),
                                    definy_val: lang.label(
                                        "Connect-RPC (HTTP POST + Protobuf / JSON)",
                                        "Connect-RPC (HTTP POST + Protobuf/JSON)",
                                        "Connect-RPC",
                                    ),
                                }
                                ComparisonRow {
                                    dimension: lang.label("Trust Model", "信頼モデル", "Fida Modelo"),
                                    traditional: lang.label(
                                        "Trust server / registry (npm, PyPI) blindly",
                                        "中央サーバーやレジストリを盲信",
                                        "Blinda fido al servilo",
                                    ),
                                    definy_val: lang.label(
                                        "Zero-Trust (Client Ed25519 Verification)",
                                        "ゼロトラスト（WASM によるクライアント検証）",
                                        "Nula Fido (Ed25519)",
                                    ),
                                }
                                ComparisonRow {
                                    dimension: lang.label("Offline Experience", "オフライン対応", "Senreta Sperto"),
                                    traditional: lang.label(
                                        "Often requires active internet connection",
                                        "接続切断時は機能制限",
                                        "Postulas interreton",
                                    ),
                                    definy_val: lang.label(
                                        "Local-First (IndexedDB Cache & Queue)",
                                        "ローカルファースト（IndexedDB キャッシュとキュー）",
                                        "Loka Unua (IndexedDB)",
                                    ),
                                }
                            }
                        }
                    }
                }

                // 言語機能と型システム
                div { style: "display: grid; gap: 1rem;",
                    h2 { style: "font-size: 1.4rem; font-weight: 700; margin: 0; display: flex; align-items: center; gap: 0.6rem; color: var(--text-primary);",
                        span { "🔤" }
                        span {
                            {
                                lang.label(
                                    "Language Features & Type System",
                                    "言語機能と型システム",
                                    "Lingvaj Trajtoj & Tipa Sistemo",
                                )
                            }
                        }
                    }

                    div { style: "display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 1rem;",
                        LangFeatureCard {
                            title: lang.label(
                                "Pure Functions & Currying",
                                "純粋関数とカリー化",
                                "Puraj Funkcioj",
                            ),
                            detail: lang.label(
                                "All functions are pure and side-effect free. Multi-argument functions are curried by default, enabling elegant partial application.",
                                "副作用のない純粋関数。多引数関数は自動的にカリー化され、部分適用が自然に行えます。",
                                "Ĉiuj funkcioj estas puraj sen flankefikoj.",
                            ),
                        }
                        LangFeatureCard {
                            title: lang.label("Pattern Matching", "網羅的パターンマッチ", "Ŝablona Kongruo"),
                            detail: lang.label(
                                "Expressive match expressions on variants and booleans, ensuring exhaustive checking without unhandled edge cases.",
                                "バリアントやブール値に対する安全な match 式。網羅性検査により未処理ケースを未然に排除します。",
                                "Sekura ŝablona kongruo por variantoj.",
                            ),
                        }
                        LangFeatureCard {
                            title: lang.label(
                                "Rich Structural Types",
                                "レコード型とユニオン型",
                                "Rikaj Strukturaj Tipoj",
                            ),
                            detail: lang.label(
                                "First-class Record types and Union variants provide high expressiveness without verbose boilerplate classes.",
                                "第一級のレコード（直積）とユニオン（直和）により、ボイラープレートなしで豊かなドメインモデルを表現できます。",
                                "Rikaj rikordoj kaj uniaj variantoj.",
                            ),
                        }
                        LangFeatureCard {
                            title: lang.label(
                                "Compiler Builtins",
                                "組み込み演算子と拡張性",
                                "Kompililaj Enkonstruaĵoj",
                            ),
                            detail: lang.label(
                                "Arithmetic, bitwise, logic, string operations, and list utilities are compiled directly to high-performance WebAssembly opcodes.",
                                "算術、ビット演算、文字列結合、リスト操作はネイティブな WebAssembly 命令へと直接最適化・コンパイルされます。",
                                "Aritmetiko kaj bitaj operacioj estas rekte tradukitaj al WebAssembly.",
                            ),
                        }
                    }
                }

                // Connect-RPC & 差分ハッシュ・ネゴシエーション仕様セクション
                div { style: "display: grid; gap: 1.2rem;",
                    div { style: "display: flex; justify-content: space-between; align-items: flex-end; flex-wrap: wrap; gap: 0.8rem;",
                        div { style: "display: grid; gap: 0.3rem;",
                            h2 { style: "font-size: 1.4rem; font-weight: 700; margin: 0; display: flex; align-items: center; gap: 0.6rem; color: var(--text-primary);",
                                span { "⚡" }
                                span {
                                    {
                                        lang.label(
                                            "Connect-RPC (gRPC) & Diff Hash Negotiation",
                                            "Connect-RPC (gRPC) & 差分ハッシュ・ネゴシエーション",
                                            "Connect-RPC & Diferenca Negocado",
                                        )
                                    }
                                }
                            }
                            p { style: "font-size: 0.88rem; color: var(--text-secondary); margin: 0; line-height: 1.5; max-width: 680px;",
                                {
                                    lang.label(
                                        "definy replaces REST with Connect-RPC over HTTP POST. Each method has its own dedicated page detailing request/response structures, Protobuf schemas, and CAS integration.",
                                        "definy は通信プロトコルを Connect-RPC に一本化。各メソッドは専用の個別ページで構造・Protobuf スキーマ・差分ネゴシエーションでの役割を解説しています。",
                                        "definy uzas Connect-RPC. Ĉiu metodo havas sian propran dediĉitan paĝon.",
                                    )
                                }
                            }
                        }
                        a {
                            href: context.href_with_lang(Location::ApiArchitecture),
                            style: "padding: 0.45rem 0.9rem; background: #8b5cf6; color: #fff; text-decoration: none; border-radius: var(--radius-sm); font-size: 0.82rem; font-weight: 600; display: inline-flex; align-items: center; gap: 0.35rem;",
                            span { "🗺️" }
                            span {
                                {
                                    lang.label(
                                        "Sequence Diagrams →",
                                        "シーケンス図を見る →",
                                        "Vidi Diagramojn →",
                                    )
                                }
                            }
                        }
                    }

                    div { style: "display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1rem;",
                        for method in crate::app_state::ApiMethod::all() {
                            {
                                let schema = crate::api_pages::get_method_schema(*method);
                                let target_loc = Location::ApiMethod(*method, None);
                                let href = context.href_with_lang(target_loc);
                                let name = method.name();

                                rsx! {
                                    a {
                                        key: "{name}",
                                        href: "{href}",
                                        class: "event-detail-card",
                                        style: "text-decoration: none; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-md); padding: 1.1rem; display: grid; gap: 0.6rem; transition: transform 0.15s ease, border-color 0.15s ease; color: inherit;",
                                        div { style: "display: flex; justify-content: space-between; align-items: center;",
                                            span { style: "padding: 0.15rem 0.45rem; background: #0284c7; color: #fff; font-size: 0.68rem; font-weight: 700; border-radius: 4px;",
                                                "POST"
                                            }
                                            span { style: "font-size: 0.74rem; color: #38bdf8; font-family: ui-monospace, monospace;",
                                                "{schema.request_name}"
                                            }
                                        }
                                        div { style: "font-size: 1.05rem; font-weight: 700; color: var(--text-primary);",
                                            "{name}"
                                        }
                                        p { style: "font-size: 0.8rem; color: var(--text-secondary); margin: 0; line-height: 1.5;",
                                            "{schema.description(lang)}"
                                        }
                                        div { style: "border-top: 1px solid var(--border); padding-top: 0.5rem; font-size: 0.78rem; font-weight: 600; color: #60a5fa; display: flex; justify-content: space-between; align-items: center;",
                                            span { {lang.label("Structure & Tester", "構造とテスター", "Strukturo & Testilo")} }
                                            span { "↗" }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }

                // フッターカード
                div {
                    class: "event-detail-card",
                    style: "background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-md); padding: 1.5rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;",
                    div { style: "display: grid; gap: 0.25rem;",
                        div { style: "font-weight: 700; font-size: 1rem; color: var(--text-primary);",
                            {
                                lang.label(
                                    "Ready to dive in?",
                                    "definy の世界を体験してみましょう",
                                    "Ĉu preta esplori?",
                                )
                            }
                        }
                        div { style: "font-size: 0.84rem; color: var(--text-secondary);",
                            {
                                lang.label(
                                    "Browse public modules, inspect the Connect-RPC architecture, or test each dedicated gRPC method.",
                                    "公開されているモジュールを閲覧したり、Connect-RPC 各メソッドの専用ページで構造を検査できます。",
                                    "Esploru publikajn modulojn aŭ inspektu la Connect-RPC metodojn.",
                                )
                            }
                        }
                    }
                    div { style: "display: flex; gap: 0.6rem; flex-wrap: wrap;",
                        a {
                            href: context.href_with_lang(Location::ModuleList),
                            style: "padding: 0.5rem 1rem; background: var(--primary); color: #fff; text-decoration: none; border-radius: var(--radius-sm); font-size: 0.85rem; font-weight: 600;",
                            {lang.label("View Modules", "モジュール一覧", "Vidi Modulojn")}
                        }
                        a {
                            href: context.href_with_lang(Location::ApiOverview),
                            style: "padding: 0.5rem 1rem; background: var(--surface); border: 1px solid var(--border); color: var(--text-primary); text-decoration: none; border-radius: var(--radius-sm); font-size: 0.85rem; font-weight: 600;",
                            {lang.label("Connect-RPC Specs", "RPC 仕様・一覧", "RPC Specifigoj")}
                        }
                    }
                }
            }
        }
    }
}

#[component]
fn FeatureCard(
    icon: &'static str,
    accent_color: &'static str,
    title: &'static str,
    description: &'static str,
    tag: &'static str,
) -> Element {
    rsx! {
        div {
            class: "event-detail-card",
            style: format!(
                "background: var(--surface); border: 1px solid var(--border); border-top: 3px solid {}; border-radius: var(--radius-md); padding: 1.3rem; display: grid; gap: 0.75rem; transition: transform 0.15s ease, border-color 0.15s ease;",
                accent_color,
            ),
            div { style: "display: flex; justify-content: space-between; align-items: center;",
                span { style: "font-size: 1.6rem;", "{icon}" }
                span {
                    style: format!(
                        "font-size: 0.72rem; padding: 0.2rem 0.5rem; border-radius: 4px; font-weight: 600; background: rgba(255, 255, 255, 0.06); color: {};",
                        accent_color,
                    ),
                    "{tag}"
                }
            }
            div { style: "font-size: 1rem; font-weight: 700; color: var(--text-primary);",
                "{title}"
            }
            p { style: "font-size: 0.84rem; color: var(--text-secondary); margin: 0; line-height: 1.55;",
                "{description}"
            }
        }
    }
}

#[component]
fn ComparisonRow(
    dimension: &'static str,
    traditional: &'static str,
    definy_val: &'static str,
) -> Element {
    rsx! {
        tr { style: "border-bottom: 1px solid var(--border); transition: background 0.1s ease;",
            td { style: "padding: 0.85rem 1rem; font-weight: 600; color: var(--text-primary);",
                "{dimension}"
            }
            td { style: "padding: 0.85rem 1rem; color: #fda4af;", "{traditional}" }
            td { style: "padding: 0.85rem 1rem; color: #6ee7b7; font-weight: 600;",
                "{definy_val}"
            }
        }
    }
}

#[component]
fn LangFeatureCard(title: &'static str, detail: &'static str) -> Element {
    rsx! {
        div { style: "padding: 1rem 1.1rem; background: rgba(0, 0, 0, 0.15); border: 1px solid var(--border); border-radius: var(--radius-sm); display: grid; gap: 0.4rem;",
            div { style: "font-weight: 600; color: #93c5fd; font-size: 0.9rem;", "{title}" }
            p { style: "font-size: 0.82rem; color: var(--text-secondary); margin: 0; line-height: 1.5;",
                "{detail}"
            }
        }
    }
}
