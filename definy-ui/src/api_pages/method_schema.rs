use crate::app_state::ApiMethod;
use crate::language::Language;

#[derive(Clone, PartialEq, Eq, Debug)]
pub struct FieldDoc {
    pub number: u32,
    pub name: &'static str,
    pub field_type: &'static str,
    pub is_optional: bool,
    pub description_en: &'static str,
    pub description_ja: &'static str,
    pub description_eo: &'static str,
}

impl FieldDoc {
    pub fn description(&self, language: Language) -> &'static str {
        language.label(
            self.description_en,
            self.description_ja,
            self.description_eo,
        )
    }
}

#[derive(Clone, Debug)]
pub struct MethodSchemaInfo {
    pub method: ApiMethod,
    pub title_en: &'static str,
    pub title_ja: &'static str,
    pub title_eo: &'static str,
    pub description_en: &'static str,
    pub description_ja: &'static str,
    pub description_eo: &'static str,
    pub role_en: &'static str,
    pub role_ja: &'static str,
    pub role_eo: &'static str,
    pub proto_definition: &'static str,
    pub request_name: &'static str,
    pub request_fields: &'static [FieldDoc],
    pub response_name: &'static str,
    pub response_fields: &'static [FieldDoc],
}

impl MethodSchemaInfo {
    pub fn title(&self, language: Language) -> &'static str {
        language.label(self.title_en, self.title_ja, self.title_eo)
    }

    pub fn description(&self, language: Language) -> &'static str {
        language.label(
            self.description_en,
            self.description_ja,
            self.description_eo,
        )
    }

    pub fn role(&self, language: Language) -> &'static str {
        language.label(self.role_en, self.role_ja, self.role_eo)
    }

    pub fn rpc_path(&self) -> &'static str {
        match self.method {
            ApiMethod::GetEvents => definy_event::rpc::PATH_GET_EVENTS,
            ApiMethod::GetEvent => definy_event::rpc::PATH_GET_EVENT,
            ApiMethod::SubmitEvent => definy_event::rpc::PATH_SUBMIT_EVENT,
            ApiMethod::CheckMissingHashes => definy_event::rpc::PATH_CHECK_MISSING_HASHES,
            ApiMethod::UploadContent => definy_event::rpc::PATH_UPLOAD_CONTENT,
            ApiMethod::GetContent => definy_event::rpc::PATH_GET_CONTENT,
        }
    }
}

pub fn get_method_schema(method: ApiMethod) -> MethodSchemaInfo {
    match method {
        ApiMethod::GetEvents => MethodSchemaInfo {
            method: ApiMethod::GetEvents,
            title_en: "GetEvents - Batch Event Retrieval",
            title_ja: "GetEvents - イベント一括取得",
            title_eo: "GetEvents - Amasa Evento-Akiro",
            description_en: "Retrieves a sequence of signed, immutable events from the log with optional event type filtering and pagination.",
            description_ja: "イベント種別による絞り込みやページネーション（件数・オフセット）を指定して、署名済み不変イベントログを一括取得します。",
            description_eo: "Akeras serion da subskribitaj eventoj kun filtrado kaj paĝigo.",
            role_en: "Used during client bootstrap or feed inspection to download historical deterministic CBOR events and project local module/account states.",
            role_ja: "クライアントの初回起動時やモジュール・アカウント一覧表示時に、過去の全イベントバイナリを取得してブラウザ内 IndexedDB にキャッシュ・射影構築します。",
            role_eo: "Uzata dum lanĉo de kliento por elŝuti historiajn eventojn.",
            proto_definition: "rpc GetEvents (GetEventsRequest) returns (GetEventsResponse);\n\nmessage GetEventsRequest {\n  optional string event_type = 1;\n  optional uint64 limit = 2;\n  optional uint64 offset = 3;\n}\n\nmessage GetEventsResponse {\n  repeated EventItem events = 1;\n}",
            request_name: "GetEventsRequest",
            request_fields: &[
                FieldDoc {
                    number: 1,
                    name: "event_type",
                    field_type: "optional string",
                    is_optional: true,
                    description_en: "Filter by event type (e.g. \"create_account\", \"module_commit\")",
                    description_ja: "取得するイベント種別の絞り込み (\"create_account\", \"module_commit\" 等)",
                    description_eo: "Filtri laŭ eventotipo",
                },
                FieldDoc {
                    number: 2,
                    name: "limit",
                    field_type: "optional uint64",
                    is_optional: true,
                    description_en: "Maximum number of events to return",
                    description_ja: "取得件数の上限値",
                    description_eo: "Maksimuma nombro da eventoj",
                },
                FieldDoc {
                    number: 3,
                    name: "offset",
                    field_type: "optional uint64",
                    is_optional: true,
                    description_en: "Zero-based offset into the event log",
                    description_ja: "取得開始位置のオフセット (0開始)",
                    description_eo: "Komenca deŝovo de eventoj",
                },
            ],
            response_name: "GetEventsResponse",
            response_fields: &[FieldDoc {
                number: 1,
                name: "events",
                field_type: "repeated EventItem",
                is_optional: false,
                description_en: "List of events. Each item contains event_hash, signed_event_bytes (RFC 8949 CBOR), account_id, event_type, created_at.",
                description_ja: "イベントの配列。各要素に event_hash, signed_event_bytes (RFC 8949 CBOR), account_id, event_type, created_at を内包します。",
                description_eo: "Listo de eventoj kun subskribitaj bajtoj.",
            }],
        },
        ApiMethod::GetEvent => MethodSchemaInfo {
            method: ApiMethod::GetEvent,
            title_en: "GetEvent - Single Event Inspection",
            title_ja: "GetEvent - 単一イベント取得",
            title_eo: "GetEvent - Unuopa Evento-Akiro",
            description_en: "Retrieves a single signed event by its URL-safe base64 event hash ID.",
            description_ja: "URL-safe Base64 形式のイベントハッシュ（EventHashId）を指定して、対応する単一の署名済みイベントバイナリを取得します。",
            description_eo: "Akeras unuopan subskribitan eventon per ĝia event-haŝo.",
            role_en: "Used when navigating directly to an event detail URL (/events/{hash}) or resolving a specific dependency in the commit DAG.",
            role_ja: "イベント詳細画面（/events/{hash}）の直接参照や、コミットDAG上の特定イベントの依存解決時に使用されます。クライアント側で即座にEd25519署名検証されます。",
            role_eo: "Uzata por vidi specifan eventon kaj kontroli ĝian subskribon.",
            proto_definition: "rpc GetEvent (GetEventRequest) returns (GetEventResponse);\n\nmessage GetEventRequest {\n  string event_hash = 1;\n}\n\nmessage GetEventResponse {\n  optional EventItem event = 1;\n}",
            request_name: "GetEventRequest",
            request_fields: &[FieldDoc {
                number: 1,
                name: "event_hash",
                field_type: "string",
                is_optional: false,
                description_en: "The target EventHashId (URL-safe base64 SHA-256)",
                description_ja: "取得対象のイベントハッシュ識別子 (URL-safe Base64 SHA-256)",
                description_eo: "Celita EventHashId (URL-safe base64)",
            }],
            response_name: "GetEventResponse",
            response_fields: &[FieldDoc {
                number: 1,
                name: "event",
                field_type: "optional EventItem",
                is_optional: true,
                description_en: "The found event, or null if the event hash does not exist on the server.",
                description_ja: "見つかったイベント。サーバー上に存在しない場合は null となります。",
                description_eo: "La trovita evento aŭ null.",
            }],
        },
        ApiMethod::SubmitEvent => MethodSchemaInfo {
            method: ApiMethod::SubmitEvent,
            title_en: "SubmitEvent - Commit Event & Tree Submission",
            title_ja: "SubmitEvent - コミット・イベント送信と差分判定",
            title_eo: "SubmitEvent - Sendo de Evento kaj Arbo",
            description_en: "Submits a signed deterministic CBOR event to the server. Supports optimistic diff hash negotiation for module commits.",
            description_ja: "クライアントで署名された決定論的 CBOR イベントをサーバーへ送信・検証・保存します。モジュールコミット時は式の差分ハッシュ・ネゴシエーションに対応します。",
            description_eo: "Sendas subskribitan eventon al servilo kun diferenca haŝ-negocado.",
            role_en: "Git Tree submission. In optimistic submit, only the commit metadata and expression hashes are sent. If any referenced AST blobs are missing, server responds with status: \"missing_content\".",
            role_ja: "Git の Tree 送信に相当。変更のない式バイナリは送信せず、メタデータとハッシュのみを楽観送信。未登録の式がある場合は status: \"missing_content\" と不足リストが返却され、UploadContent 後に再送・確定します。",
            role_eo: "Arba sendo de Git. Se mankas esprimaj bloboj, servilo petas alŝuton.",
            proto_definition: "rpc SubmitEvent (SubmitEventRequest) returns (SubmitEventResponse);\n\nmessage SubmitEventRequest {\n  bytes signed_event_bytes = 1;\n}\n\nmessage SubmitEventResponse {\n  string event_hash = 1;\n  string status = 2; // \"success\" | \"already_exists\" | \"missing_content\"\n  repeated string missing_content_hashes = 3;\n}",
            request_name: "SubmitEventRequest",
            request_fields: &[FieldDoc {
                number: 1,
                name: "signed_event_bytes",
                field_type: "bytes",
                is_optional: false,
                description_en: "Canonical deterministic CBOR bytes signed with author's Ed25519 private key.",
                description_ja: "作成者の Ed25519 秘密鍵で署名された決定論的 CBOR バイナリ。",
                description_eo: "Determina CBOR subskribita per Ed25519.",
            }],
            response_name: "SubmitEventResponse",
            response_fields: &[
                FieldDoc {
                    number: 1,
                    name: "event_hash",
                    field_type: "string",
                    is_optional: false,
                    description_en: "The calculated SHA-256 EventHashId.",
                    description_ja: "算出された SHA-256 イベントハッシュ識別子。",
                    description_eo: "Kalkulita EventHashId.",
                },
                FieldDoc {
                    number: 2,
                    name: "status",
                    field_type: "string",
                    is_optional: false,
                    description_en: "\"success\" (saved), \"already_exists\" (deduplicated), or \"missing_content\" (negotiation required).",
                    description_ja: "\"success\" (保存成功), \"already_exists\" (重複排除), または \"missing_content\" (未登録式あり・要アップロード)。",
                    description_eo: "\"success\", \"already_exists\", aŭ \"missing_content\".",
                },
                FieldDoc {
                    number: 3,
                    name: "missing_content_hashes",
                    field_type: "repeated string",
                    is_optional: false,
                    description_en: "Array of ContentHash strings (\"ch-...\") that the server CAS currently lacks.",
                    description_ja: "サーバー CAS に未登録の ContentHash (\"ch-...\") 一覧。",
                    description_eo: "Listo de mankantaj enhav-haŝoj.",
                },
            ],
        },
        ApiMethod::CheckMissingHashes => MethodSchemaInfo {
            method: ApiMethod::CheckMissingHashes,
            title_en: "CheckMissingHashes - Pre-Flight CAS Query",
            title_ja: "CheckMissingHashes - 未登録コンテンツの事前照会",
            title_eo: "CheckMissingHashes - Antaŭkontrolo de Enhavo",
            description_en: "Checks which content hashes (SHA-256 expression ASTs) are currently missing in the server's Content-Addressed Storage (CAS).",
            description_ja: "指定した ContentHash 群のうち、サーバーのコンテンツアドレスストレージ (contents テーブル) に未登録のハッシュを一括照会します。",
            description_eo: "Kontrolas kiujn enhav-haŝojn la servilo mankas.",
            role_en: "Used in pre-flight checks before submitting large module commits, allowing the client to identify and upload missing AST expressions proactively.",
            role_ja: "コミット送信前の事前検査などで、手元にある式のうちサーバーに未アップロードのものをあらかじめ特定・一括転送するために活用されます。",
            role_eo: "Uzata por antaŭscii mankantajn esprimojn antaŭ fina komito.",
            proto_definition: "rpc CheckMissingHashes (CheckMissingHashesRequest) returns (CheckMissingHashesResponse);\n\nmessage CheckMissingHashesRequest {\n  repeated string content_hashes = 1;\n}\n\nmessage CheckMissingHashesResponse {\n  repeated string missing_content_hashes = 1;\n}",
            request_name: "CheckMissingHashesRequest",
            request_fields: &[FieldDoc {
                number: 1,
                name: "content_hashes",
                field_type: "repeated string",
                is_optional: false,
                description_en: "List of ContentHash strings to verify on the server.",
                description_ja: "サーバーの存在を確認したい ContentHash (\"ch-...\") の配列。",
                description_eo: "Listo de kontrolendaj enhav-haŝoj.",
            }],
            response_name: "CheckMissingHashesResponse",
            response_fields: &[FieldDoc {
                number: 1,
                name: "missing_content_hashes",
                field_type: "repeated string",
                is_optional: false,
                description_en: "Subset of content_hashes that do not yet exist in the server CAS.",
                description_ja: "サーバー CAS にまだ存在しない ContentHash の部分配列（空配列ならすべて登録済み）。",
                description_eo: "Subaro de mankantaj enhav-haŝoj.",
            }],
        },
        ApiMethod::UploadContent => MethodSchemaInfo {
            method: ApiMethod::UploadContent,
            title_en: "UploadContent - Blob Upload & Hash Verification",
            title_ja: "UploadContent - 式バイナリ (Blob) の一括アップロードと検証",
            title_eo: "UploadContent - Alŝuto de Enhavo & Kontrolo",
            description_en: "Uploads raw CBOR expression blobs to Content-Addressed Storage. The server independently verifies SHA256(content_bytes) == content_hash before persisting.",
            description_ja: "式の決定論的 CBOR バイナリ（Blob）を一括アップロードします。サーバーは SHA-256(content_bytes) を計算し、指定ハッシュと完全一致することを検証した上で CAS に保存します。",
            description_eo: "Alŝutas esprimajn CBOR blobojn kun SHA-256 kontrolo fare de la servilo.",
            role_en: "Git Blob transfer. Only missing expressions isolated during negotiation are uploaded. Re-used expressions across versions or other modules are transferred 0 bytes.",
            role_ja: "Git の Blob 転送に相当。ネゴシエーションで不足と判定された式のみをピンポイントでアップロードするため、バージョン間で共通する式や既存のパーツは一切再送されません。",
            role_eo: "Blob-transdono de Git. Nur mankantaj esprimoj estas alŝutataj.",
            proto_definition: "rpc UploadContent (UploadContentRequest) returns (UploadContentResponse);\n\nmessage ContentItem {\n  string content_hash = 1;\n  bytes content_bytes = 2;\n}\n\nmessage UploadContentRequest {\n  repeated ContentItem items = 1;\n}\n\nmessage UploadContentResponse {\n  uint64 uploaded_count = 1;\n}",
            request_name: "UploadContentRequest",
            request_fields: &[FieldDoc {
                number: 1,
                name: "items",
                field_type: "repeated ContentItem",
                is_optional: false,
                description_en: "Array of items with content_hash and raw CBOR content_bytes.",
                description_ja: "content_hash と式の CBOR バイナリ (content_bytes) を持つ要素の配列。",
                description_eo: "Listo de enhav-eroj kun haŝo kaj bajtoj.",
            }],
            response_name: "UploadContentResponse",
            response_fields: &[FieldDoc {
                number: 1,
                name: "uploaded_count",
                field_type: "uint64",
                is_optional: false,
                description_en: "Number of content items verified and saved to the CAS contents table.",
                description_ja: "SHA-256 検証を通過して contents テーブルに保存されたコンテンツの件数。",
                description_eo: "Nombro de sukcese alŝutitaj kaj kontrolitaj eroj.",
            }],
        },
        ApiMethod::GetContent => MethodSchemaInfo {
            method: ApiMethod::GetContent,
            title_en: "GetContent - Content-Addressed Expression Retrieval",
            title_ja: "GetContent - コンテンツアドレスからの式取得",
            title_eo: "GetContent - Akiro de Enhavo per Haŝo",
            description_en: "Retrieves the deterministic CBOR binary of an expression from CAS using its ContentHash (\"ch-...\").",
            description_ja: "ContentHash (\"ch-...\") を指定して、対応する式の決定論的 CBOR バイナリを CAS (contents テーブル) から取得します。",
            description_eo: "Akeras la CBOR bajtojn de esprimo el CAS per ĝia ContentHash.",
            role_en: "Allows clients to fetch expression trees on-demand when inspecting parts or executing compiled WebAssembly, with full immutability and caching guarantees.",
            role_ja: "パーツの詳細表示や WebAssembly 実行時に、コミットから参照された式の構文木をオンデマンドで取得・評価するために使用されます。不変ハッシュのためブラウザ内でも永久キャッシュ可能です。",
            role_eo: "Ebligas laŭpetan elŝuton de esprimoj por plenumo kaj montrado.",
            proto_definition: "rpc GetContent (GetContentRequest) returns (GetContentResponse);\n\nmessage GetContentRequest {\n  string content_hash = 1;\n}\n\nmessage GetContentResponse {\n  optional bytes content_bytes = 1;\n}",
            request_name: "GetContentRequest",
            request_fields: &[FieldDoc {
                number: 1,
                name: "content_hash",
                field_type: "string",
                is_optional: false,
                description_en: "The target ContentHash (format: \"ch-...\").",
                description_ja: "取得対象の ContentHash (例: \"ch-...\")。",
                description_eo: "Celita ContentHash.",
            }],
            response_name: "GetContentResponse",
            response_fields: &[FieldDoc {
                number: 1,
                name: "content_bytes",
                field_type: "optional bytes",
                is_optional: true,
                description_en: "Raw deterministic CBOR bytes of the expression, or null if not found.",
                description_ja: "式の決定論的 CBOR バイナリ。存在しない場合は null となります。",
                description_eo: "CBOR bajtoj de la esprimo aŭ null.",
            }],
        },
    }
}
