use definy_event::EventHashId;
use definy_event::rpc::{
    CONNECT_HEADER_PROTOCOL_VERSION, CONNECT_PROTOCOL_VERSION, CheckMissingHashesRequest,
    CheckMissingHashesResponse, ConnectError, ContentItem, GetContentRequest, GetEventRequest,
    GetEventResponse, GetEventsRequest, GetEventsResponse, PATH_CHECK_MISSING_HASHES,
    PATH_GET_CONTENT, PATH_GET_EVENT, PATH_GET_EVENTS, PATH_SUBMIT_EVENT, PATH_UPLOAD_CONTENT,
    UploadContentRequest,
};
use dioxus::prelude::*;

use crate::app_state::AppState;
use crate::cbor_card::{DecodedCborInfo, RenderDecodedCborCard, decode_signed_bytes};
use crate::page_context::PageContext;

#[derive(Clone, Copy, PartialEq, Eq, Debug)]
enum RpcTab {
    GetEvents,
    GetEvent,
    SubmitEvent,
    CheckMissingHashes,
    UploadContent,
    GetContent,
    CborDecoder,
}

#[component]
pub fn RpcExplorerView(
    state: AppState,
    context: PageContext,
    initial_target_hash: Option<EventHashId>,
) -> Element {
    let mut current_tab = use_signal(|| {
        if initial_target_hash.is_some() {
            RpcTab::GetEvent
        } else {
            RpcTab::GetEvents
        }
    });

    let mut filter_event_type = use_signal(|| "all".to_string());
    let mut limit_val = use_signal(|| "10".to_string());
    let mut offset_val = use_signal(|| "0".to_string());

    let mut get_event_hash = use_signal(|| {
        initial_target_hash
            .as_ref()
            .map(ToString::to_string)
            .unwrap_or_default()
    });

    let mut custom_cbor_input = use_signal(String::new);
    let mut check_hashes_input = use_signal(String::new);
    let mut upload_content_hash = use_signal(String::new);
    let mut upload_content_bytes = use_signal(String::new);
    let mut get_content_hash = use_signal(String::new);
    let mut missing_hashes_result = use_signal(Vec::<String>::new);

    let mut is_loading = use_signal(|| false);
    let mut response_status = use_signal(|| None::<String>);
    let mut response_json = use_signal(|| None::<String>);
    let mut decoded_events = use_signal(Vec::<DecodedCborInfo>::new);
    let mut error_text = use_signal(|| None::<String>);

    let lang = context.language;
    let page_shell_style = crate::layout::page_shell_style("1.2rem");

    let on_run_get_events = move |_| {
        is_loading.set(true);
        error_text.set(None);
        response_status.set(None);
        response_json.set(None);
        decoded_events.set(Vec::new());

        let ev_type = match filter_event_type().as_str() {
            "create_account" => Some("create_account".to_string()),
            "change_profile" => Some("change_profile".to_string()),
            "module_commit" => Some("module_commit".to_string()),
            _ => None,
        };
        let limit = limit_val().parse::<u64>().ok();
        let offset = offset_val().parse::<u64>().ok();

        spawn(async move {
            let req = GetEventsRequest {
                event_type: ev_type,
                limit,
                offset,
            };

            let req_body = match serde_json::to_string(&req) {
                Ok(b) => b,
                Err(e) => {
                    error_text.set(Some(format!("Serialize request failed: {e}")));
                    is_loading.set(false);
                    return;
                }
            };

            let base = crate::fetch::api_base_url();
            let url = format!("{}{}", base, PATH_GET_EVENTS);

            match fetch_rpc_json(&url, &req_body).await {
                Ok((status, text)) => {
                    response_status.set(Some(format!("HTTP {status} (Connect-RPC 1)")));
                    response_json.set(Some(text.clone()));

                    if let Ok(res) = serde_json::from_str::<GetEventsResponse>(&text) {
                        let decoded = res
                            .events
                            .iter()
                            .map(|item| decode_signed_bytes(&item.signed_event_bytes))
                            .collect::<Vec<_>>();
                        decoded_events.set(decoded);
                    } else if let Ok(err) = serde_json::from_str::<ConnectError>(&text) {
                        error_text.set(Some(format!("RPC Error [{}]: {}", err.code, err.message)));
                    }
                }
                Err(e) => {
                    error_text.set(Some(e));
                }
            }
            is_loading.set(false);
        });
    };

    let on_run_get_event = move |_| {
        let hash_str = get_event_hash().trim().to_string();
        if hash_str.is_empty() {
            error_text.set(Some("Please enter an event hash".to_string()));
            return;
        }

        is_loading.set(true);
        error_text.set(None);
        response_status.set(None);
        response_json.set(None);
        decoded_events.set(Vec::new());

        spawn(async move {
            let req = GetEventRequest {
                event_hash: hash_str,
            };
            let req_body = match serde_json::to_string(&req) {
                Ok(b) => b,
                Err(e) => {
                    error_text.set(Some(format!("Serialize request failed: {e}")));
                    is_loading.set(false);
                    return;
                }
            };

            let base = crate::fetch::api_base_url();
            let url = format!("{}{}", base, PATH_GET_EVENT);

            match fetch_rpc_json(&url, &req_body).await {
                Ok((status, text)) => {
                    response_status.set(Some(format!("HTTP {status} (Connect-RPC 1)")));
                    response_json.set(Some(text.clone()));

                    if let Ok(res) = serde_json::from_str::<GetEventResponse>(&text) {
                        if let Some(item) = res.event {
                            decoded_events.set(vec![decode_signed_bytes(&item.signed_event_bytes)]);
                        } else {
                            error_text.set(Some("Event not found in response".to_string()));
                        }
                    } else if let Ok(err) = serde_json::from_str::<ConnectError>(&text) {
                        error_text.set(Some(format!("RPC Error [{}]: {}", err.code, err.message)));
                    }
                }
                Err(e) => {
                    error_text.set(Some(e));
                }
            }
            is_loading.set(false);
        });
    };

    let on_decode_raw_cbor = move |_| {
        let raw = custom_cbor_input().trim().to_string();
        if raw.is_empty() {
            error_text.set(Some("Please enter Base64 or Hex CBOR binary".to_string()));
            return;
        }

        error_text.set(None);
        let bytes_opt: Option<Vec<u8>> = if let Ok(b) =
            base64::Engine::decode(&base64::engine::general_purpose::URL_SAFE_NO_PAD, &raw)
        {
            Some(b)
        } else if let Ok(b) =
            base64::Engine::decode(&base64::engine::general_purpose::STANDARD, &raw)
        {
            Some(b)
        } else {
            hex::decode(&raw).ok()
        };

        match bytes_opt {
            Some(bytes) => {
                let info = decode_signed_bytes(&bytes);
                decoded_events.set(vec![info]);
                response_status.set(Some("Decoded from local input".to_string()));
                response_json.set(None);
            }
            None => {
                error_text.set(Some("Failed to decode input as Base64 or Hex".to_string()));
            }
        }
    };

    let on_run_check_missing_hashes = move |_| {
        let text = check_hashes_input();
        let hashes: Vec<String> = text
            .split(|c: char| c == '\n' || c == ',' || c == ' ')
            .map(|s| s.trim().to_string())
            .filter(|s| !s.is_empty())
            .collect();

        if hashes.is_empty() {
            error_text.set(Some("Please enter at least one content hash".to_string()));
            return;
        }

        is_loading.set(true);
        error_text.set(None);
        response_status.set(None);
        response_json.set(None);
        decoded_events.set(Vec::new());

        spawn(async move {
            let req = CheckMissingHashesRequest {
                content_hashes: hashes,
            };
            let req_body = match serde_json::to_string(&req) {
                Ok(b) => b,
                Err(e) => {
                    error_text.set(Some(format!("Serialize request failed: {e}")));
                    is_loading.set(false);
                    return;
                }
            };

            let base = crate::fetch::api_base_url();
            let url = format!("{}{}", base, PATH_CHECK_MISSING_HASHES);

            match fetch_rpc_json(&url, &req_body).await {
                Ok((status, text)) => {
                    response_status.set(Some(format!("HTTP {status} (Connect-RPC 1)")));
                    response_json.set(Some(text.clone()));

                    if let Ok(res) = serde_json::from_str::<CheckMissingHashesResponse>(&text) {
                        missing_hashes_result.set(res.missing_content_hashes);
                    } else if let Ok(err) = serde_json::from_str::<ConnectError>(&text) {
                        error_text.set(Some(format!("RPC Error [{}]: {}", err.code, err.message)));
                    }
                }
                Err(e) => {
                    error_text.set(Some(e));
                }
            }
            is_loading.set(false);
        });
    };

    let on_run_upload_content = move |_| {
        let ch = upload_content_hash().trim().to_string();
        let raw_bytes_str = upload_content_bytes().trim().to_string();

        if ch.is_empty() {
            error_text.set(Some(
                "Please specify content_hash (e.g. ch-...)".to_string(),
            ));
            return;
        }

        let bytes_opt: Option<Vec<u8>> = if let Ok(b) = base64::Engine::decode(
            &base64::engine::general_purpose::URL_SAFE_NO_PAD,
            &raw_bytes_str,
        ) {
            Some(b)
        } else if let Ok(b) =
            base64::Engine::decode(&base64::engine::general_purpose::STANDARD, &raw_bytes_str)
        {
            Some(b)
        } else if let Ok(b) = hex::decode(&raw_bytes_str) {
            Some(b)
        } else {
            Some(raw_bytes_str.into_bytes())
        };

        let bytes = match bytes_opt {
            Some(b) if !b.is_empty() => b,
            _ => {
                error_text.set(Some(
                    "Please enter content bytes (Base64, Hex, or text)".to_string(),
                ));
                return;
            }
        };

        is_loading.set(true);
        error_text.set(None);
        response_status.set(None);
        response_json.set(None);
        decoded_events.set(Vec::new());

        spawn(async move {
            let req = UploadContentRequest {
                items: vec![ContentItem {
                    content_hash: ch,
                    content_bytes: bytes,
                }],
            };
            let req_body = match serde_json::to_string(&req) {
                Ok(b) => b,
                Err(e) => {
                    error_text.set(Some(format!("Serialize request failed: {e}")));
                    is_loading.set(false);
                    return;
                }
            };

            let base = crate::fetch::api_base_url();
            let url = format!("{}{}", base, PATH_UPLOAD_CONTENT);

            match fetch_rpc_json(&url, &req_body).await {
                Ok((status, text)) => {
                    response_status.set(Some(format!("HTTP {status} (Connect-RPC 1)")));
                    response_json.set(Some(text.clone()));
                    if let Ok(err) = serde_json::from_str::<ConnectError>(&text) {
                        error_text.set(Some(format!("RPC Error [{}]: {}", err.code, err.message)));
                    }
                }
                Err(e) => {
                    error_text.set(Some(e));
                }
            }
            is_loading.set(false);
        });
    };

    let on_run_get_content = move |_| {
        let ch = get_content_hash().trim().to_string();
        if ch.is_empty() {
            error_text.set(Some("Please enter a content hash (ch-...)".to_string()));
            return;
        }

        is_loading.set(true);
        error_text.set(None);
        response_status.set(None);
        response_json.set(None);
        decoded_events.set(Vec::new());

        spawn(async move {
            let req = GetContentRequest { content_hash: ch };
            let req_body = match serde_json::to_string(&req) {
                Ok(b) => b,
                Err(e) => {
                    error_text.set(Some(format!("Serialize request failed: {e}")));
                    is_loading.set(false);
                    return;
                }
            };

            let base = crate::fetch::api_base_url();
            let url = format!("{}{}", base, PATH_GET_CONTENT);

            match fetch_rpc_json(&url, &req_body).await {
                Ok((status, text)) => {
                    response_status.set(Some(format!("HTTP {status} (Connect-RPC 1)")));
                    response_json.set(Some(text.clone()));
                    if let Ok(err) = serde_json::from_str::<ConnectError>(&text) {
                        error_text.set(Some(format!("RPC Error [{}]: {}", err.code, err.message)));
                    }
                }
                Err(e) => {
                    error_text.set(Some(e));
                }
            }
            is_loading.set(false);
        });
    };

    rsx! {
        div { class: "page-shell", style: "{page_shell_style}",
            div { style: "display: grid; gap: 1.5rem;",
                // Header block
                div { style: "display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 1rem; border-bottom: 1px solid var(--border); padding-bottom: 1rem;",
                    div { style: "display: grid; gap: 0.35rem;",
                        h1 { style: "font-size: 1.5rem; font-weight: 700; margin: 0;",
                            "Connect-RPC & CBOR Explorer"
                        }
                        p { style: "font-size: 0.88rem; color: var(--text-secondary); margin: 0; max-width: 720px;",
                            "{lang.label(
                                \"Inspect and interact with Connect-RPC endpoints. Raw signed event binaries (Deterministic CBOR) are decoded and verified on-the-fly to show complete AST & cryptographic proofs.\",
                                \"Connect-RPCエンドポイントの対話的実行およびインスペクターです。送受信される署名付きイベント（Deterministic CBOR）をリアルタイムにデコードし、暗号署名やAST構造を表示します。\",
                                \"Inspektu kaj interagu kun Connect-RPC servoj. Determinaj CBOR-eventoj estas malkoditaj rekte kun kriptografiaj pruvoj.\",
                            )}"
                        }
                    }
                    div { style: "display: flex; gap: 0.6rem; align-items: center;",
                        a {
                            href: "/swagger-ui",
                            target: "_blank",
                            style: "display: inline-flex; align-items: center; gap: 0.4rem; font-size: 0.84rem; padding: 0.45rem 0.8rem; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-sm); color: var(--text); text-decoration: none;",
                            "Open Swagger UI ↗"
                        }
                    }
                }

                // API アーキテクチャとシーケンス図セクション
                crate::rpc_architecture::RpcArchitectureSection { context: context.clone() }

                // Tab navigation
                div { style: "display: flex; gap: 0.5rem; border-bottom: 1px solid var(--border); padding-bottom: 0.5rem; overflow-x: auto;",
                    button {
                        style: tab_button_style(current_tab() == RpcTab::GetEvents),
                        onclick: move |_| current_tab.set(RpcTab::GetEvents),
                        "GetEvents (RPC)"
                    }
                    button {
                        style: tab_button_style(current_tab() == RpcTab::GetEvent),
                        onclick: move |_| current_tab.set(RpcTab::GetEvent),
                        "GetEvent (RPC)"
                    }
                    button {
                        style: tab_button_style(current_tab() == RpcTab::SubmitEvent),
                        onclick: move |_| current_tab.set(RpcTab::SubmitEvent),
                        "SubmitEvent (RPC)"
                    }
                    button {
                        style: tab_button_style(current_tab() == RpcTab::CheckMissingHashes),
                        onclick: move |_| current_tab.set(RpcTab::CheckMissingHashes),
                        "CheckMissingHashes (RPC)"
                    }
                    button {
                        style: tab_button_style(current_tab() == RpcTab::UploadContent),
                        onclick: move |_| current_tab.set(RpcTab::UploadContent),
                        "UploadContent (RPC)"
                    }
                    button {
                        style: tab_button_style(current_tab() == RpcTab::GetContent),
                        onclick: move |_| current_tab.set(RpcTab::GetContent),
                        "GetContent (RPC)"
                    }
                    button {
                        style: tab_button_style(current_tab() == RpcTab::CborDecoder),
                        onclick: move |_| current_tab.set(RpcTab::CborDecoder),
                        "CBOR Decoder"
                    }
                }

                // Request form panel
                div { style: "background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-md); padding: 1.2rem; display: grid; gap: 1rem;",
                    match current_tab() {
                        RpcTab::GetEvents => rsx! {
                            div { style: "display: grid; gap: 0.8rem;",
                                div { style: "display: flex; align-items: center; gap: 0.6rem; font-family: monospace; font-size: 0.85rem; color: var(--primary);",
                                    span { style: "background: rgba(43, 192, 131, 0.15); color: #2bc083; padding: 0.2rem 0.5rem; border-radius: 4px; font-weight: 700;",
                                        "POST"
                                    }
                                    span { "{PATH_GET_EVENTS}" }
                                }
                                div { style: "display: flex; flex-wrap: wrap; gap: 1rem; align-items: flex-end;",
                                    div { style: "display: grid; gap: 0.3rem;",
                                        label { style: "font-size: 0.78rem; color: var(--text-secondary);", "eventType" }
                                        select {
                                            value: "{filter_event_type()}",
                                            onchange: move |e| filter_event_type.set(e.value()),
                                            style: "padding: 0.45rem 0.75rem; border-radius: var(--radius-sm); border: 1px solid var(--border); background: var(--bg); color: var(--text); font-size: 0.88rem;",
                                            option { value: "all", "All types" }
                                            option { value: "create_account", "create_account" }
                                            option { value: "change_profile", "change_profile" }
                                            option { value: "module_commit", "module_commit" }
                                        }
                                    }
                                    div { style: "display: grid; gap: 0.3rem;",
                                        label { style: "font-size: 0.78rem; color: var(--text-secondary);", "limit" }
                                        input {
                                            r#type: "number",
                                            value: "{limit_val()}",
                                            oninput: move |e| limit_val.set(e.value()),
                                            style: "width: 80px; padding: 0.45rem 0.6rem; border-radius: var(--radius-sm); border: 1px solid var(--border); background: var(--bg); color: var(--text); font-size: 0.88rem;",
                                        }
                                    }
                                    div { style: "display: grid; gap: 0.3rem;",
                                        label { style: "font-size: 0.78rem; color: var(--text-secondary);", "offset" }
                                        input {
                                            r#type: "number",
                                            value: "{offset_val()}",
                                            oninput: move |e| offset_val.set(e.value()),
                                            style: "width: 80px; padding: 0.45rem 0.6rem; border-radius: var(--radius-sm); border: 1px solid var(--border); background: var(--bg); color: var(--text); font-size: 0.88rem;",
                                        }
                                    }
                                    button {
                                        disabled: is_loading(),
                                        onclick: on_run_get_events,
                                        style: "padding: 0.5rem 1.2rem; background: var(--primary); color: #fff; border: none; border-radius: var(--radius-sm); font-weight: 600; cursor: pointer; font-size: 0.88rem;",
                                        if is_loading() {
                                            "Sending RPC..."
                                        } else {
                                            "Send GetEvents RPC"
                                        }
                                    }
                                }
                            }
                        },
                        RpcTab::GetEvent => rsx! {
                            div { style: "display: grid; gap: 0.8rem;",
                                div { style: "display: flex; align-items: center; gap: 0.6rem; font-family: monospace; font-size: 0.85rem; color: var(--primary);",
                                    span { style: "background: rgba(43, 192, 131, 0.15); color: #2bc083; padding: 0.2rem 0.5rem; border-radius: 4px; font-weight: 700;",
                                        "POST"
                                    }
                                    span { "{PATH_GET_EVENT}" }
                                }
                                div { style: "display: flex; flex-wrap: wrap; gap: 0.75rem; align-items: flex-end;",
                                    div { style: "display: grid; gap: 0.3rem; flex: 1; min-width: 280px;",
                                        label { style: "font-size: 0.78rem; color: var(--text-secondary);",
                                            "eventHash (EventHashId or Hex)"
                                        }
                                        input {
                                            r#type: "text",
                                            placeholder: "e.g. -5jktaWRZlN9SqpDYOvNnfSZ6_rz_tUMAzlZVCk0r6o",
                                            value: "{get_event_hash()}",
                                            oninput: move |e| get_event_hash.set(e.value()),
                                            style: "padding: 0.45rem 0.75rem; border-radius: var(--radius-sm); border: 1px solid var(--border); background: var(--bg); color: var(--text); font-family: monospace; font-size: 0.88rem;",
                                        }
                                    }
                                    button {
                                        disabled: is_loading(),
                                        onclick: on_run_get_event,
                                        style: "padding: 0.5rem 1.2rem; background: var(--primary); color: #fff; border: none; border-radius: var(--radius-sm); font-weight: 600; cursor: pointer; font-size: 0.88rem;",
                                        if is_loading() {
                                            "Fetching..."
                                        } else {
                                            "Fetch via Connect-RPC"
                                        }
                                    }
                                }
                                if !state.event_cache.is_empty() {
                                    div { style: "display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; font-size: 0.76rem; color: var(--text-secondary);",
                                        span { "Quick select from cached events:" }
                                        for hash in state.event_cache.keys().take(6) {
                                            button {
                                                style: "background: none; border: 1px solid var(--border); border-radius: 3px; padding: 0.15rem 0.4rem; font-family: monospace; font-size: 0.75rem; color: var(--primary); cursor: pointer;",
                                                onclick: {
                                                    let h_str = hash.to_string();
                                                    move |_| get_event_hash.set(h_str.clone())
                                                },
                                                "#{&hash.to_string()[..7.min(hash.to_string().len())]}"
                                            }
                                        }
                                    }
                                }
                            }
                        },
                        RpcTab::SubmitEvent => rsx! {
                            div { style: "display: grid; gap: 0.8rem;",
                                div { style: "display: flex; align-items: center; gap: 0.6rem; font-family: monospace; font-size: 0.85rem; color: var(--primary);",
                                    span { style: "background: rgba(43, 192, 131, 0.15); color: #2bc083; padding: 0.2rem 0.5rem; border-radius: 4px; font-weight: 700;",
                                        "POST"
                                    }
                                    span { "{PATH_SUBMIT_EVENT}" }
                                }
                                p { style: "font-size: 0.85rem; color: var(--text-secondary); margin: 0;",
                                    "Events are normally signed and submitted via the Account or Module edit UI. To test raw submission via Connect-RPC, use the Swagger UI or Postman."
                                }
                            }
                        },
                        RpcTab::CheckMissingHashes => rsx! {
                            div { style: "display: grid; gap: 0.8rem;",
                                div { style: "display: flex; align-items: center; gap: 0.6rem; font-family: monospace; font-size: 0.85rem; color: var(--primary);",
                                    span { style: "background: rgba(43, 192, 131, 0.15); color: #2bc083; padding: 0.2rem 0.5rem; border-radius: 4px; font-weight: 700;",
                                        "POST"
                                    }
                                    span { "{PATH_CHECK_MISSING_HASHES}" }
                                }
                                label { style: "font-size: 0.78rem; color: var(--text-secondary);",
                                    "Content Hashes to Check (one per line or comma-separated)"
                                }
                                textarea {
                                    rows: 3,
                                    placeholder: "ch-abcdef...\nch-123456...",
                                    value: "{check_hashes_input()}",
                                    oninput: move |e| check_hashes_input.set(e.value()),
                                    style: "padding: 0.6rem; border-radius: var(--radius-sm); border: 1px solid var(--border); background: var(--bg); color: var(--text); font-family: monospace; font-size: 0.84rem; resize: vertical;",
                                }
                                div { style: "display: flex; justify-content: flex-end;",
                                    button {
                                        disabled: is_loading(),
                                        onclick: on_run_check_missing_hashes,
                                        style: "padding: 0.5rem 1.2rem; background: var(--primary); color: #fff; border: none; border-radius: var(--radius-sm); font-weight: 600; cursor: pointer; font-size: 0.88rem;",
                                        "Check Missing Hashes RPC"
                                    }
                                }
                            }
                        },
                        RpcTab::UploadContent => rsx! {
                            div { style: "display: grid; gap: 0.8rem;",
                                div { style: "display: flex; align-items: center; gap: 0.6rem; font-family: monospace; font-size: 0.85rem; color: var(--primary);",
                                    span { style: "background: rgba(43, 192, 131, 0.15); color: #2bc083; padding: 0.2rem 0.5rem; border-radius: 4px; font-weight: 700;",
                                        "POST"
                                    }
                                    span { "{PATH_UPLOAD_CONTENT}" }
                                }
                                div { style: "display: grid; gap: 0.3rem;",
                                    label { style: "font-size: 0.78rem; color: var(--text-secondary);", "content_hash (ch-...)" }
                                    input {
                                        r#type: "text",
                                        placeholder: "ch-...",
                                        value: "{upload_content_hash()}",
                                        oninput: move |e| upload_content_hash.set(e.value()),
                                        style: "padding: 0.45rem 0.6rem; border-radius: var(--radius-sm); border: 1px solid var(--border); background: var(--bg); color: var(--text); font-family: monospace; font-size: 0.88rem;",
                                    }
                                }
                                div { style: "display: grid; gap: 0.3rem;",
                                    label { style: "font-size: 0.78rem; color: var(--text-secondary);", "content_bytes (Base64, Hex, or raw text)" }
                                    textarea {
                                        rows: 3,
                                        placeholder: "Base64 or hex encoded expression bytes...",
                                        value: "{upload_content_bytes()}",
                                        oninput: move |e| upload_content_bytes.set(e.value()),
                                        style: "padding: 0.6rem; border-radius: var(--radius-sm); border: 1px solid var(--border); background: var(--bg); color: var(--text); font-family: monospace; font-size: 0.84rem; resize: vertical;",
                                    }
                                }
                                div { style: "display: flex; justify-content: flex-end;",
                                    button {
                                        disabled: is_loading(),
                                        onclick: on_run_upload_content,
                                        style: "padding: 0.5rem 1.2rem; background: var(--primary); color: #fff; border: none; border-radius: var(--radius-sm); font-weight: 600; cursor: pointer; font-size: 0.88rem;",
                                        "Upload Content RPC"
                                    }
                                }
                            }
                        },
                        RpcTab::GetContent => rsx! {
                            div { style: "display: grid; gap: 0.8rem;",
                                div { style: "display: flex; align-items: center; gap: 0.6rem; font-family: monospace; font-size: 0.85rem; color: var(--primary);",
                                    span { style: "background: rgba(43, 192, 131, 0.15); color: #2bc083; padding: 0.2rem 0.5rem; border-radius: 4px; font-weight: 700;",
                                        "POST"
                                    }
                                    span { "{PATH_GET_CONTENT}" }
                                }
                                div { style: "display: flex; gap: 0.8rem; align-items: flex-end;",
                                    div { style: "display: grid; gap: 0.3rem; flex: 1;",
                                        label { style: "font-size: 0.78rem; color: var(--text-secondary);", "content_hash (ch-...)" }
                                        input {
                                            r#type: "text",
                                            placeholder: "ch-...",
                                            value: "{get_content_hash()}",
                                            oninput: move |e| get_content_hash.set(e.value()),
                                            style: "padding: 0.45rem 0.6rem; border-radius: var(--radius-sm); border: 1px solid var(--border); background: var(--bg); color: var(--text); font-family: monospace; font-size: 0.88rem;",
                                        }
                                    }
                                    button {
                                        disabled: is_loading(),
                                        onclick: on_run_get_content,
                                        style: "padding: 0.5rem 1.2rem; background: var(--primary); color: #fff; border: none; border-radius: var(--radius-sm); font-weight: 600; cursor: pointer; font-size: 0.88rem;",
                                        "Get Content RPC"
                                    }
                                }
                            }
                        },
                        RpcTab::CborDecoder => rsx! {
                            div { style: "display: grid; gap: 0.8rem;",
                                label { style: "font-size: 0.78rem; color: var(--text-secondary);",
                                    "Paste Raw Deterministic CBOR Binary (Base64 or Hex)"
                                }
                                textarea {
                                    rows: 3,
                                    placeholder: "Paste base64 or hex encoded signed event binary here...",
                                    value: "{custom_cbor_input()}",
                                    oninput: move |e| custom_cbor_input.set(e.value()),
                                    style: "padding: 0.6rem; border-radius: var(--radius-sm); border: 1px solid var(--border); background: var(--bg); color: var(--text); font-family: monospace; font-size: 0.84rem; resize: vertical;",
                                }
                                div { style: "display: flex; justify-content: flex-end;",
                                    button {
                                        onclick: on_decode_raw_cbor,
                                        style: "padding: 0.45rem 1.2rem; background: var(--primary); color: #fff; border: none; border-radius: var(--radius-sm); font-weight: 600; cursor: pointer; font-size: 0.88rem;",
                                        "Decode & Inspect CBOR"
                                    }
                                }
                            }
                        },
                    }
                }

                // Error alert
                if let Some(err) = error_text() {
                    div { style: "padding: 0.8rem 1rem; background: rgba(239, 68, 68, 0.12); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: var(--radius-sm); color: #ef4444; font-size: 0.88rem;",
                        "⚠ {err}"
                    }
                }

                // Status & Decoded events list
                if let Some(status) = response_status() {
                    div { style: "display: flex; justify-content: space-between; align-items: center;",
                        div { style: "font-size: 0.88rem; font-weight: 600; color: #2bc083; font-family: monospace;",
                            "● {status}"
                        }
                        if !decoded_events().is_empty() {
                            div { style: "font-size: 0.84rem; color: var(--text-secondary);",
                                "Found {decoded_events().len()} event(s) in Connect-RPC response"
                            }
                        }
                    }
                }

                // Render each decoded event
                for (idx, event_info) in decoded_events().iter().enumerate() {
                    RenderDecodedCborCard {
                        key: "{event_info.event_hash}",
                        index: idx,
                        info: event_info.clone(),
                        context: context.clone(),
                    }
                }

                // Raw JSON response collapse
                if let Some(raw_json) = response_json() {
                    details { style: "background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 0.6rem 0.8rem; font-size: 0.82rem;",
                        summary { style: "cursor: pointer; color: var(--text-secondary); font-weight: 500;",
                            "View Raw Connect-RPC JSON Payload ({raw_json.len()} bytes)"
                        }
                        pre { style: "margin-top: 0.6rem; padding: 0.8rem; background: rgba(0, 0, 0, 0.25); border-radius: var(--radius-sm); overflow-x: auto; font-family: monospace; font-size: 0.78rem; color: var(--text);",
                            "{raw_json}"
                        }
                    }
                }
            }
        }
    }
}

async fn fetch_rpc_json(url: &str, body: &str) -> Result<(u16, String), String> {
    let window = web_sys::window().ok_or_else(|| "No window available".to_string())?;

    let headers = web_sys::Headers::new().map_err(|e| format!("{e:?}"))?;
    headers
        .set("Content-Type", "application/json")
        .map_err(|e| format!("{e:?}"))?;
    headers
        .set(CONNECT_HEADER_PROTOCOL_VERSION, CONNECT_PROTOCOL_VERSION)
        .map_err(|e| format!("{e:?}"))?;

    let req_init = web_sys::RequestInit::new();
    req_init.set_method("POST");
    req_init.set_headers(&headers);
    req_init.set_body(&wasm_bindgen::JsValue::from_str(body));

    let promise = window.fetch_with_str_and_init(url, &req_init);
    let resp_val = wasm_bindgen_futures::JsFuture::from(promise)
        .await
        .map_err(|e| format!("Network error: {e:?}"))?;

    let resp: web_sys::Response = wasm_bindgen::JsCast::dyn_into(resp_val)
        .map_err(|_| "Failed to cast web_sys::Response".to_string())?;

    let status = resp.status();
    let text_promise = resp.text().map_err(|e| format!("{e:?}"))?;
    let text_val = wasm_bindgen_futures::JsFuture::from(text_promise)
        .await
        .map_err(|e| format!("{e:?}"))?;

    let text = text_val.as_string().unwrap_or_default();
    Ok((status, text))
}

fn tab_button_style(is_active: bool) -> &'static str {
    if is_active {
        "padding: 0.45rem 0.9rem; border: none; border-bottom: 2px solid var(--primary); background: none; color: var(--primary); font-weight: 600; cursor: pointer; font-size: 0.88rem;"
    } else {
        "padding: 0.45rem 0.9rem; border: none; border-bottom: 2px solid transparent; background: none; color: var(--text-secondary); cursor: pointer; font-size: 0.88rem;"
    }
}
