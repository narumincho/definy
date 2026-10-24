export type PillarItem = {
  readonly icon: string;
  readonly color: string;
  readonly tag: string;
  readonly title: {
    readonly en: string;
    readonly ja: string;
    readonly eo: string;
  };
  readonly desc: {
    readonly en: string;
    readonly ja: string;
    readonly eo: string;
  };
};

export type ComparisonItem = {
  readonly dimension: {
    readonly en: string;
    readonly ja: string;
    readonly eo: string;
  };
  readonly traditional: {
    readonly en: string;
    readonly ja: string;
    readonly eo: string;
  };
  readonly definy: {
    readonly en: string;
    readonly ja: string;
    readonly eo: string;
  };
};

export type BuiltinModuleItem = {
  readonly id: string;
  readonly name: string;
  readonly icon: string;
  readonly title: {
    readonly en: string;
    readonly ja: string;
    readonly eo: string;
  };
  readonly desc: {
    readonly en: string;
    readonly ja: string;
    readonly eo: string;
  };
};

export type RpcMethodItem = {
  readonly name: string;
  readonly service: string;
  readonly request: string;
  readonly desc: {
    readonly en: string;
    readonly ja: string;
    readonly eo: string;
  };
};

export const PILLARS: ReadonlyArray<PillarItem> = [
  {
    icon: "🧩",
    color: "var(--blue)",
    tag: "Projectional Editor",
    title: {
      en: "1. Structured Editing (No Syntax Errors)",
      ja: "1. 構文エラーのない構造化編集",
      eo: "1. Strukturita Redaktado",
    },
    desc: {
      en: "Code is edited directly as an Abstract Syntax Tree (AST), not characters in text. Parenthesis mismatches, typoed keywords, and syntax errors are mathematically impossible.",
      ja: "コードを文字列テキストではなく「抽象構文木（AST）」そのものとして直接編集します。括弧の閉じ忘れやキーワードのタイポといったシンタックスエラーは原理的に発生しません。整然とした Tree Layout で可視化されます。",
      eo: "Kodo estas redaktata rekte kiel sintaksarbo. Sintaksaj eraroj estas matematike neeblaj.",
    },
  },
  {
    icon: "🔗",
    color: "var(--green)",
    tag: "SHA-256 CAS",
    title: {
      en: "2. Content-Addressed Immutability",
      ja: "2. コンテンツアドレスによる完全な依存固定",
      eo: "2. Enhav-Adresita Senŝanĝeco",
    },
    desc: {
      en: "All functions, types, and values are identified by their cryptographic SHA-256 content hashes. Code once written can never be mutated, broken by dependencies, or lost in downstream breaking changes.",
      ja: "すべての関数、型、定数は SHA-256 のコンテンツハッシュで一意に識別されます。依存パッケージのバージョン破壊や意図しない仕様変更に悩まされることはありません。",
      eo: "Ĉiuj funkcioj kaj tipoj estas identigitaj per SHA-256 enhav-haketoj. Dependecaj rompiĝoj estas neeblaj.",
    },
  },
  {
    icon: "🛡️",
    color: "var(--purple)",
    tag: "RFC 8949 + Ed25519",
    title: {
      en: "3. Zero-Trust Cryptographic Events",
      ja: "3. ゼロトラストな暗号署名とイベントソーシング",
      eo: "3. Nulfidaj Kriptografiaj Eventoj",
    },
    desc: {
      en: "Every commit and account creation is signed with Ed25519 and encoded into RFC 8949 Deterministic CBOR. The client independently verifies proofs in WebAssembly without trusting the server.",
      ja: "モジュールコミットやアカウント作成はすべて RFC 8949 Deterministic CBOR に変換され、Ed25519 鍵で署名された不変のイベントとして記録されます。ブラウザ内の WebAssembly が独自に署名を検証するため、中央サーバーを信用する必要がありません。",
      eo: "Ĉiu evento estas subskribita per Ed25519 kaj kodita per Determina CBOR.",
    },
  },
  {
    icon: "⚡",
    color: "var(--yellow)",
    tag: "WASM Compiler",
    title: {
      en: "4. Self-Hosting & Native WebAssembly",
      ja: "4. 高速実行と自己ホスティング性",
      eo: "4. Mem-Gastigado & Reta Asembleo",
    },
    desc: {
      en: "definy's compiler, typechecker, and WebAssembly emitter run directly in the browser and Cloudflare Workers. definy is capable of evaluating and compiling its own language constructs natively.",
      ja: "definy の型検査器、AST 評価器、WebAssembly コード生成器はブラウザ（WebAssembly）上でネイティブに動作します。definy 自身の構文を definy 自身で解釈・実行できる自己ホスティング性を備えています。",
      eo: "La kompililo kaj tipo-kontrolilo de definy funkcias rekte en la retumilo.",
    },
  },
];

export const COMPARISONS: ReadonlyArray<ComparisonItem> = [
  {
    dimension: {
      en: "Code Representation",
      ja: "コードの保持形式",
      eo: "Koda Reprezento",
    },
    traditional: {
      en: "Flat text files (.ts, .rs, .py)",
      ja: "テキストファイル（文字列）",
      eo: "Plataj tekstaj dosieroj",
    },
    definy: {
      en: "Cryptographic AST Nodes (ContentHash)",
      ja: "暗号化された構文木（ContentHash）",
      eo: "Kriptografiaj AST-nodoj",
    },
  },
  {
    dimension: {
      en: "Syntax Errors",
      ja: "構文エラー",
      eo: "Sintaksaj Eraroj",
    },
    traditional: {
      en: "Frequent parse/syntax errors during typing",
      ja: "入力中のスペルミスやパースエラーが頻発",
      eo: "Oftaj sintaksaj eraroj dum tajpado",
    },
    definy: {
      en: "Impossible by design (Structure Editor)",
      ja: "構造化編集により原理的に発生不可能",
      eo: "Strukture neebla per redaktilo",
    },
  },
  {
    dimension: {
      en: "Dependency Locking",
      ja: "依存関係の固定",
      eo: "Dependeca Ŝlosado",
    },
    traditional: {
      en: "SemVer string ranges (vulnerabilities & breakage)",
      ja: "SemVer 文字列（意図しない破壊や脆弱性混入）",
      eo: "SemVer vicoj (rompiĝoj kaj vundeblecoj)",
    },
    definy: {
      en: "Exact ContentHash linkage (Never breaks)",
      ja: "厳密な ContentHash リンク（未来永劫不変）",
      eo: "Strikta ContentHash ligo (neniam rompiĝas)",
    },
  },
  {
    dimension: {
      en: "Transport Protocol",
      ja: "通信プロトコル",
      eo: "Komunika Protokolo",
    },
    traditional: {
      en: "Ad-hoc REST / GraphQL endpoints",
      ja: "アドホックな REST / GraphQL",
      eo: "Ad-hoc REST / GraphQL",
    },
    definy: {
      en: "Connect-RPC (HTTP POST + Protobuf / JSON)",
      ja: "Connect-RPC (HTTP POST + Protobuf / JSON)",
      eo: "Connect-RPC (HTTP POST + Protobuf / JSON)",
    },
  },
  {
    dimension: {
      en: "Verification & Trust",
      ja: "検証と信頼モデル",
      eo: "Kontrolo kaj Fido",
    },
    traditional: {
      en: "Centralized package registries (npm, crates.io)",
      ja: "中央集権的なパッケージレジストリ依存",
      eo: "Centrigitaj pakaĵaj registroj",
    },
    definy: {
      en: "Client-side cryptographic verification (Zero-trust)",
      ja: "クライアント側での暗号署名検証（ゼロトラスト）",
      eo: "Klientflanka kriptografia kontrolo (Nulfida)",
    },
  },
  {
    dimension: {
      en: "Execution & Runtime",
      ja: "実行環境とランタイム",
      eo: "Rultempa Medio",
    },
    traditional: {
      en: "OS-dependent toolchains & package managers",
      ja: "OS 依存のツールチェイン・パッケージ導入が必要",
      eo: "OS-dependaj ilaroj kaj moduloj",
    },
    definy: {
      en: "Native WebAssembly JIT (Zero config edge/browser)",
      ja: "ブラウザ & エッジの WebAssembly JIT で即時実行",
      eo: "Reta WebAssembly JIT (Nula agordo en retumilo)",
    },
  },
];

export const BUILTIN_MODULES: ReadonlyArray<BuiltinModuleItem> = [
  {
    id: "core",
    name: "core",
    icon: "⚙️",
    title: {
      en: "definy Core Language System",
      ja: "definy 言語コアシステム",
      eo: "Kerna Sistemo de definy",
    },
    desc: {
      en: "AST node definitions, self-hosted type checker, evaluator, and WebAssembly fixed-point compiler.",
      ja: "AST 構文木定義、セルフホスト型検査器、評価器、および WebAssembly 固定点コンパイラ。",
      eo: "AST-nodaj difinoj, tip-kontrolilo kaj Wasm-kompililo.",
    },
  },
  {
    id: "std",
    name: "std",
    icon: "📦",
    title: {
      en: "Standard Library",
      ja: "標準ライブラリ",
      eo: "Norma Biblioteko",
    },
    desc: {
      en: "Arithmetic, bitwise, boolean logic, string UTF-8 streams, and high-performance list utilities.",
      ja: "算術、ビット演算、論理演算、文字列 UTF-8 ストリーム、およびリスト操作ユーティリティ。",
      eo: "Aritmetiko, logiko, ĉenoj kaj listaj funkcioj.",
    },
  },
  {
    id: "wasi",
    name: "wasi",
    icon: "🌐",
    title: {
      en: "WASI System Interface",
      ja: "WASI システムインターフェース",
      eo: "WASI Sistema Interfaco",
    },
    desc: {
      en: "Standard clock, monotonic time, and cryptographically secure random number capabilities.",
      ja: "高精度時計、モノトニック時間、および暗号学的に安全な乱数生成機能。",
      eo: "Horloĝo, tempo kaj hazardaj nombroj.",
    },
  },
  {
    id: "sample",
    name: "sample",
    icon: "🧪",
    title: {
      en: "Sample Programs & Tests",
      ja: "サンプルプログラムと検証例",
      eo: "Ekzemplaj Programoj",
    },
    desc: {
      en: "Triangle area computation, greeting routines, prime number sieve, and AST calculator.",
      ja: "三角形の面積計算、挨拶関数、素数判定、および自己記述 AST 計算例。",
      eo: "Triangula areo, salutoj kaj ekzemploj.",
    },
  },
];

export const RPC_METHODS: ReadonlyArray<RpcMethodItem> = [
  {
    service: "EventService",
    name: "GetEvents",
    request: "GetEventsRequest",
    desc: {
      en: "Stream and query deterministic signed events from D1 or in-memory store.",
      ja: "D1 またはストアから暗号署名済みイベントログを順次取得します。",
      eo: "Akiri subskribitajn eventojn el la datumbazo.",
    },
  },
  {
    service: "EventService",
    name: "SubmitEvent",
    request: "SubmitEventRequest",
    desc: {
      en: "Submit Ed25519-signed events (module commits or account creation) with verification.",
      ja: "Ed25519 署名付きイベント（モジュールコミットやアカウント作成）を提出・検証します。",
      eo: "Submeti subskribitajn eventojn.",
    },
  },
  {
    service: "DebugService",
    name: "SubmitUnverifiedEvent",
    request: "SubmitEventRequest",
    desc: {
      en: "Local development only. Save events without signature verification to test browser-side signature checks.",
      ja: "ローカル開発専用。署名を検証せずにイベントを保存し、ブラウザ側の署名チェックを確認します。",
      eo: "Nur por loka programado. Konservi eventojn sen kontroli subskribon por testi foliumilflankan subskriban kontrolon.",
    },
  },
  {
    service: "EventService",
    name: "CheckMissingHashes",
    request: "CheckMissingHashesRequest",
    desc: {
      en: "Negotiate missing CAS content hashes between client and server before upload.",
      ja: "アップロード前にサーバー上で未登録の CAS コンテンツハッシュを差分判定します。",
      eo: "Kontroli mankantajn enhav-haketojn en CAS.",
    },
  },
  {
    service: "EventService",
    name: "UploadContent",
    request: "UploadContentRequest",
    desc: {
      en: "Upload raw content bytes addressed by their SHA-256 cryptographic hash.",
      ja: "SHA-256 ハッシュでアドレス指定されたコンテンツバイト列を CAS に登録します。",
      eo: "Alŝuti krudajn bajtojn al CAS.",
    },
  },
  {
    service: "EventService",
    name: "GetContent",
    request: "GetContentRequest",
    desc: {
      en: "Retrieve immutable CAS objects (AST trees, Wasm binaries, definitions).",
      ja: "不変の CAS オブジェクト（構文木、Wasm バイナリ、定義データ）を取得します。",
      eo: "Elŝuti neŝanĝeblajn CAS-objektojn.",
    },
  },
  {
    service: "HttpProxyService",
    name: "Fetch",
    request: "HttpProxyFetchRequest",
    desc: {
      en: "Send an HTTP request the browser cannot send because of CORS on behalf of an allowed account (used by wasi.io programs).",
      ja: "CORS でブラウザから送れない HTTP リクエストを, 許可されたアカウントのためにサーバーが仲介します (wasi.io のプログラムが使う)。",
      eo: "Sendi HTTP-peton anstataŭ la retumilo, kiam CORS malhelpas ĝin.",
    },
  },
];
