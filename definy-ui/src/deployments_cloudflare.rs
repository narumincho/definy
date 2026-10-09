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
pub enum WorkerSelectionMode {
    Existing,
    CreateNew,
}

#[derive(Clone, PartialEq)]
pub enum DeployStatusState {
    Idle,
    Deploying,
    Success(definy_event::rpc::DeployCloudflareResponse),
    Error(String),
}

#[component]
pub fn CloudflareWorkersCard(context: PageContext) -> Element {
    let lang = context.language;

    let mut token = use_signal(String::new);
    let mut show_token = use_signal(|| false);
    let mut account_id = use_signal(String::new);
    let mut worker_selection_mode = use_signal(|| WorkerSelectionMode::Existing);
    let mut selected_existing_script = use_signal(String::new);
    let mut new_script_name = use_signal(String::new);

    let mut target_mode = use_signal(|| DeployTargetMode::CustomScript);
    let mut custom_script_content = use_signal(|| {
        "export default {\n  async fetch(request, env, ctx) {\n    return new Response(JSON.stringify({\n      service: \"cloudflare-workers\",\n      message: \"Hello from Cloudflare Workers!\",\n      timestamp: new Date().toISOString(),\n    }), {\n      headers: { \"content-type\": \"application/json\" },\n    });\n  },\n};"
            .to_string()
    });
    let mut part_id = use_signal(String::new);
    let mut wasm_hash = use_signal(String::new);
    let mut deploy_state = use_signal(|| DeployStatusState::Idle);

    // API Token / Account ID 入力に応じて Worker 一覧を非同期取得
    let workers_resource = use_resource(move || {
        let current_token = token.read().trim().to_string();
        let current_account_id = account_id.read().trim().to_string();
        async move {
            if current_token.is_empty() {
                return None;
            }
            let req = definy_event::rpc::ListCloudflareWorkersRequest {
                api_token: current_token,
                account_id: if current_account_id.is_empty() {
                    None
                } else {
                    Some(current_account_id)
                },
            };
            Some(crate::fetch::list_cloudflare_workers(&req).await)
        }
    });

    let on_submit = move |_| {
        let current_token = token.read().trim().to_string();
        if current_token.is_empty() {
            deploy_state.set(DeployStatusState::Error(
                lang.label(
                    "Please provide a Cloudflare API Token.",
                    "Cloudflare API トークンを入力してください。",
                    "Bonvolu provizi Cloudflare API ĵetonon.",
                )
                .to_string(),
            ));
            return;
        }

        let current_account_id = account_id.read().trim().to_string();
        let current_account_id_opt = if current_account_id.is_empty() {
            None
        } else {
            Some(current_account_id)
        };

        // 選択された Worker 名 (script_name) を決定
        let resolved_script_name = match *worker_selection_mode.read() {
            WorkerSelectionMode::Existing => {
                let name = selected_existing_script.read().trim().to_string();
                if name.is_empty() {
                    // もし未選択なら workers_resource の先頭をフォールバックとして試行
                    if let Some(Some(Ok(res))) = workers_resource.read().as_ref()
                        && let Some(first) = res.workers.first()
                    {
                        Some(first.id.clone())
                    } else {
                        None
                    }
                } else {
                    Some(name)
                }
            }
            WorkerSelectionMode::CreateNew => {
                let name = new_script_name.read().trim().to_string();
                if name.is_empty() { None } else { Some(name) }
            }
        };

        let current_script_name = match resolved_script_name {
            Some(s) if !s.is_empty() => s,
            _ => {
                deploy_state.set(DeployStatusState::Error(
                    lang.label(
                        "Please select an existing Worker or enter a new Worker Name.",
                        "既存の Worker を選択するか、新しい Worker 名を入力してください。",
                        "Bonvolu elekti ekzistantan Worker aŭ enigi novan Worker-nomon.",
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
            let req = definy_event::rpc::DeployCloudflareRequest {
                api_token: current_token,
                account_id: current_account_id_opt,
                script_name: Some(current_script_name),
                wasm_hash: c_wasm_hash,
                custom_script: c_script,
                compile_self_hosted: c_self_hosted,
                part_id: c_part_id,
            };
            match crate::fetch::deploy_cloudflare(&req).await {
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
                            "Deploy to Cloudflare Workers",
                            "Cloudflare Workers へのデプロイ実行",
                            "Deploji al Cloudflare Workers",
                        )
                    }
                }
                span { style: "font-size: 0.78rem; font-weight: 600; padding: 0.2rem 0.6rem; border-radius: 9999px; background: rgba(249, 115, 22, 0.12); color: #fb923c; border: 1px solid rgba(249, 115, 22, 0.3);",
                    "REST API v4"
                }
            }

            p { style: "font-size: 0.88rem; color: var(--text-secondary); margin: 0; line-height: 1.5;",
                {
                    lang.label(
                        "Deploy any Web application, ES Modules script, definy Part, or WebAssembly binary directly to Cloudflare Workers edge network.",
                        "definy に限らず任意の JavaScript / TypeScript ES Modules スクリプト、あるいは definy 上で作成したパーツ (Part) を Wasm に動的コンパイルして Cloudflare Workers にデプロイできます。",
                        "Deploju ajnan ES Modules skripton, definy-parton, aŭ WebAssembly-binaron al Cloudflare Workers.",
                    )
                }
            }

            // フォームコンテナ
            div { style: "display: grid; gap: 1.1rem;",

                // API Token 入力
                div { style: "display: flex; flex-direction: column; gap: 0.4rem;",
                    label { style: "font-size: 0.84rem; font-weight: 600; color: var(--text-primary); display: flex; justify-content: space-between;",
                        span {
                            {
                                lang.label(
                                    "Cloudflare API Token (Workers Edit permissions) *",
                                    "Cloudflare API トークン (Workers 編集権限) *",
                                    "Cloudflare API ĵetono *",
                                )
                            }
                        }
                        a {
                            href: "https://dash.cloudflare.com/profile/api-tokens",
                            target: "_blank",
                            rel: "noopener noreferrer",
                            style: "font-size: 0.78rem; color: #fb923c; text-decoration: none;",
                            {
                                lang.label(
                                    "Create token in Cloudflare Dashboard ↗",
                                    "Cloudflare ダッシュボードでトークンを発行 ↗",
                                    "Krei ĵetonon en Cloudflare ↗",
                                )
                            }
                        }
                    }
                    div { style: "display: flex; gap: 0.5rem;",
                        input {
                            r#type: if *show_token.read() { "text" } else { "password" },
                            placeholder: "cf_...",
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

                // Account ID 入力 (任意)
                div { style: "display: flex; flex-direction: column; gap: 0.4rem;",
                    label { style: "font-size: 0.84rem; font-weight: 600; color: var(--text-primary);",
                        {
                            lang.label(
                                "Account ID (Optional - automatically detected from token if blank)",
                                "Account ID (任意 - 空欄の場合はトークンから自動解決)",
                                "Konto ID (Laŭvola - aŭtomate solvita)",
                            )
                        }
                    }
                    input {
                        r#type: "text",
                        placeholder: lang.label(
                            "Auto-detected from API token if blank",
                            "空欄の場合は API トークンから自動検出",
                            "Aŭtomate detektita se malplena",
                        ),
                        value: "{account_id.read()}",
                        oninput: move |e| account_id.set(e.value()),
                        style: "padding: 0.65rem 0.9rem; border-radius: var(--radius-sm); border: 1px solid var(--border); background: #090d16; color: #f8fafc; font-size: 0.9rem; font-family: monospace; outline: none;",
                    }
                }

                // Worker Script 選択 / 新規作成 UI
                div { style: "display: flex; flex-direction: column; gap: 0.5rem;",
                    label { style: "font-size: 0.84rem; font-weight: 600; color: var(--text-primary);",
                        {
                            lang.label(
                                "Target Worker (Select existing or create new) *",
                                "デプロイ対象 Worker (既存の選択 / 新規作成) *",
                                "Cela Worker (Elekti ekzistantan aŭ krei novan) *",
                            )
                        }
                    }

                    if token.read().trim().is_empty() {
                        div { style: "padding: 0.75rem 0.9rem; background: rgba(255, 255, 255, 0.03); border: 1px dashed var(--border); border-radius: var(--radius-sm); color: var(--text-secondary); font-size: 0.82rem;",
                            {
                                lang.label(
                                    "Enter your Cloudflare API Token above to load accessible Workers or create a new one.",
                                    "上記の Cloudflare API トークンを入力すると、アクセス可能な Worker 一覧の選択肢または新規作成フォームが表示されます。",
                                    "Enigu Cloudflare API ĵetonon supre por ŝargi Worker-liston.",
                                )
                            }
                        }
                    } else {
                        match workers_resource.read().as_ref() {
                            None => rsx! {
                                div { style: "padding: 0.75rem 0.9rem; background: rgba(249, 115, 22, 0.05); border: 1px solid rgba(249, 115, 22, 0.2); border-radius: var(--radius-sm); color: #fb923c; font-size: 0.84rem; display: flex; align-items: center; gap: 0.5rem;",
                                    span { style: "animation: spin 1s linear infinite; display: inline-block;", "⏳" }
                                    span {
                                        {
                                            lang.label(
                                                "Loading Workers from Cloudflare...",
                                                "Cloudflare から Worker 一覧を取得しています...",
                                                "Ŝargante Workers el Cloudflare...",
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
                                                "Failed to load Workers. You can still create or specify a Worker name manually.",
                                                "Worker 一覧の取得に失敗しました。手動で Worker 名を入力して新規デプロイできます。",
                                                "Malsukcesis ŝargi Workers. Enigu Worker-nomon permane.",
                                            )
                                        }
                                        div { style: "font-family: monospace; font-size: 0.76rem; margin-top: 0.2rem; color: #fca5a5;",
                                            "{err}"
                                        }
                                    }
                                    input {
                                        r#type: "text",
                                        placeholder: lang.label(
                                            "e.g. my-worker-service",
                                            "例: my-worker-service",
                                            "ekz. my-worker-service",
                                        ),
                                        value: "{new_script_name.read()}",
                                        oninput: move |e| {
                                            worker_selection_mode.set(WorkerSelectionMode::CreateNew);
                                            new_script_name.set(e.value());
                                        },
                                        style: "padding: 0.65rem 0.9rem; border-radius: var(--radius-sm); border: 1px solid var(--border); background: #090d16; color: #f8fafc; font-size: 0.9rem; font-family: monospace; outline: none;",
                                    }
                                }
                            },
                            Some(Some(Ok(res))) => {
                                let has_workers = !res.workers.is_empty();
                                rsx! {
                                    div { style: "display: flex; flex-direction: column; gap: 0.6rem;",
                                        // 選択肢 / 新規作成 切替ボタン
                                        div { style: "display: flex; gap: 0.5rem; align-items: center;",
                                            button {
                                                r#type: "button",
                                                onclick: move |_| worker_selection_mode.set(WorkerSelectionMode::Existing),
                                                disabled: !has_workers,
                                                style: if *worker_selection_mode.read() == WorkerSelectionMode::Existing && has_workers { "padding: 0.4rem 0.8rem; border-radius: var(--radius-sm); font-size: 0.8rem; font-weight: 700; background: rgba(249, 115, 22, 0.2); border: 1px solid #f97316; color: #fb923c; cursor: pointer;" } else { "padding: 0.4rem 0.8rem; border-radius: var(--radius-sm); font-size: 0.8rem; font-weight: 600; background: rgba(255, 255, 255, 0.04); border: 1px solid var(--border); color: var(--text-secondary); cursor: pointer;" },
                                                "📋 "

                                                {
                                                    lang.label(
                                                        "Select Existing Worker",
                                                        "既存の Worker から選択",
                                                        "Elekti Ekzistantan",
                                                    )
                                                }
                                                " ({res.workers.len()})"
                                            }
                                            button {
                                                r#type: "button",
                                                onclick: move |_| worker_selection_mode.set(WorkerSelectionMode::CreateNew),
                                                style: if *worker_selection_mode.read() == WorkerSelectionMode::CreateNew || !has_workers { "padding: 0.4rem 0.8rem; border-radius: var(--radius-sm); font-size: 0.8rem; font-weight: 700; background: rgba(34, 197, 94, 0.2); border: 1px solid #22c55e; color: #4ade80; cursor: pointer;" } else { "padding: 0.4rem 0.8rem; border-radius: var(--radius-sm); font-size: 0.8rem; font-weight: 600; background: rgba(255, 255, 255, 0.04); border: 1px solid var(--border); color: var(--text-secondary); cursor: pointer;" },
                                                "➕ "
                                                {lang.label("Create New Worker", "新規 Worker を作成", "Krei Novan Worker")}
                                            }
                                        }

                                        // 切替に応じた入力
                                        if *worker_selection_mode.read() == WorkerSelectionMode::Existing && has_workers {
                                            div { style: "display: flex; flex-direction: column; gap: 0.35rem;",
                                                select {
                                                    value: if selected_existing_script.read().is_empty() { res.workers.first().map(|w| w.id.clone()).unwrap_or_default() } else { selected_existing_script.read().clone() },
                                                    onchange: move |e| selected_existing_script.set(e.value()),
                                                    style: "padding: 0.65rem 0.9rem; border-radius: var(--radius-sm); border: 1px solid var(--border); background: #090d16; color: #f8fafc; font-size: 0.9rem; font-family: monospace; outline: none;",
                                                    for w in &res.workers {
                                                        option { key: "{w.id}", value: "{w.id}", "{w.id}" }
                                                    }
                                                }
                                                span { style: "font-size: 0.74rem; color: var(--text-secondary);",
                                                    {
                                                        lang.label(
                                                            "Deploys directly to the chosen existing Cloudflare Worker.",
                                                            "選択した既存の Cloudflare Worker に直接デプロイします。",
                                                            "Deploji al la elektita ekzistanta Worker.",
                                                        )
                                                    }
                                                }
                                            }
                                        } else {
                                            div { style: "display: flex; flex-direction: column; gap: 0.35rem;",
                                                input {
                                                    r#type: "text",
                                                    placeholder: lang.label(
                                                        "e.g. my-worker-service",
                                                        "例: my-worker-service",
                                                        "ekz. my-worker-service",
                                                    ),
                                                    value: "{new_script_name.read()}",
                                                    oninput: move |e| new_script_name.set(e.value()),
                                                    style: "padding: 0.65rem 0.9rem; border-radius: var(--radius-sm); border: 1px solid rgba(34, 197, 94, 0.4); background: #090d16; color: #f8fafc; font-size: 0.9rem; font-family: monospace; outline: none;",
                                                }
                                                span { style: "font-size: 0.74rem; color: var(--text-secondary);",
                                                    {
                                                        lang.label(
                                                            "Enter a new unique Worker script name (lowercase letters, numbers, and hyphens).",
                                                            "新規作成する一意な Worker 名を入力してください (英小文字・数字・ハイフン)。",
                                                            "Enigu novan nomon.",
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
                            style: if *target_mode.read() == DeployTargetMode::CustomScript { "padding: 0.45rem 0.9rem; border-radius: var(--radius-sm); font-size: 0.82rem; font-weight: 700; background: rgba(249, 115, 22, 0.2); border: 1px solid #f97316; color: #fb923c; cursor: pointer;" } else { "padding: 0.45rem 0.9rem; border-radius: var(--radius-sm); font-size: 0.82rem; font-weight: 600; background: rgba(255, 255, 255, 0.04); border: 1px solid var(--border); color: var(--text-secondary); cursor: pointer;" },
                            "📄 "
                            {lang.label("JavaScript / ES Module", "JavaScript / ES Module", "JavaScript")}
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
                            label { style: "font-size: 0.84rem; font-weight: 600; color: #fb923c;",
                                {
                                    lang.label(
                                        "Custom ES Modules Script (worker.js)",
                                        "カスタム ES Modules スクリプト (worker.js)",
                                        "Propra Skripto (worker.js)",
                                    )
                                }
                            }
                            textarea {
                                rows: "7",
                                value: "{custom_script_content.read()}",
                                oninput: move |e| custom_script_content.set(e.value()),
                                style: "padding: 0.75rem 0.9rem; border-radius: var(--radius-sm); border: 1px solid rgba(249, 115, 22, 0.3); background: #090d16; color: #f8fafc; font-size: 0.85rem; font-family: monospace; outline: none; line-height: 1.45; resize: vertical;",
                            }
                            span { style: "font-size: 0.74rem; color: var(--text-secondary);",
                                {
                                    lang.label(
                                        "Deploys directly as an ES Modules worker on Cloudflare Workers. Completely agnostic of definy.",
                                        "definy に依存せず、任意の Web サービスや API をそのまま Cloudflare Workers にデプロイできます。",
                                        "Deploji rekte kiel worker.js sur Cloudflare Workers.",
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
                        style: "padding: 0.75rem 1.8rem; background: linear-gradient(135deg, #ea580c 0%, #f97316 100%); color: #fff; border: none; border-radius: var(--radius-sm); font-size: 0.95rem; font-weight: 700; cursor: pointer; transition: transform 0.1s ease, opacity 0.15s ease; box-shadow: 0 4px 12px rgba(234, 88, 12, 0.35);",
                        match *deploy_state.read() {
                            DeployStatusState::Deploying => {
                                lang.label(
                                    "Deploying to Cloudflare Workers...",
                                    "Cloudflare Workers へデプロイ中...",
                                    "Deplojas al Cloudflare Workers...",
                                )
                            }
                            _ => {
                                lang.label(
                                    "🚀 Deploy to Cloudflare Workers",
                                    "🚀 Cloudflare Workers へデプロイ",
                                    "🚀 Deploji al Cloudflare Workers",
                                )
                            }
                        }
                    }
                }
            }

            // 実行結果 / エラーメッセージ表示
            match deploy_state.read().clone() {
                DeployStatusState::Deploying => rsx! {
                    div { style: "padding: 1rem; background: rgba(249, 115, 22, 0.08); border: 1px solid rgba(249, 115, 22, 0.3); border-radius: var(--radius-sm); display: flex; align-items: center; gap: 0.8rem; color: #fb923c; font-size: 0.88rem;",
                        span { style: "animation: spin 1s linear infinite; display: inline-block;", "⏳" }
                        span {
                            {
                                lang.label(
                                    "Connecting to Cloudflare Workers REST API v4, uploading script multipart bundle, and enabling workers.dev subdomain...",
                                    "Cloudflare Workers REST API v4 に接続し、スクリプトをアップロードして workers.dev サブドメインを有効化しています...",
                                    "Konektas al Cloudflare Workers REST API v4...",
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
                                span { style: "color: var(--text-secondary); width: 95px;", "Public URL:" }
                                a {
                                    href: "{res.url}",
                                    target: "_blank",
                                    rel: "noopener noreferrer",
                                    style: "color: #fb923c; font-weight: 700; font-size: 0.95rem; text-decoration: underline;",
                                    "{res.url} ↗"
                                }
                            }
                            if let Some(ref eval_val) = res.evaluated_result {
                                div { style: "display: flex; gap: 0.5rem; align-items: baseline;",
                                    span { style: "color: #c084fc; font-weight: 600; width: 95px;", "Eval Result:" }
                                    span { style: "font-family: monospace; color: #c084fc; font-weight: 700; font-size: 1rem;",
                                        "{eval_val}"
                                    }
                                    a {
                                        href: "{res.url}/api/eval",
                                        target: "_blank",
                                        rel: "noopener noreferrer",
                                        style: "margin-left: 0.6rem; font-size: 0.78rem; color: #fb923c; text-decoration: underline;",
                                        "Worker JSON (/api/eval) ↗"
                                    }
                                }
                            }
                            div { style: "display: flex; gap: 0.5rem;",
                                span { style: "color: var(--text-secondary); width: 95px;", "Worker Name:" }
                                span { style: "font-family: monospace; color: #f8fafc;", "{res.script_name}" }
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
    fn test_cloudflare_workers_card_renders_dashboard_link_and_token_prompt() {
        let context = crate::PageContext::from_path_and_query("/", "", Some("ja"));
        let mut renderer = dioxus_ssr::Renderer::new();
        let html = renderer.render_element(rsx! {
            CloudflareWorkersCard { context }
        });

        // 1. Cloudflare Dashboard へのトークン作成リンクが含まれていること
        assert!(
            html.contains("https://dash.cloudflare.com/profile/api-tokens"),
            "Should contain dashboard link, got: {html}"
        );
        assert!(
            html.contains("Cloudflare ダッシュボードでトークンを発行"),
            "Should contain label for token creation, got: {html}"
        );

        // 2. トークン未入力時に案内メッセージが表示されていること
        assert!(
            html.contains("上記の Cloudflare API トークンを入力すると"),
            "Should contain prompt to enter token, got: {html}"
        );

        // 3. デプロイボタンが含まれていること
        assert!(
            html.contains("Cloudflare Workers へデプロイ"),
            "Should contain deploy button, got: {html}"
        );
    }
}
