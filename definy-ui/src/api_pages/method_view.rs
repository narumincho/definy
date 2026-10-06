use definy_event::EventHashId;
use definy_event::rpc::{
    CONNECT_HEADER_PROTOCOL_VERSION, CONNECT_PROTOCOL_VERSION, CheckMissingHashesRequest,
    ConnectError, ContentItem, GetContentRequest, GetEventRequest, GetEventResponse,
    GetEventsRequest, GetEventsResponse, SubmitEventRequest, SubmitEventResponse,
    UploadContentRequest,
};
use dioxus::prelude::*;

use super::method_nav::{ApiNavActive, ApiSubNav};
use super::method_schema::get_method_schema;
use crate::app_state::{ApiMethod, AppState};
use crate::cbor_card::{DecodedCborInfo, RenderDecodedCborCard, decode_signed_bytes};
use crate::language::Language;
use crate::page_context::PageContext;

#[component]
pub fn RpcMethodDetailView(
    state: AppState,
    context: PageContext,
    method: ApiMethod,
    initial_target_hash: Option<EventHashId>,
) -> Element {
    let schema = get_method_schema(method);
    let lang = context.language;
    let page_shell_style = crate::layout::page_shell_style("1.2rem");

    // テスターの状態
    let mut get_events_filter = use_signal(|| "all".to_string());
    let mut get_events_limit = use_signal(|| "10".to_string());
    let mut get_events_offset = use_signal(|| "0".to_string());

    let mut get_event_hash = use_signal(|| {
        initial_target_hash
            .as_ref()
            .map(ToString::to_string)
            .unwrap_or_default()
    });

    let mut submit_event_bytes = use_signal(String::new);
    let mut check_hashes_input = use_signal(String::new);
    let mut upload_content_hash = use_signal(String::new);
    let mut upload_content_bytes = use_signal(String::new);
    let mut get_content_hash = use_signal(String::new);

    let mut is_loading = use_signal(|| false);
    let mut response_status = use_signal(|| None::<String>);
    let mut response_json = use_signal(|| None::<String>);
    let mut decoded_events = use_signal(Vec::<DecodedCborInfo>::new);
    let mut error_text = use_signal(|| None::<String>);

    // リクエスト実行ハンドラ
    let schema_for_test = schema.clone();
    let on_run_test = move |_| {
        is_loading.set(true);
        error_text.set(None);
        response_status.set(None);
        response_json.set(None);
        decoded_events.set(Vec::new());

        let base = crate::fetch::api_base_url();
        let path = schema_for_test.rpc_path();
        let url = format!("{}{}", base, path);

        spawn(async move {
            let req_body_res = match method {
                ApiMethod::GetEvents => {
                    let ev_type = match get_events_filter().as_str() {
                        "create_account" => Some("create_account".to_string()),
                        "change_profile" => Some("change_profile".to_string()),
                        "module_commit" => Some("module_commit".to_string()),
                        _ => None,
                    };
                    let limit = get_events_limit().parse::<u64>().ok();
                    let offset = get_events_offset().parse::<u64>().ok();
                    serde_json::to_string(&GetEventsRequest {
                        event_type: ev_type,
                        limit,
                        offset,
                    })
                }
                ApiMethod::GetEvent => {
                    let hash_str = get_event_hash().trim().to_string();
                    serde_json::to_string(&GetEventRequest {
                        event_hash: hash_str,
                    })
                }
                ApiMethod::SubmitEvent => {
                    let raw = submit_event_bytes().trim().to_string();
                    let bytes = decode_raw_input_bytes(&raw);
                    serde_json::to_string(&SubmitEventRequest {
                        signed_event_bytes: bytes,
                    })
                }
                ApiMethod::CheckMissingHashes => {
                    let hashes = check_hashes_input()
                        .lines()
                        .map(str::trim)
                        .filter(|l| !l.is_empty())
                        .map(ToString::to_string)
                        .collect::<Vec<_>>();
                    serde_json::to_string(&CheckMissingHashesRequest {
                        content_hashes: hashes,
                    })
                }
                ApiMethod::UploadContent => {
                    let ch = upload_content_hash().trim().to_string();
                    let raw = upload_content_bytes().trim().to_string();
                    let bytes = decode_raw_input_bytes(&raw);
                    serde_json::to_string(&UploadContentRequest {
                        items: vec![ContentItem {
                            content_hash: ch,
                            content_bytes: bytes,
                        }],
                    })
                }
                ApiMethod::GetContent => {
                    let ch = get_content_hash().trim().to_string();
                    serde_json::to_string(&GetContentRequest { content_hash: ch })
                }
            };

            let req_body = match req_body_res {
                Ok(b) => b,
                Err(e) => {
                    error_text.set(Some(format!("Serialize request failed: {e}")));
                    is_loading.set(false);
                    return;
                }
            };

            match fetch_rpc_json(&url, &req_body).await {
                Ok((status, text)) => {
                    response_status.set(Some(format!("HTTP {status} (Connect-RPC 1)")));
                    response_json.set(Some(text.clone()));

                    // レスポンスに応じて CBOR デコードを試行
                    match method {
                        ApiMethod::GetEvents => {
                            if let Ok(res) = serde_json::from_str::<GetEventsResponse>(&text) {
                                let decoded = res
                                    .events
                                    .iter()
                                    .map(|item| decode_signed_bytes(&item.signed_event_bytes))
                                    .collect::<Vec<_>>();
                                decoded_events.set(decoded);
                            }
                        }
                        ApiMethod::GetEvent => {
                            if let Ok(res) = serde_json::from_str::<GetEventResponse>(&text)
                                && let Some(item) = res.event
                            {
                                decoded_events
                                    .set(vec![decode_signed_bytes(&item.signed_event_bytes)]);
                            }
                        }
                        ApiMethod::SubmitEvent => {
                            if let Ok(res) = serde_json::from_str::<SubmitEventResponse>(&text)
                                && res.status == "missing_content"
                            {
                                error_text.set(Some(format!(
                                    "Negotiation Notice: Server is missing {} content items. Upload required before commit can be saved.",
                                    res.missing_content_hashes.len()
                                )));
                            }
                        }
                        _ => {}
                    }

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
            div { style: "display: grid; gap: 1.5rem; max-width: 1040px; margin: 0 auto; width: 100%;",

                // 上部サブナビゲーション
                ApiSubNav {
                    context: context.clone(),
                    active: ApiNavActive::Method(method),
                }

                // メソッドヘッダー
                div {
                    class: "event-detail-card",
                    style: "background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-md); padding: 1.5rem; display: grid; gap: 0.8rem;",
                    div { style: "display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.6rem;",
                        div { style: "display: flex; align-items: center; gap: 0.6rem;",
                            span { style: "padding: 0.2rem 0.55rem; background: #0284c7; color: #fff; font-size: 0.72rem; font-weight: 700; border-radius: 4px;",
                                "POST"
                            }
                            h1 { style: "font-size: 1.5rem; font-weight: 800; margin: 0; color: var(--text-primary);",
                                "{schema.method.name()}"
                            }
                        }
                        div { style: "font-family: ui-monospace, monospace; font-size: 0.8rem; color: #38bdf8; background: rgba(56, 189, 248, 0.08); padding: 0.3rem 0.7rem; border-radius: 4px; border: 1px solid rgba(56, 189, 248, 0.25);",
                            "{schema.rpc_path()}"
                        }
                    }

                    p { style: "font-size: 0.95rem; color: var(--text-primary); margin: 0; line-height: 1.6; font-weight: 500;",
                        "{schema.description(lang)}"
                    }

                    // 差分ハッシュ交渉での役割
                    div { style: "background: rgba(139, 92, 246, 0.08); border: 1px solid rgba(139, 92, 246, 0.25); border-radius: var(--radius-sm); padding: 0.85rem 1rem; display: grid; gap: 0.3rem;",
                        div { style: "font-size: 0.78rem; font-weight: 700; color: #c084fc; text-transform: uppercase; letter-spacing: 0.05em; display: flex; align-items: center; gap: 0.4rem;",
                            span { "🌿" }
                            span {
                                {
                                    lang.label(
                                        "Role in Git Tree / Blob CAS Negotiation",
                                        "差分ハッシュ・ネゴシエーション (Git Tree/Blob モデル) における役割",
                                        "Rolo en Git-Stila CAS Negocado",
                                    )
                                }
                            }
                        }
                        p { style: "font-size: 0.86rem; color: var(--text-secondary); margin: 0; line-height: 1.55;",
                            "{schema.role(lang)}"
                        }
                    }
                }

                // 2カラムレイアウト: 左側にスキーマ定義・構造表、右側に専用インタラクティブテスター
                div { style: "display: grid; grid-template-columns: repeat(auto-fit, minmax(460px, 1fr)); gap: 1.5rem;",

                    // 左側: スキーマ定義 & 構造表
                    div { style: "display: grid; gap: 1.2rem; align-content: start;",

                        // Protobuf 定義コード
                        div {
                            class: "event-detail-card",
                            style: "background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-md); padding: 1.2rem; display: grid; gap: 0.6rem;",
                            div { style: "font-weight: 700; font-size: 0.92rem; color: var(--text-primary); display: flex; align-items: center; gap: 0.4rem;",
                                span { "📜" }
                                span { "Protobuf Schema (`proto/definy/v1/event.proto`)" }
                            }
                            pre { style: "margin: 0; padding: 0.9rem; background: #080c14; border: 1px solid var(--border); border-radius: var(--radius-sm); font-family: ui-monospace, monospace; font-size: 0.8rem; color: #7dd3fc; overflow-x: auto; line-height: 1.5;",
                                "{schema.proto_definition}"
                            }
                        }

                        // リクエストフィールド表
                        div {
                            class: "event-detail-card",
                            style: "background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-md); padding: 1.2rem; display: grid; gap: 0.6rem;",
                            div { style: "font-weight: 700; font-size: 0.92rem; color: #38bdf8; display: flex; align-items: center; gap: 0.4rem;",
                                span { "📥" }
                                span { "Request: {schema.request_name}" }
                            }
                            RenderFieldsTable { fields: schema.request_fields, language: lang }
                        }

                        // レスポンスフィールド表
                        div {
                            class: "event-detail-card",
                            style: "background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-md); padding: 1.2rem; display: grid; gap: 0.6rem;",
                            div { style: "font-weight: 700; font-size: 0.92rem; color: #34d399; display: flex; align-items: center; gap: 0.4rem;",
                                span { "📤" }
                                span { "Response: {schema.response_name}" }
                            }
                            RenderFieldsTable {
                                fields: schema.response_fields,
                                language: lang,
                            }
                        }
                    }

                    // 右側: 専用インタラクティブテスター
                    div {
                        class: "event-detail-card",
                        style: "background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-md); padding: 1.4rem; display: grid; gap: 1rem; align-content: start;",
                        div { style: "display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border); padding-bottom: 0.6rem;",
                            div { style: "font-weight: 700; font-size: 1rem; color: var(--text-primary); display: flex; align-items: center; gap: 0.4rem;",
                                span { "🧪" }
                                span {
                                    {
                                        lang.label(
                                            "Interactive Live Tester",
                                            "対話的実行テスター",
                                            "Interaga Testilo",
                                        )
                                    }
                                }
                            }
                            span { style: "font-size: 0.72rem; color: #10b981; font-weight: 600;",
                                "Live Server Connected"
                            }
                        }

                        // 各メソッドに応じた入力フォーム
                        {
                            match method {
                                ApiMethod::GetEvents => rsx! {
                                    div { style: "display: grid; gap: 0.8rem;",
                                        div { style: "display: grid; gap: 0.3rem;",
                                            label { style: "font-size: 0.78rem; font-weight: 600; color: var(--text-secondary);",
                                                "event_type filter:"
                                            }
                                            select {
                                                value: "{get_events_filter}",
                                                onchange: move |e| get_events_filter.set(e.value()),
                                                style: "padding: 0.45rem; background: var(--bg); border: 1px solid var(--border); border-radius: var(--radius-sm); color: var(--text-primary);",
                                                option { value: "all", "All Events (No filter)" }
                                                option { value: "create_account", "create_account" }
                                                option { value: "change_profile", "change_profile" }
                                                option { value: "module_commit", "module_commit" }
                                            }
                                        }
                                        div { style: "display: grid; grid-template-columns: 1fr 1fr; gap: 0.6rem;",
                                            div { style: "display: grid; gap: 0.3rem;",
                                                label { style: "font-size: 0.78rem; font-weight: 600; color: var(--text-secondary);",
                                                    "limit:"
                                                }
                                                input {
                                                    value: "{get_events_limit}",
                                                    oninput: move |e| get_events_limit.set(e.value()),
                                                    style: "padding: 0.45rem; background: var(--bg); border: 1px solid var(--border); border-radius: var(--radius-sm); color: var(--text-primary);",
                                                }
                                            }
                                            div { style: "display: grid; gap: 0.3rem;",
                                                label { style: "font-size: 0.78rem; font-weight: 600; color: var(--text-secondary);",
                                                    "offset:"
                                                }
                                                input {
                                                    value: "{get_events_offset}",
                                                    oninput: move |e| get_events_offset.set(e.value()),
                                                    style: "padding: 0.45rem; background: var(--bg); border: 1px solid var(--border); border-radius: var(--radius-sm); color: var(--text-primary);",
                                                }
                                            }
                                        }
                                    }
                                },
                                ApiMethod::GetEvent => rsx! {
                                    div { style: "display: grid; gap: 0.4rem;",
                                        label { style: "font-size: 0.78rem; font-weight: 600; color: var(--text-secondary);",
                                            "event_hash (EventHashId):"
                                        }
                                        input {
                                            placeholder: "e.g. AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
                                            value: "{get_event_hash}",
                                            oninput: move |e| get_event_hash.set(e.value()),
                                            style: "padding: 0.5rem; background: var(--bg); border: 1px solid var(--border); border-radius: var(--radius-sm); color: var(--text-primary); font-family: ui-monospace, monospace; font-size: 0.85rem;",
                                        }
                                    }
                                },
                                ApiMethod::SubmitEvent => rsx! {
                                    div { style: "display: grid; gap: 0.4rem;",
                                        label { style: "font-size: 0.78rem; font-weight: 600; color: var(--text-secondary);",
                                            "signed_event_bytes (Base64 / Hex CBOR):"
                                        }
                                        textarea {
                                            placeholder: "Paste Base64 or Hex encoded signed deterministic CBOR binary...",
                                            value: "{submit_event_bytes}",
                                            oninput: move |e| submit_event_bytes.set(e.value()),
                                            rows: 4,
                                            style: "padding: 0.5rem; background: var(--bg); border: 1px solid var(--border); border-radius: var(--radius-sm); color: var(--text-primary); font-family: ui-monospace, monospace; font-size: 0.8rem; resize: vertical;",
                                        }
                                    }
                                },
                                ApiMethod::CheckMissingHashes => rsx! {
                                    div { style: "display: grid; gap: 0.4rem;",
                                        label { style: "font-size: 0.78rem; font-weight: 600; color: var(--text-secondary);",
                                            "content_hashes (1 per line):"
                                        }
                                        textarea {
                                            placeholder: "ch-0123456789abcdef...\nch-fedcba9876543210...",
                                            value: "{check_hashes_input}",
                                            oninput: move |e| check_hashes_input.set(e.value()),
                                            rows: 4,
                                            style: "padding: 0.5rem; background: var(--bg); border: 1px solid var(--border); border-radius: var(--radius-sm); color: var(--text-primary); font-family: ui-monospace, monospace; font-size: 0.8rem; resize: vertical;",
                                        }
                                    }
                                },
                                ApiMethod::UploadContent => rsx! {
                                    div { style: "display: grid; gap: 0.6rem;",
                                        div { style: "display: grid; gap: 0.3rem;",
                                            label { style: "font-size: 0.78rem; font-weight: 600; color: var(--text-secondary);",
                                                "content_hash:"
                                            }
                                            input {
                                                placeholder: "ch-...",
                                                value: "{upload_content_hash}",
                                                oninput: move |e| upload_content_hash.set(e.value()),
                                                style: "padding: 0.45rem; background: var(--bg); border: 1px solid var(--border); border-radius: var(--radius-sm); color: var(--text-primary); font-family: ui-monospace, monospace; font-size: 0.85rem;",
                                            }
                                        }
                                        div { style: "display: grid; gap: 0.3rem;",
                                            label { style: "font-size: 0.78rem; font-weight: 600; color: var(--text-secondary);",
                                                "content_bytes (Base64 / Hex expression CBOR):"
                                            }
                                            textarea {
                                                placeholder: "Expression CBOR binary...",
                                                value: "{upload_content_bytes}",
                                                oninput: move |e| upload_content_bytes.set(e.value()),
                                                rows: 3,
                                                style: "padding: 0.45rem; background: var(--bg); border: 1px solid var(--border); border-radius: var(--radius-sm); color: var(--text-primary); font-family: ui-monospace, monospace; font-size: 0.8rem; resize: vertical;",
                                            }
                                        }
                                    }
                                },
                                ApiMethod::GetContent => rsx! {
                                    div { style: "display: grid; gap: 0.4rem;",
                                        label { style: "font-size: 0.78rem; font-weight: 600; color: var(--text-secondary);",
                                            "content_hash (ContentHash):"
                                        }
                                        input {
                                            placeholder: "ch-...",
                                            value: "{get_content_hash}",
                                            oninput: move |e| get_content_hash.set(e.value()),
                                            style: "padding: 0.5rem; background: var(--bg); border: 1px solid var(--border); border-radius: var(--radius-sm); color: var(--text-primary); font-family: ui-monospace, monospace; font-size: 0.85rem;",
                                        }
                                    }
                                },
                            }
                        }

                        // 実行ボタン
                        button {
                            onclick: on_run_test,
                            disabled: is_loading(),
                            style: "padding: 0.65rem 1.2rem; background: #0284c7; color: #fff; font-weight: 600; border: none; border-radius: var(--radius-sm); cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 0.5rem; transition: opacity 0.15s ease;",
                            if is_loading() {
                                span {
                                    "⏳ {lang.label(\"Executing RPC...\", \"RPC実行中...\", \"Rulante...\")}"
                                }
                            } else {
                                span {
                                    "▶ {lang.label(\"Send Connect-RPC Request\", \"Connect-RPC リクエストを送信\", \"Sendi Peton\")}"
                                }
                            }
                        }

                        // エラー表示
                        if let Some(err) = error_text() {
                            div { style: "padding: 0.75rem 1rem; background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: var(--radius-sm); color: #fca5a5; font-size: 0.84rem;",
                                "⚠️ {err}"
                            }
                        }

                        // レスポンスステータス & 生 JSON
                        if let Some(st) = response_status() {
                            div { style: "display: grid; gap: 0.5rem;",
                                div { style: "font-size: 0.78rem; font-weight: 700; color: #34d399;",
                                    "✓ {st}"
                                }
                                if let Some(json_str) = response_json() {
                                    pre { style: "margin: 0; padding: 0.8rem; background: #080c14; border: 1px solid var(--border); border-radius: var(--radius-sm); font-family: ui-monospace, monospace; font-size: 0.78rem; color: #a5f3fc; overflow-x: auto; max-height: 220px; line-height: 1.45;",
                                        "{json_str}"
                                    }
                                }
                            }
                        }

                        // デコードされた CBOR / 署名検証結果カード
                        if !decoded_events().is_empty() {
                            div { style: "display: grid; gap: 0.8rem; margin-top: 0.5rem;",
                                div { style: "font-size: 0.86rem; font-weight: 700; color: var(--text-primary);",
                                    {
                                        lang.label(
                                            "Decoded Deterministic CBOR & Signature Validation:",
                                            "デコードされた決定論的 CBOR と Ed25519 署名検証結果:",
                                            "Malkodita CBOR kaj Subskriba Kontrolo:",
                                        )
                                    }
                                }
                                for (idx, info) in decoded_events().iter().enumerate() {
                                    RenderDecodedCborCard {
                                        key: "{idx}",
                                        index: idx,
                                        info: info.clone(),
                                        context: context.clone(),
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

#[component]
fn RenderFieldsTable(
    fields: &'static [crate::api_pages::method_schema::FieldDoc],
    language: Language,
) -> Element {
    rsx! {
        div { style: "overflow-x: auto; border: 1px solid var(--border); border-radius: var(--radius-sm);",
            table { style: "width: 100%; border-collapse: collapse; font-size: 0.82rem; text-align: left;",
                thead {
                    tr { style: "background: rgba(0, 0, 0, 0.25); border-bottom: 1px solid var(--border);",
                        th { style: "padding: 0.5rem 0.7rem; color: var(--text-secondary); width: 40px;",
                            "#"
                        }
                        th { style: "padding: 0.5rem 0.7rem; color: var(--text-secondary);",
                            "Field"
                        }
                        th { style: "padding: 0.5rem 0.7rem; color: var(--text-secondary);",
                            "Type"
                        }
                        th { style: "padding: 0.5rem 0.7rem; color: var(--text-secondary);",
                            "Description"
                        }
                    }
                }
                tbody {
                    for field in fields {
                        tr { style: "border-bottom: 1px solid rgba(255, 255, 255, 0.05);",
                            td { style: "padding: 0.55rem 0.7rem; color: var(--text-secondary); font-family: ui-monospace, monospace;",
                                "{field.number}"
                            }
                            td { style: "padding: 0.55rem 0.7rem; font-weight: 600; color: #93c5fd; font-family: ui-monospace, monospace;",
                                "{field.name}"
                            }
                            td { style: "padding: 0.55rem 0.7rem; color: #fcd34d; font-family: ui-monospace, monospace; font-size: 0.78rem;",
                                "{field.field_type}"
                            }
                            td { style: "padding: 0.55rem 0.7rem; color: var(--text-secondary); line-height: 1.4;",
                                "{field.description(language)}"
                            }
                        }
                    }
                }
            }
        }
    }
}

pub(crate) async fn fetch_rpc_json(url: &str, body: &str) -> Result<(u16, String), String> {
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

fn decode_raw_input_bytes(raw: &str) -> Vec<u8> {
    let trimmed = raw.trim();
    if let Ok(b) =
        base64::Engine::decode(&base64::engine::general_purpose::URL_SAFE_NO_PAD, trimmed)
    {
        b
    } else if let Ok(b) =
        base64::Engine::decode(&base64::engine::general_purpose::STANDARD, trimmed)
    {
        b
    } else if let Ok(b) = hex::decode(trimmed) {
        b
    } else {
        trimmed.as_bytes().to_vec()
    }
}
