use dioxus::prelude::*;

use crate::page_context::PageContext;
use definy_event::rpc::{
    ListPreviewAppsRequest, PreviewAppItem, RegisterPreviewAppRequest, StopPreviewAppRequest,
};

#[component]
pub fn PreviewAppsCard(context: PageContext) -> Element {
    let lang = context.language;

    let mut app_id = use_signal(String::new);
    let mut display_name = use_signal(String::new);
    let mut part_id = use_signal(String::new);
    let mut account_id = use_signal(String::new);

    let mut is_loading = use_signal(|| false);
    let mut error_message = use_signal(|| Option::<String>::None);
    let mut success_message = use_signal(|| Option::<String>::None);
    let mut active_apps = use_signal(Vec::<PreviewAppItem>::new);

    // 稼働中プレビューアプリの一覧取得
    let refresh_apps = move || {
        spawn(async move {
            let req = ListPreviewAppsRequest { account_id: None };
            match crate::fetch::list_preview_apps(&req).await {
                Ok(res) => {
                    active_apps.set(res.apps);
                }
                Err(err) => {
                    println!("Failed to list preview apps: {err:?}");
                }
            }
        });
    };

    use_effect(move || {
        refresh_apps();
    });

    let on_start_preview = move |_| {
        let current_app_id = app_id.read().trim().to_string();
        let current_display_name = display_name.read().trim().to_string();
        let current_part_id = part_id.read().trim().to_string();
        let current_account_id = account_id.read().trim().to_string();

        if current_app_id.is_empty() {
            error_message.set(Some(
                lang.label(
                    "App ID / Subdomain is required",
                    "アプリ ID / サブドメインは必須です",
                    "Apo ID / Subdomajno estas postulata",
                )
                .to_string(),
            ));
            return;
        }

        if current_account_id.is_empty() {
            error_message.set(Some(
                lang.label(
                    "Admin Account ID is required",
                    "管理者アカウント ID は必須です",
                    "Administranta Konto-ID estas postulata",
                )
                .to_string(),
            ));
            return;
        }

        is_loading.set(true);
        error_message.set(None);
        success_message.set(None);

        spawn(async move {
            let req = RegisterPreviewAppRequest {
                app_id: current_app_id,
                display_name: current_display_name,
                part_id: current_part_id,
                account_id: current_account_id,
                signature: None,
                wasm_hash: None,
            };

            match crate::fetch::register_preview_app(&req).await {
                Ok(res) => {
                    is_loading.set(false);
                    success_message.set(Some(format!(
                        "Preview app '{}' is running! Subdomain: {}",
                        res.app_id, res.preview_url
                    )));
                    refresh_apps();
                }
                Err(err) => {
                    is_loading.set(false);
                    error_message.set(Some(format!("{err}")));
                }
            }
        });
    };

    rsx! {
        div {
            class: "event-detail-card",
            style: "background: var(--bg-surface); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: 1.8rem; display: flex; flex-direction: column; gap: 1.5rem;",

            // ヘッダー
            div { style: "display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid var(--border); padding-bottom: 1rem; flex-wrap: wrap; gap: 0.5rem;",
                div { style: "display: flex; align-items: center; gap: 0.8rem;",
                    span { style: "font-size: 1.6rem;", "🌐" }
                    div {
                        h2 { style: "margin: 0; font-size: 1.25rem; font-weight: 700;",
                            {
                                lang.label(
                                    "In-Server App Preview (Localhost & Subdomain Runner)",
                                    "インサーバー Web アプリ プレビュー (Localhost & サブドメイン実行)",
                                    "Enservila Retejo-Antaŭrigardo (Localhost kaj Subdomajno)",
                                )
                            }
                        }
                        span { style: "font-size: 0.85rem; color: var(--text-secondary);",
                            {
                                lang.label(
                                    "Execute and test definy web applications with custom subdomains or paths on definy server",
                                    "definy サーバー上で Web アプリを動作検証。アプリごとのサブドメインまたはパスプレフィックスで即座にアクセス可能",
                                    "Provu definy-retejajn apojn per subdomajnoj sur definy-servilo",
                                )
                            }
                        }
                    }
                }
                div { style: "display: flex; align-items: center; gap: 0.5rem;",
                    span { style: "background: rgba(239, 68, 68, 0.15); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.3); padding: 0.25rem 0.6rem; border-radius: 9999px; font-size: 0.75rem; font-weight: 600;",
                        {
                            lang.label(
                                "Admin User Only (DEFINY_ADMIN_ACCOUNT_ID)",
                                "管理者のみ実行可能 (DEFINY_ADMIN_ACCOUNT_ID)",
                                "Nur Administranto (DEFINY_ADMIN_ACCOUNT_ID)",
                            )
                        }
                    }
                }
            }

            // 説明文
            p { style: "margin: 0; font-size: 0.9rem; color: var(--text-secondary); line-height: 1.55;",
                {
                    lang.label(
                        "Web browsers cannot host backend web servers. definy-server hosts the application on-demand in-memory or Wasm runtime. To prevent unauthorized resource usage, only admin users specified in the DEFINY_ADMIN_ACCOUNT_ID environment variable can register and run preview apps.",
                        "Web ブラウザ単体では Web サーバーを立てられないため、definy サーバー内でインメモリまたは Wasm ランタイムを用いてオンデマンド実行します。リスク防止のため、サーバー起動時に環境変数 DEFINY_ADMIN_ACCOUNT_ID に指定された管理者アカウントのみがプレビューを起動できます。",
                        "Retejaj retumiloj ne povas mem gastigi servilojn. Nur administranto povas ruli antaŭrigardajn apojn por sekureco.",
                    )
                }
            }

            // 入力フォーム
            div { style: "display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 1rem;",
                div { style: "display: flex; flex-direction: column; gap: 0.35rem;",
                    label { style: "font-size: 0.85rem; font-weight: 600; color: var(--text-primary);",
                        {
                            lang.label(
                                "App ID / Subdomain *",
                                "アプリ ID / サブドメイン名 *",
                                "Apo-ID / Subdomajno *",
                            )
                        }
                    }
                    input {
                        r#type: "text",
                        placeholder: "e.g. my-app, demo-web",
                        value: "{app_id}",
                        oninput: move |e| app_id.set(e.value()),
                        style: "background: var(--bg-canvas); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 0.6rem 0.8rem; color: var(--text-primary); font-size: 0.9rem;",
                    }
                }

                div { style: "display: flex; flex-direction: column; gap: 0.35rem;",
                    label { style: "font-size: 0.85rem; font-weight: 600; color: var(--text-primary);",
                        {lang.label("Display Name", "表示名 (任意)", "Montra Nomo")}
                    }
                    input {
                        r#type: "text",
                        placeholder: "e.g. My Awesome Web App",
                        value: "{display_name}",
                        oninput: move |e| display_name.set(e.value()),
                        style: "background: var(--bg-canvas); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 0.6rem 0.8rem; color: var(--text-primary); font-size: 0.9rem;",
                    }
                }

                div { style: "display: flex; flex-direction: column; gap: 0.35rem;",
                    label { style: "font-size: 0.85rem; font-weight: 600; color: var(--text-primary);",
                        {
                            lang.label(
                                "Target Part ID / Name",
                                "実行対象パーツ ID / 名前",
                                "Cela Part-ID",
                            )
                        }
                    }
                    input {
                        r#type: "text",
                        placeholder: "e.g. part-html-handler",
                        value: "{part_id}",
                        oninput: move |e| part_id.set(e.value()),
                        style: "background: var(--bg-canvas); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 0.6rem 0.8rem; color: var(--text-primary); font-size: 0.9rem;",
                    }
                }

                div { style: "display: flex; flex-direction: column; gap: 0.35rem;",
                    label { style: "font-size: 0.85rem; font-weight: 600; color: var(--text-primary);",
                        {
                            lang.label(
                                "Admin Account ID *",
                                "管理者アカウント ID (Hex) *",
                                "Administranta Konto-ID *",
                            )
                        }
                    }
                    input {
                        r#type: "text",
                        placeholder: "e.g. 0123456789abcdef...",
                        value: "{account_id}",
                        oninput: move |e| account_id.set(e.value()),
                        style: "background: var(--bg-canvas); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 0.6rem 0.8rem; color: var(--text-primary); font-size: 0.9rem; font-family: monospace;",
                    }
                }
            }

            // 起動ボタン
            div { style: "display: flex; justify-content: flex-end; gap: 0.8rem;",
                button {
                    onclick: on_start_preview,
                    disabled: *is_loading.read(),
                    style: "padding: 0.65rem 1.6rem; background: var(--primary); color: white; border: none; border-radius: var(--radius-sm); font-weight: 600; font-size: 0.95rem; cursor: pointer; transition: opacity 0.15s ease;",
                    if *is_loading.read() {
                        {lang.label("Starting Preview...", "プレビュー起動中...", "Lanĉante...")}
                    } else {
                        {
                            lang.label(
                                "🚀 Start Preview App",
                                "🚀 プレビューアプリを起動",
                                "🚀 Lanĉi Antaŭrigardon",
                            )
                        }
                    }
                }
            }

            // メッセージ表示
            if let Some(err) = error_message.read().as_ref() {
                div { style: "padding: 0.75rem 1rem; background: rgba(239, 68, 68, 0.1); border: 1px solid #ef4444; border-radius: var(--radius-sm); color: #ef4444; font-size: 0.85rem;",
                    "⚠️ {err}"
                }
            }
            if let Some(msg) = success_message.read().as_ref() {
                div { style: "padding: 0.75rem 1rem; background: rgba(34, 197, 94, 0.1); border: 1px solid #22c55e; border-radius: var(--radius-sm); color: #22c55e; font-size: 0.85rem;",
                    "✅ {msg}"
                }
            }

            // 稼働中プレビューアプリ一覧
            div { style: "display: flex; flex-direction: column; gap: 0.8rem; margin-top: 0.5rem;",
                div { style: "display: flex; align-items: center; justify-content: space-between;",
                    h3 { style: "margin: 0; font-size: 1.05rem; font-weight: 700;",
                        {
                            lang.label(
                                "Active Preview Apps",
                                "稼働中のプレビューアプリ一覧",
                                "Aktivaj Antaŭrigardaj Apoj",
                            )
                        }
                    }
                    button {
                        onclick: move |_| refresh_apps(),
                        style: "background: transparent; border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 0.35rem 0.75rem; color: var(--text-secondary); cursor: pointer; font-size: 0.8rem;",
                        {lang.label("🔄 Refresh", "🔄 更新", "🔄 Reŝargi")}
                    }
                }

                if active_apps.read().is_empty() {
                    div { style: "padding: 1.5rem; text-align: center; color: var(--text-secondary); background: var(--bg-canvas); border-radius: var(--radius-sm); border: 1px dashed var(--border); font-size: 0.85rem;",
                        {
                            lang.label(
                                "No active preview apps. Register one above to test web apps.",
                                "現在稼働中のプレビューアプリはありません。上のフォームから起動して動作を試せます。",
                                "Neniuj aktivaj antaŭrigardaj apoj.",
                            )
                        }
                    }
                } else {
                    div { style: "display: flex; flex-direction: column; gap: 0.6rem;",
                        for app in active_apps.read().iter() {
                            PreviewAppRow {
                                key: "{app.app_id}",
                                app: app.clone(),
                                lang,
                                on_stop: move |app_id_to_stop: String| {
                                    let current_account = account_id.read().trim().to_string();
                                    spawn(async move {
                                        let req = StopPreviewAppRequest {
                                            app_id: app_id_to_stop,
                                            account_id: current_account,
                                            signature: None,
                                        };
                                        if crate::fetch::stop_preview_app(&req).await.is_ok() {
                                            refresh_apps();
                                        }
                                    });
                                },
                            }
                        }
                    }
                }
            }
        }
    }
}

#[component]
fn PreviewAppRow(
    app: PreviewAppItem,
    lang: crate::language::Language,
    on_stop: EventHandler<String>,
) -> Element {
    let stop_id = app.app_id.clone();

    rsx! {
        div { style: "display: flex; align-items: center; justify-content: space-between; padding: 0.9rem 1.1rem; background: var(--bg-canvas); border: 1px solid var(--border); border-radius: var(--radius-sm); flex-wrap: wrap; gap: 0.8rem;",
            div { style: "display: flex; flex-direction: column; gap: 0.25rem;",
                div { style: "display: flex; align-items: center; gap: 0.6rem;",
                    strong { style: "font-size: 0.95rem; color: var(--text-primary);",
                        "{app.display_name}"
                    }
                    span { style: "background: rgba(34, 197, 94, 0.15); color: #22c55e; padding: 0.15rem 0.5rem; border-radius: 4px; font-size: 0.75rem; font-weight: 600;",
                        "{app.status}"
                    }
                }
                div { style: "display: flex; gap: 1rem; flex-wrap: wrap; font-size: 0.85rem;",
                    a {
                        href: "{app.preview_url}",
                        target: "_blank",
                        rel: "noopener noreferrer",
                        style: "color: var(--primary); text-decoration: underline;",
                        "🔗 Subdomain: {app.preview_url}"
                    }
                    a {
                        href: "{app.path_url}",
                        target: "_blank",
                        rel: "noopener noreferrer",
                        style: "color: var(--text-secondary); text-decoration: underline;",
                        "📁 Path: {app.path_url}"
                    }
                }
                div { style: "font-size: 0.75rem; color: var(--text-secondary);",
                    "Part: {app.part_id} | Owner: {app.owner_account_id}"
                }
            }

            button {
                onclick: move |_| on_stop.call(stop_id.clone()),
                style: "padding: 0.4rem 0.9rem; background: rgba(239, 68, 68, 0.15); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.3); border-radius: var(--radius-sm); font-size: 0.8rem; font-weight: 600; cursor: pointer;",
                {lang.label("Stop", "停止", "Haltigi")}
            }
        }
    }
}
