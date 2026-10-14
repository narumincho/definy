//! definy プラットフォーム機能モジュール (`definy`) の組み込みパーツ定義。
//! Web アプリケーションのプレビュー実行 (`definy:preview`) などを提供します。

use crate::ast_builder::{fn_expr, fn_type};
use crate::builtin_std_functions::byte_stream_part_type;
use definy_event::EventHashId;
use definy_event::event::{
    Description, ModulePartEntry, PartType, RecordFieldType, VariableExpression,
};

/// HTTP ヘッダーリスト型: `List<{ name: String, value: String }>`
pub fn headers_list_type() -> PartType {
    PartType::List(Box::new(PartType::Record(vec![
        RecordFieldType {
            key: "name".into(),
            value: Box::new(PartType::String),
        },
        RecordFieldType {
            key: "value".into(),
            value: Box::new(PartType::String),
        },
    ])))
}

/// HTTP リクエストレコード型: `{ method: String, url: String, headers: List<Header>, body: ByteStream }`
pub fn http_request_part_type() -> PartType {
    PartType::Record(vec![
        RecordFieldType {
            key: "method".into(),
            value: Box::new(PartType::String),
        },
        RecordFieldType {
            key: "url".into(),
            value: Box::new(PartType::String),
        },
        RecordFieldType {
            key: "headers".into(),
            value: Box::new(headers_list_type()),
        },
        RecordFieldType {
            key: "body".into(),
            value: Box::new(byte_stream_part_type()),
        },
    ])
}

/// HTTP レスポンスレコード型: `{ status: Number, headers: List<Header>, body: ByteStream }`
pub fn http_response_part_type() -> PartType {
    PartType::Record(vec![
        RecordFieldType {
            key: "status".into(),
            value: Box::new(PartType::Number),
        },
        RecordFieldType {
            key: "headers".into(),
            value: Box::new(headers_list_type()),
        },
        RecordFieldType {
            key: "body".into(),
            value: Box::new(byte_stream_part_type()),
        },
    ])
}

/// プレビュー設定レコード型: `{ code: String, handler: HttpRequest -> HttpResponse }`
pub fn preview_config_record_type() -> PartType {
    PartType::Record(vec![
        RecordFieldType {
            key: "code".into(),
            value: Box::new(PartType::String),
        },
        RecordFieldType {
            key: "handler".into(),
            value: Box::new(fn_type(
                &[("req", http_request_part_type())],
                http_response_part_type(),
            )),
        },
    ])
}

/// Cloudflare Workers デプロイ設定レコード型: `{ cloudflareToken: String, cloudflareWorkerName: String, handler: HttpRequest -> HttpResponse }`
pub fn deploy_config_record_type() -> PartType {
    PartType::Record(vec![
        RecordFieldType {
            key: "cloudflareToken".into(),
            value: Box::new(PartType::String),
        },
        RecordFieldType {
            key: "cloudflareWorkerName".into(),
            value: Box::new(PartType::String),
        },
        RecordFieldType {
            key: "handler".into(),
            value: Box::new(fn_type(
                &[("req", http_request_part_type())],
                http_response_part_type(),
            )),
        },
    ])
}

/// `definy` モジュールのパーツ一覧を生成します。
/// - `preview`: `preview: { code: String, handler: HttpRequest -> HttpResponse } -> { code: String, handler: HttpRequest -> HttpResponse }`
/// - `deploy`: `deploy: { cloudflareToken: String, cloudflareWorkerName: String, handler: HttpRequest -> HttpResponse } -> { ... }`
#[must_use]
pub fn create_definy_module_parts(
    _definy_module_id: &EventHashId,
    _std_module_id: &EventHashId,
) -> Vec<ModulePartEntry> {
    let preview_type = fn_type(
        &[("config", preview_config_record_type())],
        preview_config_record_type(),
    );

    // 単純に入力レコード (id: 1) をそのまま返す純粋関数: `fn(config) => config`
    let preview_body =
        definy_event::event::Expression::Variable(VariableExpression { variable_id: 1 });
    let preview_expr = fn_expr(&[("config", 1)], preview_body);

    let deploy_type = fn_type(
        &[("config", deploy_config_record_type())],
        deploy_config_record_type(),
    );
    let deploy_body =
        definy_event::event::Expression::Variable(VariableExpression { variable_id: 1 });
    let deploy_expr = fn_expr(&[("config", 1)], deploy_body);

    vec![
        ModulePartEntry {
            name: "preview".into(),
            part_type: Some(preview_type),
            description: Description::localized(vec![
                (
                    "en",
                    "Define an in-server web application preview with a subdomain code and HTTP handler: preview({ code: String, handler: HttpRequest -> HttpResponse })",
                ),
                (
                    "ja",
                    "サブドメイン識別子 code と HTTP ハンドラ関数を指定してインサーバー Web アプリのプレビューを定義する: preview({ code: String, handler: HttpRequest -> HttpResponse })",
                ),
            ]),
            content_hash: None,
            expression: Some(preview_expr),
        },
        ModulePartEntry {
            name: "deploy".into(),
            part_type: Some(deploy_type),
            description: Description::localized(vec![
                (
                    "en",
                    "Deploy an edge web application to Cloudflare Workers with API token, worker name, and HTTP handler: deploy({ cloudflareToken: String, cloudflareWorkerName: String, handler: HttpRequest -> HttpResponse })",
                ),
                (
                    "ja",
                    "Cloudflare API トークン, Worker 名, HTTP ハンドラ関数を受け取り、サーバー経由で Cloudflare Workers へエッジデプロイを実行する: deploy({ cloudflareToken: String, cloudflareWorkerName: String, handler: HttpRequest -> HttpResponse })",
                ),
            ]),
            content_hash: None,
            expression: Some(deploy_expr),
        },
    ]
}

/// 組み込み `definy:preview` パーツの決定論的 EventHashId を返します。
#[must_use]
pub fn definy_preview_part_id() -> EventHashId {
    let signing_key =
        ed25519_dalek::SigningKey::from_bytes(&crate::builtin_migration::COMPILER_SYSTEM_KEY_SEED);
    let account_id = definy_event::event::AccountId(signing_key.verifying_key());
    let module_id = definy_event::event::derive_module_id(&account_id, "definy");
    definy_event::event::derive_module_part_id(&module_id, "preview")
}

/// 組み込み `definy:deploy` パーツの決定論的 EventHashId を返します。
#[must_use]
pub fn definy_deploy_part_id() -> EventHashId {
    let signing_key =
        ed25519_dalek::SigningKey::from_bytes(&crate::builtin_migration::COMPILER_SYSTEM_KEY_SEED);
    let account_id = definy_event::event::AccountId(signing_key.verifying_key());
    let module_id = definy_event::event::derive_module_id(&account_id, "definy");
    definy_event::event::derive_module_part_id(&module_id, "deploy")
}
