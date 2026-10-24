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

システム標準モジュール `wasi` (`seeds/wasi.json`) が提供されています。

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

`wasi.clock-is-expired` (`clock => deadline => (clock.now)({}).seconds >= deadline`) に,
現在時刻を 1000 秒に固定したモックの Clock を渡すと期限 1500 秒に対して必ず `false`,
2000 秒に固定したモックなら必ず `true` が返る (旧 Rust 版のテストで確かめていた)。

### 本番実行時のシステム実時間・システム乱数注入

本番では, ホストが実時間や乱数を返す関数を入れた環境のレコードを `main` に渡して実行する想定 (未実装)。
今 I/O をするプログラムは, この能力渡しとは別の `wasi.io` の値で表している ([wasi-io.md](wasi-io.md))。

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

---

## 5. 構造的幅サブタイピング (Structural Width Subtyping) による合成容易性

### 課題: 合成時における不要なフィールド除去の手間

Capability
パターンを多用すると、合成したい各関数が要求する環境が異なるケースが頻発します：

```definy
funcA: wasi.wall-clock -> IO Data
funcB: Data -> { wall_clock: wasi.wall-clock, random: wasi.random } -> IO Data

-- ctx に wall_clock と random の両方が含まれる場合:
andThen (funcA ctx) (\r -> funcB r ctx)
```

厳密な型一致（Nominal または完全一致の Structural Typing）を要求すると、`funcA`
を呼ぶために `ctx` からわざわざ `{ wall_clock = ctx.wall_clock }`
という新しいレコードを作って渡すボイラープレートが必要になってしまいます。

### 解決策: 余計なフィールドを許容する幅サブタイピング

definy では TypeScript
のオブジェクト型と同様に、**レコードの構造的幅サブタイピング（Width
Subtyping）** を採用しています。

1. **余剰フィールドの許容**: 期待型 `{ wall_clock: wasi.wall-clock }`
   に対して、余分なフィールドを持つ
   `{ wall_clock: wasi.wall-clock, random: wasi.random, ... }`
   をそのまま渡すことができます。
2. **キー順序の非依存**:
   フィールドの定義順やリテラルの並び順が異なっていても、同名フィールドの型が合致していれば代入可能です。
3. **安全な欠落検知**:
   要求されているフィールドが存在しない、あるいは型が不適合な場合のみ型エラー（Diagnostics
   / Type Check Error）として報告されます。

### 実装アーキテクチャ

- **セルフホスト型チェッカー**: `core.type-assignable` により、関数呼び出し（`Call`）や期待型との照合（`check-against`）において
  幅サブタイピングを検証します。UI の型エラー表示もサーバーの検査も同じ型チェッカーを使います。
- **ランタイム評価器**: `record-field-lookup`
  によるキー名での動的フィールド探索を行っているため、余分なフィールドが存在していてもオーバーヘッドなく正しく動作します。
