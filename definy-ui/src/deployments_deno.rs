use dioxus::prelude::*;

use crate::page_context::PageContext;

#[derive(Clone, Copy, PartialEq, Eq)]
pub enum DeployTargetMode {
    CustomScript,
    DefinyPart,
    SelfHostedSample,
    WasmHash,
}

#[derive(Clone, Copy, PartialEq, Eq)]
pub enum AppSelectionMode {
    Existing,
    CreateNew,
}

#[derive(Clone, PartialEq)]
pub enum DeployStatusState {
    Idle,
    Deploying,
    Success(definy_event::rpc::DeployDenoResponse),
    Error(String),
}

#[component]
pub fn DenoDeployCard(context: PageContext) -> Element {
    let lang = context.language;

    let mut token = use_signal(String::new);
    let mut show_token = use_signal(|| false);
    let mut app_selection_mode = use_signal(|| AppSelectionMode::Existing);
    let mut selected_existing_slug = use_signal(String::new);
    let mut new_app_slug = use_signal(String::new);

    let mut target_mode = use_signal(|| DeployTargetMode::CustomScript);
    let mut custom_script_content = use_signal(|| {
        "Deno.serve((_req: Request) => {\n  return Response.json({\n    service: \"edge-service\",\n    message: \"Hello from Deno Deploy Edge!\",\n    timestamp: new Date().toISOString(),\n  });\n});"
            .to_string()
    });
    let mut part_id = use_signal(String::new);
    let mut wasm_hash = use_signal(String::new);
    let mut deploy_state = use_signal(|| DeployStatusState::Idle);

    // Organization Token 入力に応じてアプリ一覧を非同期取得
    let apps_resource = use_resource(move || {
        let current_token = token.read().trim().to_string();
        async move {
            if current_token.is_empty() {
                return None;
            }
            let req = definy_event::rpc::ListDenoAppsRequest {
                org_token: current_token,
            };
            Some(crate::fetch::list_deno_apps(&req).await)
        }
    });

    let on_submit = move |_| {
        let current_token = token.read().trim().to_string();
        if current_token.is_empty() {
            deploy_state.set(DeployStatusState::Error(
                lang.label(
                    "Please provide a Deno Deploy Org Token / Access Token.",
                    "Deno Deploy の Org Token (Access Token) を入力してください。",
                    "Bonvolu provizi Deno Deploy Org Token.",
                )
                .to_string(),
            ));
            return;
        }

        // 選択された App Slug を決定
        let resolved_slug = match *app_selection_mode.read() {
            AppSelectionMode::Existing => {
                let slug = selected_existing_slug.read().trim().to_string();
                if slug.is_empty() {
                    // もし未選択なら apps_resource の先頭をフォールバックとして試行
                    if let Some(Some(Ok(res))) = apps_resource.read().as_ref()
                        && let Some(first) = res.apps.first()
                    {
                        Some(first.slug.clone())
                    } else {
                        None
                    }
                } else {
                    Some(slug)
                }
            }
            AppSelectionMode::CreateNew => {
                let slug = new_app_slug.read().trim().to_string();
                if slug.is_empty() { None } else { Some(slug) }
            }
        };

        let current_app_slug = match resolved_slug {
            Some(s) if !s.is_empty() => Some(s),
            _ => {
                deploy_state.set(DeployStatusState::Error(
                    lang.label(
                        "Please select an existing app or enter a new App Slug.",
                        "既存のアプリを選択するか、新しい App Slug を入力してください。",
                        "Bonvolu elekti ekzistantan apon aŭ enigi novan App Slug.",
                    )
                    .to_string(),
                ));
                return;
            }
        };

        let (c_script, c_part_id, c_self_hosted, c_wasm_hash) = match *target_mode.read() {
            DeployTargetMode::CustomScript => {
                let s = custom_script_content.read().trim().to_string();
                (if s.is_empty() { None } else { Some(s) }, None, None, None)
            }
            DeployTargetMode::DefinyPart => {
                let p = part_id.read().trim().to_string();
                (None, if p.is_empty() { None } else { Some(p) }, None, None)
            }
            DeployTargetMode::SelfHostedSample => (None, None, Some(true), None),
            DeployTargetMode::WasmHash => {
                let w = wasm_hash.read().trim().to_string();
                (None, None, None, if w.is_empty() { None } else { Some(w) })
            }
        };

        deploy_state.set(DeployStatusState::Deploying);

        spawn(async move {
            let req = definy_event::rpc::DeployDenoRequest {
                org_token: current_token,
                app_slug: current_app_slug,
                wasm_hash: c_wasm_hash,
                custom_script: c_script,
                compile_self_hosted: c_self_hosted,
                part_id: c_part_id,
            };
            match crate::fetch::deploy_deno(&req).await {
                Ok(res) => {
                    deploy_state.set(DeployStatusState::Success(res));
                }
                Err(err) => {
                    deploy_state.set(DeployStatusState::Error(err.to_string()));
                }
            }
        });
    };

    rsx! {
        div {
            class: "event-detail-card",
            style: "background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: 1.8rem; display: flex; flex-direction: column; gap: 1.3rem;",

            div { style: "display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.5rem;",
                h2 { style: "font-size: 1.3rem; font-weight: 700; margin: 0; color: var(--text-primary); display: flex; align-items: center; gap: 0.6rem;",
                    span { "⚡" }
                    {
                        lang.label(
                            "Deploy to Deno Deploy Edge",
                            "Deno Deploy エッジへのデプロイ実行",
                            "Deploji al Deno Deploy Rando",
                        )
                    }
                }
                span { style: "font-size: 0.78rem; font-weight: 600; padding: 0.2rem 0.6rem; border-radius: 9999px; background: rgba(56, 189, 248, 0.12); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.3);",
                    "REST API v2"
                }
            }

            p { style: "font-size: 0.88rem; color: var(--text-secondary); margin: 0; line-height: 1.5;",
                {
                    lang.label(
                        "Deploy any Web application, custom TypeScript script, definy Part, or WebAssembly binary directly to global edge isolates.",
                        "definy に限らず任意の TypeScript スクリプトや Web アプリ、あるいは definy 上で作成したパーツ (Part) を Wasm に動的コンパイルしてグローバルエッジにデプロイできます。",
                        "Deploju ajnan TypeScript-skripton, definy-parton, aŭ WebAssembly-binaron al tutmondaj izolitoj.",
                    )
                }
            }

            // フォームコンテナ
            div { style: "display: grid; gap: 1.1rem;",

                // Org Token 入力
                div { style: "display: flex; flex-direction: column; gap: 0.4rem;",
                    label { style: "font-size: 0.84rem; font-weight: 600; color: var(--text-primary); display: flex; justify-content: space-between;",
                        span {
                            {
                                lang.label(
                                    "Deno Deploy Token (Org Token / Access Token) *",
                                    "Deno Deploy トークン (Org Token / Access Token) *",
                                    "Deno Deploy Token *",
                                )
                            }
                        }
                        a {
                            href: "https://console.deno.com/narumincho",
                            target: "_blank",
                            rel: "noopener noreferrer",
                            style: "font-size: 0.78rem; color: #38bdf8; text-decoration: none;",
                            {
                                lang.label(
                                    "Create token in Deno Console ↗",
                                    "Deno Console でトークンを発行 ↗",
                                    "Krei ĵetonon en Deno Console ↗",
                                )
                            }
                        }
                    }
                    div { style: "display: flex; gap: 0.5rem;",
                        input {
                            r#type: if *show_token.read() { "text" } else { "password" },
                            placeholder: "ddp_...",
                            value: "{token.read()}",
                            oninput: move |e| token.set(e.value()),
                            style: "flex: 1; padding: 0.65rem 0.9rem; border-radius: var(--radius-sm); border: 1px solid var(--border); background: #090d16; color: #f8fafc; font-size: 0.9rem; font-family: monospace; outline: none;",
                        }
                        button {
                            r#type: "button",
                            onclick: move |_| {
                                let next = !*show_token.read();
                                show_token.set(next);
                            },
                            style: "padding: 0.65rem 0.9rem; background: rgba(255, 255, 255, 0.06); border: 1px solid var(--border); border-radius: var(--radius-sm); color: var(--text-secondary); cursor: pointer; font-size: 0.85rem;",
                            if *show_token.read() {
                                "Hide"
                            } else {
                                "Show"
                            }
                        }
                    }
                }

                // App Slug 選択 / 新規作成 UI
                div { style: "display: flex; flex-direction: column; gap: 0.5rem;",
                    label { style: "font-size: 0.84rem; font-weight: 600; color: var(--text-primary);",
                        {
                            lang.label(
                                "Target App (Select existing or create new) *",
                                "デプロイ対象 App (既存の選択 / 新規作成) *",
                                "Cela Apo (Elekti ekzistantan aŭ krei novan) *",
                            )
                        }
                    }

                    if token.read().trim().is_empty() {
                        div { style: "padding: 0.75rem 0.9rem; background: rgba(255, 255, 255, 0.03); border: 1px dashed var(--border); border-radius: var(--radius-sm); color: var(--text-secondary); font-size: 0.82rem;",
                            {
                                lang.label(
                                    "Enter your Deno Deploy Token above to load accessible apps or create a new one.",
                                    "上記の Deno Deploy トークンを入力すると、アクセス可能なアプリ一覧の選択肢または新規作成フォームが表示されます。",
                                    "Enigu Deno Deploy ĵetonon supre por ŝargi apoliston.",
                                )
                            }
                        }
                    } else {
                        match apps_resource.read().as_ref() {
                            None => rsx! {
                                div { style: "padding: 0.75rem 0.9rem; background: rgba(56, 189, 248, 0.05); border: 1px solid rgba(56, 189, 248, 0.2); border-radius: var(--radius-sm); color: #38bdf8; font-size: 0.84rem; display: flex; align-items: center; gap: 0.5rem;",
                                    span { style: "animation: spin 1s linear infinite; display: inline-block;", "⏳" }
                                    span {
                                        {
                                            lang.label(
                                                "Loading apps from Deno Deploy...",
                                                "Deno Deploy からアプリ一覧を取得しています...",
                                                "Ŝargante apojn el Deno Deploy...",
                                            )
                                        }
                                    }
                                }
                            },
                            Some(Some(Err(err))) => rsx! {
                                div { style: "display: flex; flex-direction: column; gap: 0.5rem;",
                                    div { style: "padding: 0.75rem 0.9rem; background: rgba(239, 68, 68, 0.08); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: var(--radius-sm); color: #f87171; font-size: 0.84rem;",
                                        "⚠️ "
                                        {
                                            lang.label(
                                                "Failed to load apps. You can still create a new app slug manually.",
                                                "アプリ一覧の取得に失敗しました。手動で App Slug を入力して新規作成できます。",
                                                "Malsukcesis ŝargi apojn. Enigu App Slug permane.",
                                            )
                                        }
                                        div { style: "font-family: monospace; font-size: 0.76rem; margin-top: 0.2rem; color: #fca5a5;",
                                            "{err}"
                                        }
                                    }
                                    input {
                                        r#type: "text",
                                        placeholder: lang.label(
                                            "e.g. my-new-edge-service",
                                            "例: my-new-edge-service",
                                            "ekz. my-new-edge-service",
                                        ),
                                        value: "{new_app_slug.read()}",
                                        oninput: move |e| {
                                            app_selection_mode.set(AppSelectionMode::CreateNew); // 選択肢 / 新規作成 切替ボタン  選択肢 / 新規作成 切替ボタン
                                            new_app_slug.set(e.value());
                                        },
                                        style: "padding: 0.65rem 0.9rem; border-radius: var(--radius-sm); border: 1px solid var(--border); background: #090d16; color: #f8fafc; font-size: 0.9rem; font-family: monospace; outline: none;",
                                    }
                                }
                            },
                            Some(Some(Ok(res))) => {
                                let has_apps = !res.apps.is_empty();
                                rsx! {
                                    div { style: "display: flex; flex-direction: column; gap: 0.6rem;",
                                        // 選択肢 / 新規作成 切替ボタン
                                        div { style: "display: flex; gap: 0.5rem; align-items: center;",
                                            button {
                                                r#type: "button",
                                                onclick: move |_| app_selection_mode.set(AppSelectionMode::Existing),
                                                disabled: !has_apps,
                                                style: if *app_selection_mode.read() == AppSelectionMode::Existing && has_apps { "padding: 0.4rem 0.8rem; border-radius: var(--radius-sm); font-size: 0.8rem; font-weight: 700; background: rgba(56, 189, 248, 0.2); border: 1px solid #38bdf8; color: #38bdf8; cursor: pointer;" } else { "padding: 0.4rem 0.8rem; border-radius: var(--radius-sm); font-size: 0.8rem; font-weight: 600; background: rgba(255, 255, 255, 0.04); border: 1px solid var(--border); color: var(--text-secondary); cursor: pointer;" },
                                                "📋 "

                                                {
                                                    lang.label(
                                                        "Select Existing App",
                                                        "既存のアプリから選択",
                                                        "Elekti Ekzistantan",
                                                    )
                                                }
                                                " ({res.apps.len()})"
                                            }
                                            button {
                                                r#type: "button",
                                                onclick: move |_| app_selection_mode.set(AppSelectionMode::CreateNew),
                                                style: if *app_selection_mode.read() == AppSelectionMode::CreateNew || !has_apps { "padding: 0.4rem 0.8rem; border-radius: var(--radius-sm); font-size: 0.8rem; font-weight: 700; background: rgba(34, 197, 94, 0.2); border: 1px solid #22c55e; color: #4ade80; cursor: pointer;" } else { "padding: 0.4rem 0.8rem; border-radius: var(--radius-sm); font-size: 0.8rem; font-weight: 600; background: rgba(255, 255, 255, 0.04); border: 1px solid var(--border); color: var(--text-secondary); cursor: pointer;" },
                                                "➕ "
                                                {lang.label("Create New App", "新規 App を作成", "Krei Novan Apon")}
                                            }
                                        }

                                        // 切替に応じた入力
                                        if *app_selection_mode.read() == AppSelectionMode::Existing && has_apps {
                                            div { style: "display: flex; flex-direction: column; gap: 0.35rem;",
                                                select {
                                                    value: if selected_existing_slug.read().is_empty() { res.apps.first().map(|a| a.slug.clone()).unwrap_or_default() } else { selected_existing_slug.read().clone() },
                                                    onchange: move |e| selected_existing_slug.set(e.value()),
                                                    style: "padding: 0.65rem 0.9rem; border-radius: var(--radius-sm); border: 1px solid var(--border); background: #090d16; color: #f8fafc; font-size: 0.9rem; font-family: monospace; outline: none;",
                                                    for app in &res.apps {
                                                        option { key: "{app.id}", value: "{app.slug}", "{app.slug}" }
                                                    }
                                                }
                                                span { style: "font-size: 0.74rem; color: var(--text-secondary);",
                                                    {
                                                        lang.label(
                                                            "Deploys directly to the chosen existing Deno Deploy application.",
                                                            "選択した既存の Deno Deploy アプリケーションに直接デプロイします。",
                                                            "Deploji al la elektita ekzistanta Deno Deploy apo.",
                                                        )
                                                    }
                                                }
                                            }
                                        } else {
                                            div { style: "display: flex; flex-direction: column; gap: 0.35rem;",
                                                input {
                                                    r#type: "text",
                                                    placeholder: lang.label(
                                                        "e.g. my-new-edge-service",
                                                        "例: my-new-edge-service",
                                                        "ekz. my-new-edge-service",
                                                    ),
                                                    value: "{new_app_slug.read()}",
                                                    oninput: move |e| new_app_slug.set(e.value()),
                                                    style: "padding: 0.65rem 0.9rem; border-radius: var(--radius-sm); border: 1px solid rgba(34, 197, 94, 0.4); background: #090d16; color: #f8fafc; font-size: 0.9rem; font-family: monospace; outline: none;",
                                                }
                                                span { style: "font-size: 0.74rem; color: var(--text-secondary);",
                                                    {
                                                        lang.label(
                                                            "Enter a new unique app slug (3-32 characters, lowercase letters, numbers, and hyphens).",
                                                            "新規作成する一意な App Slug を入力してください (3〜32文字、英小文字・数字・ハイフン)。",
                                                            "Enigu novan slug (3-32 signoj).",
                                                        )
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                            Some(None) => rsx! {},
                        }
                    }
                }

                // デプロイ対象ソースの選択 (タブ風ボタングループ)
                div { style: "display: flex; flex-direction: column; gap: 0.5rem;",
                    label { style: "font-size: 0.84rem; font-weight: 600; color: var(--text-primary);",
                        {
                            lang.label(
                                "Deployment Source Target",
                                "デプロイ対象ソースの選択",
                                "Deploja Fonto",
                            )
                        }
                    }
                    div { style: "display: flex; gap: 0.5rem; flex-wrap: wrap;",
                        button {
                            r#type: "button",
                            onclick: move |_| target_mode.set(DeployTargetMode::CustomScript),
                            style: if *target_mode.read() == DeployTargetMode::CustomScript { "padding: 0.45rem 0.9rem; border-radius: var(--radius-sm); font-size: 0.82rem; font-weight: 700; background: rgba(56, 189, 248, 0.2); border: 1px solid #38bdf8; color: #38bdf8; cursor: pointer;" } else { "padding: 0.45rem 0.9rem; border-radius: var(--radius-sm); font-size: 0.82rem; font-weight: 600; background: rgba(255, 255, 255, 0.04); border: 1px solid var(--border); color: var(--text-secondary); cursor: pointer;" },
                            "📄 "
                            {lang.label("TypeScript Script", "TypeScript スクリプト", "TypeScript")}
                        }
                        button {
                            r#type: "button",
                            onclick: move |_| target_mode.set(DeployTargetMode::DefinyPart),
                            style: if *target_mode.read() == DeployTargetMode::DefinyPart { "padding: 0.45rem 0.9rem; border-radius: var(--radius-sm); font-size: 0.82rem; font-weight: 700; background: rgba(168, 85, 247, 0.2); border: 1px solid #a855f7; color: #c084fc; cursor: pointer;" } else { "padding: 0.45rem 0.9rem; border-radius: var(--radius-sm); font-size: 0.82rem; font-weight: 600; background: rgba(255, 255, 255, 0.04); border: 1px solid var(--border); color: var(--text-secondary); cursor: pointer;" },
                            "🧩 "
                            {lang.label("definy Part", "definy パーツ", "definy Parto")}
                        }
                        button {
                            r#type: "button",
                            onclick: move |_| target_mode.set(DeployTargetMode::SelfHostedSample),
                            style: if *target_mode.read() == DeployTargetMode::SelfHostedSample { "padding: 0.45rem 0.9rem; border-radius: var(--radius-sm); font-size: 0.82rem; font-weight: 700; background: rgba(34, 197, 94, 0.2); border: 1px solid #22c55e; color: #4ade80; cursor: pointer;" } else { "padding: 0.45rem 0.9rem; border-radius: var(--radius-sm); font-size: 0.82rem; font-weight: 600; background: rgba(255, 255, 255, 0.04); border: 1px solid var(--border); color: var(--text-secondary); cursor: pointer;" },
                            "🧪 "
                            {
                                lang.label(
                                    "Self-Hosted Sample",
                                    "自己コンパイラ検証サンプル",
                                    "Specimeno",
                                )
                            }
                        }
                        button {
                            r#type: "button",
                            onclick: move |_| target_mode.set(DeployTargetMode::WasmHash),
                            style: if *target_mode.read() == DeployTargetMode::WasmHash { "padding: 0.45rem 0.9rem; border-radius: var(--radius-sm); font-size: 0.82rem; font-weight: 700; background: rgba(234, 179, 8, 0.2); border: 1px solid #eab308; color: #facc15; cursor: pointer;" } else { "padding: 0.45rem 0.9rem; border-radius: var(--radius-sm); font-size: 0.82rem; font-weight: 600; background: rgba(255, 255, 255, 0.04); border: 1px solid var(--border); color: var(--text-secondary); cursor: pointer;" },
                            "📦 "
                            {lang.label("Wasm Hash", "Wasm ハッシュ", "Wasm-Hako")}
                        }
                    }
                }

                // 選択されたソースに応じた入力フォーム
                match *target_mode.read() {
                    DeployTargetMode::CustomScript => rsx! {
                        div { style: "display: flex; flex-direction: column; gap: 0.4rem;",
                            label { style: "font-size: 0.84rem; font-weight: 600; color: #38bdf8;",
                                {
                                    lang.label(
                                        "Custom TypeScript / JavaScript Script (main.ts)",
                                        "カスタム TypeScript / JavaScript スクリプト (main.ts)",
                                        "Propra Skripto (main.ts)",
                                    )
                                }
                            }
                            textarea {
                                rows: "7",
                                value: "{custom_script_content.read()}",
                                oninput: move |e| custom_script_content.set(e.value()),
                                style: "padding: 0.75rem 0.9rem; border-radius: var(--radius-sm); border: 1px solid rgba(56, 189, 248, 0.3); background: #090d16; color: #f8fafc; font-size: 0.85rem; font-family: monospace; outline: none; line-height: 1.45; resize: vertical;",
                            }
                            span { style: "font-size: 0.74rem; color: var(--text-secondary);",
                                {
                                    lang.label(
                                        "Deploys directly as main.ts on Deno Deploy. Completely agnostic of definy.",
                                        "definy に依存せず、任意の Web サービスや API をそのまま Deno Deploy にデプロイできます。",
                                        "Deploji rekte kiel main.ts sur Deno Deploy.",
                                    )
                                }
                            }
                        }
                    },
                    DeployTargetMode::DefinyPart => rsx! {
                        div { style: "display: flex; flex-direction: column; gap: 0.4rem;",
                            label { style: "font-size: 0.84rem; font-weight: 600; color: #c084fc;",
                                {
                                    lang.label(
                                        "definy Part ID or Part Name",
                                        "definy パーツ ID またはパーツ名",
                                        "definy Parto-ID aŭ Nomo",
                                    )
                                }
                            }
                            input {
                                r#type: "text",
                                placeholder: lang.label(
                                    "e.g. calculate_answer or 32-byte hex ID",
                                    "例: calculate_answer または 32バイト hex パーツID",
                                    "ekz. calculate_answer",
                                ),
                                value: "{part_id.read()}",
                                oninput: move |e| part_id.set(e.value()),
                                style: "padding: 0.65rem 0.9rem; border-radius: var(--radius-sm); border: 1px solid rgba(168, 85, 247, 0.4); background: #090d16; color: #f8fafc; font-size: 0.9rem; font-family: monospace; outline: none;",
                            }
                            span { style: "font-size: 0.74rem; color: var(--text-secondary);",
                                {
                                    lang.label(
                                        "Compiles the specified definy part's expression to WebAssembly on-the-fly via core.compile-to-wasm.",
                                        "指定された definy パーツの式を core.compile-to-wasm でオンデマンドに Wasm 化してエッジに配備します。",
                                        "Kompilas la esprimon de definy-parto al Wasm.",
                                    )
                                }
                            }
                        }
                    },
                    DeployTargetMode::SelfHostedSample => rsx! {
                        div { style: "padding: 0.85rem 1rem; border-radius: var(--radius-sm); background: rgba(34, 197, 94, 0.08); border: 1px solid rgba(34, 197, 94, 0.25); display: flex; flex-direction: column; gap: 0.3rem;",
                            span { style: "font-weight: 700; font-size: 0.88rem; color: #4ade80;",
                                "🧩 "
                                {
                                    lang.label(
                                        "Arithmetic Sample (15 + 27 = 42)",
                                        "計算サンプル式 (15 + 27 = 42)",
                                        "Specimena Esprimo (15 + 27)",
                                    )
                                }
                            }
                            span { style: "font-size: 0.78rem; color: var(--text-secondary); line-height: 1.4;",
                                {
                                    lang.label(
                                        "Tests the self-hosted compiler pipeline by compiling an arithmetic expression AST into WebAssembly.",
                                        "definy の自己記述コンパイラパイプラインを即時テストするため、式 AST (15 + 27) を WebAssembly にコンパイルして配備します。",
                                        "Testas la mem-gastigitan kompililon per specimena esprimo.",
                                    )
                                }
                            }
                        }
                    },
                    DeployTargetMode::WasmHash => rsx! {
                        div { style: "display: flex; flex-direction: column; gap: 0.4rem;",
                            label { style: "font-size: 0.84rem; font-weight: 600; color: #facc15;",
                                {
                                    lang.label(
                                        "Virtual WebAssembly Content Hash",
                                        "仮想 WebAssembly コンテンツハッシュ",
                                        "Virtuala Wasm-hako",
                                    )
                                }
                            }
                            input {
                                r#type: "text",
                                placeholder: lang.label(
                                    "e.g. definy_client_bg",
                                    "例: definy_client_bg",
                                    "ekz. definy_client_bg",
                                ),
                                value: "{wasm_hash.read()}",
                                oninput: move |e| wasm_hash.set(e.value()),
                                style: "padding: 0.65rem 0.9rem; border-radius: var(--radius-sm); border: 1px solid rgba(234, 179, 8, 0.4); background: #090d16; color: #f8fafc; font-size: 0.9rem; font-family: monospace; outline: none;",
                            }
                            span { style: "font-size: 0.74rem; color: var(--text-secondary);",
                                {
                                    lang.label(
                                        "Bundles an existing WebAssembly binary from content store into edge assets.",
                                        "コンテンツストアに存在する任意の WebAssembly バイナリをエッジアセットに同梱します。",
                                        "Pakas ekzistantan Wasm-binaron.",
                                    )
                                }
                            }
                        }
                    },
                }

                // デプロイ実行ボタン
                div { style: "display: flex; align-items: center; gap: 1rem; margin-top: 0.4rem;",
                    button {
                        r#type: "button",
                        onclick: on_submit,
                        disabled: matches!(*deploy_state.read(), DeployStatusState::Deploying),
                        style: "padding: 0.75rem 1.8rem; background: linear-gradient(135deg, #0284c7 0%, #38bdf8 100%); color: #fff; border: none; border-radius: var(--radius-sm); font-size: 0.95rem; font-weight: 700; cursor: pointer; transition: transform 0.1s ease, opacity 0.15s ease; box-shadow: 0 4px 12px rgba(2, 132, 199, 0.35);",
                        match *deploy_state.read() {
                            DeployStatusState::Deploying => {
                                lang.label(
                                    "Deploying to Deno Deploy edge...",
                                    "Deno Deploy エッジへデプロイ中...",
                                    "Deplojas al Deno Deploy rando...",
                                )
                            }
                            _ => {
                                lang.label(
                                    "🚀 Deploy to Deno Deploy",
                                    "🚀 Deno Deploy へデプロイ",
                                    "🚀 Deploji al Deno Deploy",
                                )
                            }
                        }
                    }
                }
            }

            // 実行結果 / エラーメッセージ表示
            match deploy_state.read().clone() {
                DeployStatusState::Deploying => rsx! {
                    div { style: "padding: 1rem; background: rgba(56, 189, 248, 0.08); border: 1px solid rgba(56, 189, 248, 0.3); border-radius: var(--radius-sm); display: flex; align-items: center; gap: 0.8rem; color: #38bdf8; font-size: 0.88rem;",
                        span { style: "animation: spin 1s linear infinite; display: inline-block;", "⏳" }
                        span {
                            {
                                lang.label(
                                    "Connecting to Deno Deploy REST API v2, creating app revision, and assigning edge hostnames...",
                                    "Deno Deploy REST API v2 に接続し、リビジョンを作成してエッジホスト名を割り当てています...",
                                    "Konektas al Deno Deploy REST API v2...",
                                )
                            }
                        }
                    }
                },
                DeployStatusState::Success(res) => rsx! {
                    div { style: "padding: 1.2rem; background: rgba(34, 197, 94, 0.1); border: 1px solid rgba(34, 197, 94, 0.35); border-radius: var(--radius-sm); display: flex; flex-direction: column; gap: 0.75rem;",
                        div { style: "display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.5rem;",
                            div { style: "display: flex; align-items: center; gap: 0.5rem; color: #4ade80; font-weight: 700; font-size: 0.95rem;",
                                span { "🎉" }
                                span {
                                    {
                                        lang.label(
                                            "Deployment Successful!",
                                            "デプロイが完了しました！",
                                            "Deploja Sukceso!",
                                        )
                                    }
                                }
                            }
                            span { style: "font-size: 0.78rem; font-weight: 600; padding: 0.2rem 0.6rem; border-radius: 9999px; background: rgba(34, 197, 94, 0.2); color: #4ade80;",
                                "{res.status}"
                            }
                        }

                        div { style: "display: flex; flex-direction: column; gap: 0.35rem; font-size: 0.85rem;",
                            div { style: "display: flex; gap: 0.5rem; align-items: baseline;",
                                span { style: "color: var(--text-secondary); width: 85px;", "Public URL:" }
                                a {
                                    href: "{res.url}",
                                    target: "_blank",
                                    rel: "noopener noreferrer",
                                    style: "color: #38bdf8; font-weight: 700; font-size: 0.95rem; text-decoration: underline;",
                                    "{res.url} ↗"
                                }
                            }
                            if let Some(ref eval_val) = res.evaluated_result {
                                div { style: "display: flex; gap: 0.5rem; align-items: baseline;",
                                    span { style: "color: #c084fc; font-weight: 600; width: 85px;", "Eval Result:" }
                                    span { style: "font-family: monospace; color: #c084fc; font-weight: 700; font-size: 1rem;",
                                        "{eval_val}"
                                    }
                                    a {
                                        href: "{res.url}/api/eval",
                                        target: "_blank",
                                        rel: "noopener noreferrer",
                                        style: "margin-left: 0.6rem; font-size: 0.78rem; color: #38bdf8; text-decoration: underline;",
                                        "Edge JSON (/api/eval) ↗"
                                    }
                                }
                            }
                            div { style: "display: flex; gap: 0.5rem;",
                                span { style: "color: var(--text-secondary); width: 85px;", "App Slug:" }
                                span { style: "font-family: monospace; color: #f8fafc;", "{res.app_slug}" }
                            }
                            div { style: "display: flex; gap: 0.5rem;",
                                span { style: "color: var(--text-secondary); width: 85px;", "Revision ID:" }
                                span { style: "font-family: monospace; color: #f8fafc; font-size: 0.8rem;",
                                    "{res.revision_id}"
                                }
                            }
                        }
                    }
                },
                DeployStatusState::Error(err_msg) => rsx! {
                    div { style: "padding: 1rem; background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.35); border-radius: var(--radius-sm); display: flex; flex-direction: column; gap: 0.3rem; color: #f87171; font-size: 0.88rem;",
                        div { style: "font-weight: 700; display: flex; align-items: center; gap: 0.5rem;",
                            span { "⚠️" }
                            span {
                                {
                                    lang.label(
                                        "Deployment Failed",
                                        "デプロイに失敗しました",
                                        "Deploja Malsukceso",
                                    )
                                }
                            }
                        }
                        div { style: "font-family: monospace; font-size: 0.82rem; word-break: break-all;",
                            "{err_msg}"
                        }
                    }
                },
                DeployStatusState::Idle => rsx! {},
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_deno_deploy_card_renders_console_link_and_token_prompt() {
        let context = crate::PageContext::from_path_and_query("/", "", Some("ja"));
        let mut renderer = dioxus_ssr::Renderer::new();
        let html = renderer.render_element(rsx! {
            DenoDeployCard { context }
        });

        // 1. Deno Console へのリンクが含まれていること
        assert!(
            html.contains("https://console.deno.com/narumincho"),
            "Should contain console link, got: {html}"
        );
        assert!(
            html.contains("Deno Console でトークンを発行"),
            "Should contain label for Deno Console token, got: {html}"
        );

        // 2. トークン未入力時に案内メッセージが表示されていること
        assert!(
            html.contains("上記の Deno Deploy トークンを入力すると"),
            "Should contain prompt to enter token, got: {html}"
        );

        // 3. デプロイボタンが含まれていること
        assert!(
            html.contains("Deno Deploy へデプロイ"),
            "Should contain deploy button, got: {html}"
        );
    }
}
