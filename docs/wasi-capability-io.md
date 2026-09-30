# definy における WASI 0.3 スタイルの Capability-based I/O 設計

definy において、時刻取得や乱数、外部通信、コンソール入出力などの
I/O（副作用）を **WASI 0.3 (WebAssembly System Interface) / Component Model**
に倣った **能力渡し（Capability-based Dependency Injection）**
として扱うためのアーキテクチャ仕様。

---

## 1. 背景と設計思想

### 課題: グローバルな副作用による決定論性の崩壊

一般的なプログラミング言語では、現在時刻の取得（`now()` や
`Date.now()`）や乱数、ログ出力などは
グローバルな関数や暗黙のシステムコールとして呼び出されます。 しかし、definy は
**コンテンツアドレス指向（Content-addressed）** かつ **純粋関数型（Pure
Functional）** な言語です。 式の中に暗黙の副作用が存在すると：

1. **決定論的実行（Determinism）の喪失**: 同じ式・同じ AST
   なのに、実行する時刻や環境によって結果が変わる。
2. **キャッシュ・不変性の崩壊**:
   コンテンツハッシュによる中間計算結果のキャッシュや安全な並列化が不可能になる。
3. **テストの困難さ**:
   時刻や外部通信に依存するロジックをテストするために、グローバルステートの書き換えや複雑なモックライブラリが必要になる。

### 解決策: WASI 0.3 にインスパイアされた Capability レコード渡し

WASI 0.3 / Component Model では、コンポーネントが外部システムにアクセスする際、
暗黙のシステムコールではなく、インポートされた明示的なインターフェース（関数の集合）を通して操作します。

definy ではこれを言語レベルに昇華させ、 **「I/O を行う能力（Capability）を
`Record` 型（関数の集まり）として `main` 関数等のパラメータに注入する」**
という設計を採用します。

```definy
-- 単一能力（例: Wall Clock）の受け取り
main: wasi.wall-clock -> IO wasi.datetime
main { now } = now ()

-- 複合環境能力（World Environment）の受け取り
main: wasi.env -> IO wasi.datetime
main env = (env.wall_clock.now) ()
```

---

## 2. システム標準 `wasi` モジュールの型とインターフェース

definy
サーバーの初期マイグレーション（`builtin_migration.rs`）において、システム標準モジュール
`wasi`（`mod_wasi`）が提供されています。

### ① 日時データ型: `wasi.datetime` (`type_wasi_datetime`)

エポック秒とナノ秒を保持するレコード型。

```definy
type wasi.datetime = {
  seconds: number,
  nanoseconds: number,
}
```

### ② 実時間時計能力: `wasi.wall-clock` (`type_wasi_wall_clock`)

WASI 0.3 `wasi:clocks/wall-clock` 相当。現在の日時を返す `now`
関数を持つインターフェースレコード。

```definy
type wasi.wall-clock = {
  now: {} -> wasi.datetime,
}
```

### ③ 単調時計能力: `wasi.monotonic-clock` (`type_wasi_monotonic_clock`)

WASI 0.3 `wasi:clocks/monotonic-clock`
相当。経過時間計測やベンチマーク用のナノ秒カウンタを返す `now`
関数を持つインターフェースレコード。

```definy
type wasi.monotonic-clock = {
  now: {} -> number,
}
```

### ④ 乱数生成能力: `wasi.random` (`type_wasi_random`)

WASI 0.3 `wasi:random/random` 相当。64ビット乱数を返す `get_random_u64`
関数を持つインターフェースレコード。

```definy
type wasi.random = {
  get_random_u64: {} -> number,
}
```

### ⑤ 統合環境能力: `wasi.env` (`type_wasi_env`)

WASI 0.3 の World
インポート相当。アプリケーションが必要とする能力を束ねたレコード型。

```definy
type wasi.env = {
  wall_clock: wasi.wall-clock,
  monotonic_clock: wasi.monotonic-clock,
  random: wasi.random,
}
```

### ⑥ 標準組み込み関数

- `clock-now`: `wasi.wall-clock -> wasi.datetime`
- `monotonic-now`: `wasi.monotonic-clock -> number`
- `random-u64`: `wasi.random -> number`
- `clock-get-seconds`: `wasi.datetime -> number`
- `clock-is-expired`: `wasi.wall-clock -> number -> bool`

---

## 3. テスト容易性 (Testability) の実現

能力（Capability）を引数として受け取る構造により、
テストコードでは**「固定値やシードに基づくモックレコード」**を渡すだけで、スリープやグローバルモックなしに
100% 決定論的なテストが可能です。

### テスト例: 期限切れ判定ロジックの検証

```rust
// definy-server/src/self_hosting_tests/wasi_tests.rs より抜粋

// 1. 期限切れ判定関数（WASI WallClock 注入型）
// clock => deadline => (clock.now)({}).seconds >= deadline
let is_expired_part = create_wasi_clock_is_expired_part(&mod_id);

// 2. モック Clock 能力の作成（現在時刻を 1000秒 に固定）
let mock_clock_before = create_mock_clock_capability(1000, 0);

// 3. 期限 1500秒 に対して判定 -> 必ず false（未期限切れ）が返る！
let res_before = evaluate(is_expired(mock_clock_before, 1500));
assert_eq!(res_before, Value::Bool(false));

// 4. 時刻を進めたモック Clock 能力の作成（現在時刻を 2000秒 に固定）
let mock_clock_after = create_mock_clock_capability(2000, 0);

// 5. 同じ期限に対して判定 -> 必ず true（期限切れ）が返る！
let res_after = evaluate(is_expired(mock_clock_after, 1500));
assert_eq!(res_after, Value::Bool(true));
```

### 本番実行時のシステム実時間・システム乱数注入

本番環境では、ホスト側（Rust / WebAssembly ランタイム）が
`std::time::SystemTime` や WASI ホストインポートを呼び出す関数を格納した
`wasi.env` レコードを構築し、`main` に渡して実行します。

```rust
// ホストランタイムがシステム能力を注入
let system_env = create_system_wasi_env();
let result = evaluate(main(system_env));
```

---

## 4. 他の WASI 0.3 I/O 能力への拡張

同様のパターンで、WASI 0.3 の他の標準インターフェースも容易に拡張できます：

- **`wasi:cli/stdout` / `stderr`**:
  `{ print: string -> IO Unit, print_line: string -> IO Unit }`
- **`wasi:http/outgoing-handler`**:
  `{ handle: { request: HttpRequest } -> IO HttpResponse }`
- **`wasi:filesystem/types`**:
  `{ read_via_stream: Descriptor -> IO Stream, write_via_stream: Descriptor -> IO Stream }`

すべての外部環境依存が関数の引数（Record）に集約されるため、 definy
のコア言語仕様は極めてシンプルかつ純粋に保たれ、安全なサンドボックス実行と完全なテスト容易性が両立されます。
