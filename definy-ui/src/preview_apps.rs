use dioxus::prelude::*;

use crate::page_context::PageContext;
use definy_event::rpc::{ListPreviewAppsRequest, PreviewAppItem};

/// サブドメインURLを構築します
pub fn build_preview_subdomain_url(code: &str) -> String {
    #[cfg(target_arch = "wasm32")]
    if let Some(window) = web_sys::window() {
        let loc = window.location();
        let protocol = loc.protocol().unwrap_or_else(|_| "http:".into());
        let hostname = loc.hostname().unwrap_or_else(|_| "localhost".into());
        let port = loc.port().unwrap_or_default();

        if hostname.ends_with(".localhost") || hostname == "localhost" || hostname == "127.0.0.1" {
            let port_part = if port.is_empty() {
                String::new()
            } else {
                format!(":{port}")
            };
            return format!("http://{code}.localhost{port_part}");
        }

        let clean_root = hostname.trim().to_lowercase();
        let use_hyphen =
            !clean_root.ends_with(".workers.dev") && clean_root.split('.').count() >= 3;
        if use_hyphen {
            return format!("{protocol}//{code}-{clean_root}");
        } else {
            return format!("{protocol}//{code}.{clean_root}");
        }
    }
    format!("http://{code}.localhost:8000")
}

/// パスベースURLを構築します
pub fn build_preview_path_url(code: &str) -> String {
    format!("/preview/{code}/")
}

#[component]
pub fn PreviewAppsCard(context: PageContext) -> Element {
    let lang = context.language;

    let mut refresh_trigger = use_signal(|| 0usize);

    // 稼働中・定義済みプレビューアプリの一覧取得
    let apps_resource = use_resource(move || {
        let _ = *refresh_trigger.read();
        async move {
            let req = ListPreviewAppsRequest { account_id: None };
            crate::fetch::list_preview_apps(&req)
                .await
                .ok()
                .map(|res| res.apps)
                .unwrap_or_default()
        }
    });

    let active_apps = apps_resource.read().clone().unwrap_or_default();
    let is_loading = apps_resource.read().is_none();

    let on_refresh = move |_| {
        refresh_trigger += 1;
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
                                    "In-Server Web App Preview (definy:preview)",
                                    "インサーバー Web アプリ プレビュー (definy:preview)",
                                    "Enservila Retejo-Antaŭrigardo (definy:preview)",
                                )
                            }
                        }
                        span { style: "font-size: 0.85rem; color: var(--text-secondary);",
                            {
                                lang.label(
                                    "Preview and test web applications defined as parts using definy:preview",
                                    "definy:preview パーツを呼び出して定義された Web アプリケーションのプレビュー環境",
                                    "Antaŭrigardu retejajn apojn difinitajn per definy:preview",
                                )
                            }
                        }
                    }
                }
                div { style: "display: flex; align-items: center; gap: 0.5rem;",
                    span { style: "background: rgba(56, 189, 248, 0.15); color: var(--primary); border: 1px solid rgba(56, 189, 248, 0.3); padding: 0.25rem 0.6rem; border-radius: 9999px; font-size: 0.75rem; font-weight: 600;",
                        "definy:preview"
                    }
                }
            }

            // 説明カード (パーツ定義の案内)
            div { style: "background: linear-gradient(135deg, rgba(56, 189, 248, 0.08), rgba(99, 102, 241, 0.05)); border: 1px solid rgba(56, 189, 248, 0.25); border-radius: var(--radius-md); padding: 1.2rem; display: flex; flex-direction: column; gap: 0.75rem;",
                div { style: "display: flex; align-items: center; gap: 0.5rem; font-weight: 600; font-size: 0.95rem; color: var(--text-primary);",
                    span { "💡" }
                    span {
                        {
                            lang.label(
                                "How to define a preview Web App",
                                "プレビュー Web アプリの作成方法",
                                "Kiel difini antaŭrigardan retejon",
                            )
                        }
                    }
                }
                p { style: "margin: 0; font-size: 0.88rem; color: var(--text-secondary); line-height: 1.6;",
                    {
                        lang.label(
                            "In definy, web apps are defined declaratively as parts by calling definy:preview. No manual server registration is needed. Once defined, preview URLs are instantly active.",
                            "definy では、Web アプリは definy:preview パーツを呼び出すパーツとして宣言的に定義します。手動でサーバーを起動・登録する必要はなく、パーツを保存するとプレビュー URL から即座にアクセスできます。",
                            "En definy, retejaj apoj estas difinitaj kiel partoj vokantaj definy:preview sen mana registrado.",
                        )
                    }
                }
                pre { style: "margin: 0; background: rgba(0, 0, 0, 0.3); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 0.75rem 1rem; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 0.82rem; color: #38bdf8; overflow-x: auto;",
                    "preview({{\n  code: \"my-app\",\n  handler: fn(req) => {{\n    status: 200,\n    headers: [ {{ name: \"content-type\", value: \"text/html\" }} ],\n    body: std.string-to-utf8-stream(\"<h1>Hello from definy!</h1>\")\n  }}\n}})"
                }
                div { style: "font-size: 0.82rem; color: var(--text-secondary);",
                    {
                        lang.label(
                            "The preview function is a standard definy:preview part. Its name can be changed freely.",
                            "preview 関数は definy モジュール内の標準パーツ (definy:preview) です。他のパーツと同様に定義画面があり、名前の変更も可能です。",
                            "La preview-funkcio estas norma parto definy:preview.",
                        )
                    }
                }
            }

            // 稼働中・定義済みプレビューアプリ一覧
            div { style: "display: flex; flex-direction: column; gap: 0.8rem;",
                div { style: "display: flex; align-items: center; justify-content: space-between;",
                    h3 { style: "margin: 0; font-size: 1.05rem; font-weight: 700;",
                        {
                            lang.label(
                                "Active Preview Web Apps",
                                "定義済み・稼働中のプレビューアプリ一覧",
                                "Aktivaj Antaŭrigardaj Apoj",
                            )
                        }
                    }
                    button {
                        onclick: on_refresh,
                        disabled: is_loading,
                        style: "background: transparent; border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 0.35rem 0.75rem; color: var(--text-secondary); cursor: pointer; font-size: 0.8rem;",
                        {lang.label("🔄 Refresh", "🔄 更新", "🔄 Reŝargi")}
                    }
                }

                if active_apps.is_empty() {
                    div { style: "padding: 1.5rem; text-align: center; color: var(--text-secondary); background: var(--bg-canvas); border-radius: var(--radius-sm); border: 1px dashed var(--border); font-size: 0.85rem;",
                        {
                            lang.label(
                                "No preview apps found. Create a part calling definy:preview to get started.",
                                "現在定義されているプレビューアプリはありません。definy:preview を呼び出すパーツを作成するとここに表示されます。",
                                "Neniuj antaŭrigardaj apoj trovitaj.",
                            )
                        }
                    }
                } else {
                    div { style: "display: flex; flex-direction: column; gap: 0.6rem;",
                        for app in active_apps.iter() {
                            PreviewAppRow {
                                key: "{app.app_id}",
                                app: app.clone(),
                                lang,
                            }
                        }
                    }
                }
            }
        }
    }
}

#[component]
fn PreviewAppRow(app: PreviewAppItem, lang: crate::language::Language) -> Element {
    let sub_url = build_preview_subdomain_url(&app.subdomain);
    let path_url = build_preview_path_url(&app.app_id);

    rsx! {
        div { style: "display: flex; align-items: center; justify-content: space-between; padding: 1rem 1.2rem; background: var(--bg-canvas); border: 1px solid var(--border); border-radius: var(--radius-sm); flex-wrap: wrap; gap: 0.8rem;",
            div { style: "display: flex; flex-direction: column; gap: 0.35rem;",
                div { style: "display: flex; align-items: center; gap: 0.6rem; flex-wrap: wrap;",
                    strong { style: "font-size: 0.95rem; color: var(--text-primary);",
                        "{app.display_name}"
                    }
                    span { style: "background: rgba(34, 197, 94, 0.15); color: #22c55e; padding: 0.15rem 0.5rem; border-radius: 4px; font-size: 0.75rem; font-weight: 600;",
                        "{app.status}"
                    }
                    span { style: "font-family: ui-monospace, monospace; font-size: 0.78rem; color: var(--text-muted); background: rgba(255, 255, 255, 0.05); padding: 0.1rem 0.4rem; border-radius: 3px;",
                        "code: \"{app.subdomain}\""
                    }
                }
                div { style: "display: flex; gap: 0.8rem; flex-wrap: wrap; font-size: 0.85rem; margin-top: 0.15rem;",
                    a {
                        href: "{sub_url}",
                        target: "_blank",
                        rel: "noopener noreferrer",
                        class: "btn-primary",
                        style: "padding: 0.35rem 0.75rem; font-size: 0.82rem; text-decoration: none; border-radius: var(--radius-xs); display: inline-flex; align-items: center; gap: 0.3rem;",
                        span {
                            "🌐 {lang.label(\"Open Preview\", \"プレビューを開く\", \"Malfermi Antaŭrigardon\")}"
                        }
                        span { style: "font-size: 0.7rem;", "↗" }
                    }
                    a {
                        href: "{path_url}",
                        target: "_blank",
                        rel: "noopener noreferrer",
                        style: "color: var(--text-secondary); text-decoration: underline; font-size: 0.82rem; display: inline-flex; align-items: center;",
                        "{path_url}"
                    }
                }
            }

            div { style: "display: flex; align-items: center; gap: 0.5rem;",
                span { style: "font-size: 0.76rem; color: var(--text-muted); font-family: ui-monospace, monospace; background: var(--surface); padding: 0.3rem 0.6rem; border-radius: var(--radius-xs); border: 1px solid var(--border);",
                    "Part: {app.part_id}"
                }
            }
        }
    }
}
