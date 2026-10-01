use dioxus::prelude::*;

use crate::page_context::PageContext;
use crate::{AppState, Location};

#[component]
pub fn SettingsView(state: AppState, context: PageContext) -> Element {
    let queued_count = state
        .local_event_queue
        .items
        .iter()
        .filter(|i| i.status == crate::local_event::LocalEventStatus::Queued)
        .count();
    let failed_count = state
        .local_event_queue
        .items
        .iter()
        .filter(|i| i.status == crate::local_event::LocalEventStatus::Failed)
        .count();

    let local_events_badge = if queued_count > 0 || failed_count > 0 {
        let (bg, text_color, count) = if failed_count > 0 {
            ("#f87171", "#ffffff", failed_count)
        } else {
            ("#fbbf24", "#0f172a", queued_count)
        };
        Some(rsx! {
            span { style: "font-size: 0.72rem; font-weight: 700; background: {bg}; color: {text_color}; padding: 0.1rem 0.45rem; border-radius: 9999px; line-height: 1.2;",
                "{count}"
            }
        })
    } else {
        None
    };

    let page_shell_style = crate::layout::page_shell_style("1rem");

    let current_account = state.current_key.as_ref().map(|key| {
        let account_id = definy_event::event::AccountId(key.verifying_key());
        let account_name =
            crate::app_state::account_display_name(&state.account_name_map(), &account_id);
        (account_id, account_name)
    });

    rsx! {
        div { style: "{page_shell_style}",
            div { style: "display: grid; gap: 1.4rem; max-width: 840px; margin: 0 auto; width: 100%;",
                // ページヘッダー
                div { style: "display: grid; gap: 0.35rem;",
                    h2 { style: "font-size: 1.5rem; font-weight: 700; margin: 0; color: var(--text-primary); letter-spacing: -0.015em;",
                        {
                            context
                                .language
                                .label("Settings & Tools", "設定とツール", "Agordoj kaj Iloj")
                        }
                    }
                    div { style: "font-size: 0.85rem; color: var(--text-secondary);",
                        {
                            context
                                .language
                                .label(
                                    "Developer playgrounds, offline management, API docs, and preferences.",
                                    "開発ツール、オフラインイベント管理、API ドキュメント、各種設定。",
                                    "Evoluigaj iloj, eksterreta administrado, API-dokumentoj kaj agordoj.",
                                )
                        }
                    }
                }

                // セクション 1: 開発ツール & プレイグラウンド
                div { style: "display: grid; gap: 0.75rem;",
                    div { style: "font-size: 0.92rem; font-weight: 600; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.04em;",
                        {
                            context
                                .language
                                .label(
                                    "Tools & Playgrounds",
                                    "ツール & プレビュー",
                                    "Iloj & Testejoj",
                                )
                        }
                    }
                    div { style: "display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 0.75rem;",
                        // Tree Layout カード
                        a {
                            href: context.href_with_lang(Location::TreeLayout),
                            class: "event-detail-card",
                            style: "display: flex; flex-direction: column; gap: 0.5rem; padding: 1.1rem 1.2rem; text-decoration: none; color: inherit; transition: transform 0.15s ease, border-color 0.15s ease; border-radius: var(--radius-md);",
                            div { style: "display: flex; align-items: center; justify-content: space-between;",
                                div { style: "display: flex; align-items: center; gap: 0.6rem;",
                                    span { style: "font-size: 1.35rem;", "🌳" }
                                    span { style: "font-size: 1rem; font-weight: 600; color: var(--text-primary);",
                                        {context.language.label("Tree Layout", "ツリー表示", "Arba aranĝo")}
                                    }
                                }
                                span { style: "font-size: 0.85rem; color: var(--primary);",
                                    "→"
                                }
                            }
                            div { style: "font-size: 0.8rem; color: var(--text-secondary); line-height: 1.45;",
                                {
                                    context
                                        .language
                                        .label(
                                            "Visual 2D expression trees, horizontal flow, and spreadsheet table representation.",
                                            "式の2次元ツリー構造やスプレッドシート表形式のレンダリングを実験できます。",
                                            "Vidaj 2D-esprimarboj kaj kalkultabela reprezento.",
                                        )
                                }
                            }
                        }

                        // Local Events カード
                        a {
                            href: context.href_with_lang(Location::LocalEventQueue),
                            class: "event-detail-card",
                            style: "display: flex; flex-direction: column; gap: 0.5rem; padding: 1.1rem 1.2rem; text-decoration: none; color: inherit; transition: transform 0.15s ease, border-color 0.15s ease; border-radius: var(--radius-md);",
                            div { style: "display: flex; align-items: center; justify-content: space-between;",
                                div { style: "display: flex; align-items: center; gap: 0.6rem;",
                                    span { style: "font-size: 1.35rem;", "📬" }
                                    span { style: "font-size: 1rem; font-weight: 600; color: var(--text-primary);",
                                        {
                                            context
                                                .language
                                                .label("Local Events", "ローカルイベント", "Lokaj eventoj")
                                        }
                                    }
                                }
                                if let Some(badge) = local_events_badge {
                                    {badge}
                                } else {
                                    span { style: "font-size: 0.85rem; color: var(--primary);",
                                        "→"
                                    }
                                }
                            }
                            div { style: "font-size: 0.8rem; color: var(--text-secondary); line-height: 1.45;",
                                {
                                    context
                                        .language
                                        .label(
                                            "Manage queued and failed events when operating offline or syncing with server.",
                                            "オフライン時のキューや送信失敗イベントの確認・再送信・破棄を行えます。",
                                            "Administri envicigitajn kaj malsukcesajn eventojn kiam senkonekte.",
                                        )
                                }
                            }
                        }

                        // definy についてカード
                        a {
                            href: context.href_with_lang(Location::About),
                            class: "event-detail-card",
                            style: "display: flex; flex-direction: column; gap: 0.5rem; padding: 1.1rem 1.2rem; text-decoration: none; color: inherit; transition: transform 0.15s ease, border-color 0.15s ease; border-radius: var(--radius-md);",
                            div { style: "display: flex; align-items: center; justify-content: space-between;",
                                div { style: "display: flex; align-items: center; gap: 0.6rem;",
                                    span { style: "font-size: 1.35rem;", "✦" }
                                    span { style: "font-size: 1rem; font-weight: 600; color: var(--text-primary);",
                                        {context.language.label("About definy", "definy について", "Pri definy")}
                                    }
                                }
                                span { style: "font-size: 0.85rem; color: var(--primary);",
                                    "→"
                                }
                            }
                            div { style: "font-size: 0.8rem; color: var(--text-secondary); line-height: 1.45;",
                                {
                                    context
                                        .language
                                        .label(
                                            "Philosophy, Content-Addressed architecture, structured editing, and language features of definy.",
                                            "definy の設計思想、コンテンツアドレスによる依存固定、構造化編集、言語機能の解説。",
                                            "Filozofio, enhav-adresita arkitekturo, kaj lingvaj trajtoj de definy.",
                                        )
                                }
                            }
                        }

                        // Connect-RPC & CBOR Explorer カード
                        a {
                            href: context.href_with_lang(Location::ApiOverview),
                            class: "event-detail-card",
                            style: "display: flex; flex-direction: column; gap: 0.5rem; padding: 1.1rem 1.2rem; text-decoration: none; color: inherit; transition: transform 0.15s ease, border-color 0.15s ease; border-radius: var(--radius-md);",
                            div { style: "display: flex; align-items: center; justify-content: space-between;",
                                div { style: "display: flex; align-items: center; gap: 0.6rem;",
                                    span { style: "font-size: 1.35rem;", "🔬" }
                                    span { style: "font-size: 1rem; font-weight: 600; color: var(--text-primary);",
                                        "Connect-RPC & CBOR"
                                    }
                                }
                                span { style: "font-size: 0.85rem; color: var(--primary);",
                                    "→"
                                }
                            }
                            div { style: "font-size: 0.8rem; color: var(--text-secondary); line-height: 1.45;",
                                {
                                    context
                                        .language
                                        .label(
                                            "Inspect Connect-RPC calls, decode Deterministic CBOR event binaries, AST, and proofs.",
                                            "Connect-RPC 呼び出しと Deterministic CBOR イベントバイナリのデコード・AST・暗号検証を行えます。",
                                            "Inspektu Connect-RPC vokojn kaj malkodu determinajn CBOR-eventojn kaj AST.",
                                        )
                                }
                            }
                        }

                        // Swagger UI / API カード
                        a {
                            href: "{crate::fetch::api_base_url()}/swagger-ui/",
                            target: "_blank",
                            rel: "noopener noreferrer",
                            class: "event-detail-card",
                            style: "display: flex; flex-direction: column; gap: 0.5rem; padding: 1.1rem 1.2rem; text-decoration: none; color: inherit; transition: transform 0.15s ease, border-color 0.15s ease; border-radius: var(--radius-md);",
                            div { style: "display: flex; align-items: center; justify-content: space-between;",
                                div { style: "display: flex; align-items: center; gap: 0.6rem;",
                                    span { style: "font-size: 1.35rem;", "⚡" }
                                    span { style: "font-size: 1rem; font-weight: 600; color: var(--text-primary);",
                                        "API (Swagger UI)"
                                    }
                                }
                                span { style: "font-size: 0.85rem; color: var(--primary);",
                                    "↗"
                                }
                            }
                            div { style: "font-size: 0.8rem; color: var(--text-secondary); line-height: 1.45;",
                                {
                                    context
                                        .language
                                        .label(
                                            "Interactive OpenAPI documentation, endpoints testing, and MCP server specification.",
                                            "サーバーの OpenAPI 仕様、エンドポイントの動作テスト、MCP サーバーの確認ができます。",
                                            "Interaga OpenAPI-dokumentaro kaj finpunktotestado.",
                                        )
                                }
                            }
                        }
                    }
                }

                // セクション 2: 動作設定 (System & Preferences)
                div { style: "display: grid; gap: 0.75rem;",
                    div { style: "font-size: 0.92rem; font-weight: 600; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.04em;",
                        {
                            context
                                .language
                                .label(
                                    "System & Offline",
                                    "システムと動作設定",
                                    "Sistemo & Agordoj",
                                )
                        }
                    }
                    div {
                        class: "event-detail-card",
                        style: "display: grid; gap: 1rem; padding: 1.25rem 1.4rem; border-radius: var(--radius-md);",
                        // オフライン切替行
                        div { style: "display: flex; justify-content: space-between; align-items: center; gap: 1rem; flex-wrap: wrap;",
                            div { style: "display: grid; gap: 0.2rem;",
                                div { style: "font-size: 0.95rem; font-weight: 600; color: var(--text-primary);",
                                    {
                                        context
                                            .language
                                            .label(
                                                "Force Offline Mode",
                                                "強制オフラインモード",
                                                "Deviga senkonekta reĝimo",
                                            )
                                    }
                                }
                                div { style: "font-size: 0.8rem; color: var(--text-secondary);",
                                    {
                                        context
                                            .language
                                            .label(
                                                "Simulate offline behavior; all newly created events will be buffered in local queue.",
                                                "オフライン動作をシミュレートし、新規イベントをローカルキューに保持します。",
                                                "Simuli senkonektan staton; novaj eventoj estos en la loka vico.",
                                            )
                                    }
                                }
                            }
                            button {
                                r#type: "button",
                                class: if state.force_offline { "btn-primary" } else { "btn-secondary" },
                                onclick: move |_| {
                                    let mut dispatch = use_context::<Signal<AppState>>();
                                    let current = dispatch.read().force_offline;
                                    dispatch.write().force_offline = !current;
                                },
                                if state.force_offline {
                                    {
                                        context
                                            .language
                                            .label("Offline: ON", "オフライン: 有効", "Senkonekte: En")
                                    }
                                } else {
                                    {
                                        context
                                            .language
                                            .label("Offline: OFF", "オフライン: 無効", "Senkonekte: Malŝaltita")
                                    }
                                }
                            }
                        }

                        div { style: "height: 1px; background: var(--border); width: 100%;" }

                        // 言語選択行
                        div { style: "display: flex; justify-content: space-between; align-items: center; gap: 1rem; flex-wrap: wrap;",
                            div { style: "display: grid; gap: 0.2rem;",
                                div { style: "font-size: 0.95rem; font-weight: 600; color: var(--text-primary);",
                                    {context.language.label("Language", "表示言語", "Lingvo")}
                                }
                                div { style: "font-size: 0.8rem; color: var(--text-secondary);",
                                    {
                                        context
                                            .language
                                            .label(
                                                "Switch UI language between English, Japanese, and Esperanto.",
                                                "英語・日本語・エスペラント語を切り替えます。",
                                                "Ŝanĝi lingvon inter angla, japana kaj esperanto.",
                                            )
                                    }
                                }
                            }
                            div { style: "display: flex; gap: 0.4rem;",
                                for (code, name) in [("en", "English"), ("ja", "日本語"), ("eo", "Esperanto")] {
                                    {
                                        let is_current = context.language.to_code() == code;
                                        let current_loc = context.location.as_ref().unwrap_or(&Location::Settings);
                                        let url = PageContext::build_url(current_loc, code, context.filter_event_type);
                                        rsx! {
                                            a {
                                                key: "{code}",
                                                href: "{url}",
                                                class: if is_current { "btn-primary" } else { "btn-secondary" },
                                                style: "text-decoration: none; padding: 0.35rem 0.75rem; font-size: 0.82rem;",
                                                "{name}"
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }

                // セクション 3: アカウント情報
                div { style: "display: grid; gap: 0.75rem;",
                    div { style: "font-size: 0.92rem; font-weight: 600; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.04em;",
                        {context.language.label("Account", "アカウント情報", "Konto")}
                    }
                    div {
                        class: "event-detail-card",
                        style: "display: grid; gap: 0.85rem; padding: 1.25rem 1.4rem; border-radius: var(--radius-md);",
                        if let Some((account_id, account_name)) = current_account {
                            div { style: "display: flex; justify-content: space-between; align-items: center; gap: 1rem; flex-wrap: wrap;",
                                div { style: "display: grid; gap: 0.25rem;",
                                    div { style: "font-size: 1.05rem; font-weight: 700; color: var(--text-primary);",
                                        "👤 {account_name}"
                                    }
                                    div {
                                        class: "mono",
                                        style: "font-size: 0.76rem; color: var(--text-secondary); word-break: break-all;",
                                        "ID: {account_id}"
                                    }
                                }
                                div { style: "display: flex; align-items: center; gap: 0.6rem;",
                                    a {
                                        href: context.href_with_lang(Location::Account(account_id)),
                                        class: "btn-secondary",
                                        style: "text-decoration: none; font-size: 0.82rem; padding: 0.38rem 0.8rem;",
                                        {context.language.label("View Profile", "アカウント詳細", "Vidi konton")}
                                    }
                                    button {
                                        r#type: "button",
                                        class: "btn-secondary",
                                        style: "color: #f87171; border-color: rgba(248, 113, 113, 0.3); font-size: 0.82rem; padding: 0.38rem 0.8rem;",
                                        onclick: move |_| {
                                            crate::navigator_credential::credential_clear();
                                            let mut dispatch = use_context::<Signal<AppState>>();
                                            let mut next = dispatch.read().clone();
                                            next.current_key = None;
                                            next.is_auth_loading = false;
                                            dispatch.set(next);
                                        },
                                        {context.language.label("Log Out", "ログアウト", "Elsaluti")}
                                    }
                                }
                            }
                        } else {
                            div { style: "display: flex; justify-content: space-between; align-items: center; gap: 1rem; flex-wrap: wrap;",
                                div { style: "font-size: 0.85rem; color: var(--text-secondary);",
                                    {
                                        context
                                            .language
                                            .label(
                                                "You are currently not logged in.",
                                                "現在ログインしていません。",
                                                "Vi nuntempe ne estas ensalutinta.",
                                            )
                                    }
                                }
                                button {
                                    r#type: "button",
                                    class: "btn-primary",
                                    "commandfor": "login-or-create-account-dialog",
                                    "command": "show-modal",
                                    {
                                        context
                                            .language
                                            .label(
                                                "Log In / Sign Up",
                                                "ログイン / 新規登録",
                                                "Ensaluti / Registriĝi",
                                            )
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
