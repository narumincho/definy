# definy における WASI 0.3 スタイルの Capability-based I/O 設計

definy において、時刻取得や外部通信、コンソール入出力などの I/O（副作用）を
**WASI 0.3 (WebAssembly System Interface) / Component Model** に倣った
**能力渡し（Capability-based Dependency Injection）** として扱うためのアーキテクチャ仕様。

---

## 1. 背景と設計思想

### 課題: グローバルな副作用による決定論性の崩壊
一般的なプログラミング言語では、現在時刻の取得（`now()` や `Date.now()`）や乱数、ログ出力などは
グローバルな関数や暗黙のシステムコールとして呼び出されます。
しかし、definy は **コンテンツアドレス指向（Content-addressed）** かつ **純粋関数型（Pure Functional）** な言語です。
式の中に暗黙の副作用が存在すると：
1. **決定論的実行（Determinism）の喪失**: 同じ式・同じ AST なのに、実行する時刻や環境によって結果が変わる。
2. **キャッシュ・不変性の崩壊**: コンテンツハッシュによる中間計算結果のキャッシュや安全な並列化が不可能になる。
3. **テストの困難さ**: 時刻や外部通信に依存するロジックをテストするために、グローバルステートの書き換えや複雑なモックライブラリが必要になる。

### 解決策: WASI 0.3 にインスパイアされた Capability レコード渡し
WASI 0.3 / Component Model では、コンポーネントが外部システムにアクセスする際、
暗黙のシステムコールではなく、インポートされた明示的なインターフェース（関数の集合）を通して操作します。

definy ではこれを言語レベルに昇華させ、
**「I/O を行う能力（Capability）を `Record` 型（関数の集まり）として `main` 関数等のパラメータに注入する」**
という設計を採用します。

```definy
main: WASI-Clock -> IO DateTime
main = clock => (clock.now)()
```

---

## 2. 型とデータ構造の表現

### ① 時刻データ型: `wasi.datetime`
エポックからの秒数とナノ秒数を保持するレコード型。

```definy
type wasi.datetime = {
  seconds: number,
  nanoseconds: number,
}
```

### ② WASI Clock 能力型: `wasi.clock`
引数なし（空レコード `{}` = `unit`）を受け取り、現在時刻を返す関数 `now` を持つインターフェースレコード。

```definy
type wasi.clock = {
  now: {} -> wasi.datetime,
}
```

### ③ `IO` 型のセマンティクス
definy における `IO<T>` は、純粋関数型言語におけるサンク（Thunk / Action）として自然に表現されます：
```definy
type IO<T> = {} -> T
type IO Unit = {} -> {}
```
関数を呼び出すまで副作用は実行されず、純粋な値として扱われます。

---

## 3. テスト容易性 (Testability) の実現

能力（Capability）を引数として受け取る構造により、
テストコードでは**「固定時刻を返すモックレコード」**を渡すだけで、スリープやグローバルモックなしに 100% 決定論的なテストが可能です。

### テスト例: 期限切れ判定ロジックの検証

```rust
// definy-server/src/self_hosting_tests/wasi_tests.rs より抜粋

// 1. 期限切れ判定関数（WASI Clock 注入型）
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

### 本番実行時のシステム実時間注入
本番環境では、ホスト側（Rust / WebAssembly ランタイム）が `std::time::SystemTime::now()` や
WASI ホストインポートを呼び出す関数を格納した `WASI-Clock` レコードを構築し、`main` に渡して実行します。

```rust
let system_clock = create_system_clock_capability();
let result = evaluate(main(system_clock));
```

---

## 4. 他の I/O 能力（Capability）への拡張性

Clock だけでなく、あらゆる副作用を同一のパターンで統一的に表現できます：

- **`WASI-Console`**:
  `{ print: string -> IO Unit, read_line: {} -> IO string }`
- **`WASI-Random`**:
  `{ next_number: {} -> IO number }`
- **`WASI-Http`**:
  `{ fetch: { url: string, method: string } -> IO HttpResponse }`
- **`WASI-FileSystem`**:
  `{ read_file: string -> IO string, write_file: { path: string, content: string } -> IO Unit }`

すべての外部環境依存が関数の引数（Record）に集約されるため、
definy のコア言語仕様は極めてシンプルかつ純粋に保たれ、安全なサンドボックス実行と完全なテスト容易性が両立されます。
