# 関数は呼び出すだけ (関数呼び出し必須の構文)

definy では JavaScript のように関数を値として変数に入れたり, そのまま引数に渡したりしない.
Java のメソッドのように, 関数は **名前を書いて呼び出す** だけで, 関数を受け取る引数には **必ずラムダ式 (関数リテラル) を直接書く**.

```text
core.list-map(f: f, xs: xs)                    // 書けない (関数型の引数 f を値として渡している)
core.list-map(f: (item) => f(item: item), xs: xs) // 書ける
let g = core.plus in ...                        // 書けない (関数のパーツを呼ばずに値にしている)
((x) => x)(x: 1)                                // 書けない (ラムダ式は呼び出せない)
core.type-checker(...)(...)                     // 書けない (呼び出しの結果は呼び出せない)
```

## 呼び出せるもの (`core.callee`)

呼び出し式 (`call`) の `function` は任意の式ではなく, 次のどれか (`core.callee`) に限る.

| `core.callee`                                  | 意味                                                                                            |
| :--------------------------------------------- | :---------------------------------------------------------------------------------------------- |
| `part_reference({part_definition_event_hash})` | 関数のパーツ・コンパイラ組み込みのパーツ (`core.plus` など)                                     |
| `variable({variable_id})`                      | 関数型の引数 (`core.list-map-inner` の `f` など)                                                |
| `record_get({record, key})`                    | レコードの関数のフィールド (WASI の能力 `clock.now()`, ストリームの `next`)                     |
| `builtin(name)`                                | コンパイラ組み込みそのもの. `core.expression` のデータとしてだけ書く (`sample.sample-ast-calc`) |

- `core.callee` の各バリアントは `core.expression` の同じ名前のバリアントと同じ形なので, 値のメモリ上の表現は変わらない.
  そのため変更前の `wasm/stage1.wasm` のまま新しい seeds をコンパイルでき, `npm run build:stage1 -- --bootstrap` の 1 回目で不動点になった (93547 bytes)
- seed の JSON スキーマ (`core.callee` の宣言から作る, [value-encoding.md](value-encoding.md)) でも `call.function` は上の 4 つに限る.
  seed の全パーツがこの形であることは `src/seed_schema.test.ts` で確かめる
- 以前は TypeScript の変換 (`definyAstToSelfHostedAst`) が他の式を `Call.function` に書くと `SelfHostedAstConversionError` を投げていた.
  式を `core.expression` の値のまま保存するようにして変換を消したので, 今は TypeScript では検査しない
  (UI は `core.callee` の形でしか呼び出しを作らない)
- 評価器・コンパイラなど呼び出す関数を式として扱いたいところは `core.callee-to-expression` で式にしてから使う
  (`core.eval-value`, `core.compile-call`, `core.expression-children`, `core.expression-to-source`)

## 型検査

- 呼び出し先の型は `core.type-check-callee` が求める (パーツの型・変数の型・レコードのフィールドの型. 関数でよい)
- 値の位置に書いた変数・パーツ参照・レコードのフィールドの取り出しが関数型 (`function` か型の無い組み込み `builtin`) なら,
  `core.type-check-value-not-function` が `function_not_called({actual})` (`core.type-error` に追加) のエラーにする
- ラムダ式を置ける位置は以前と同じ: パーツの式の直下 (カリー化した関数は宣言した戻り値の型に沿って入れ子にする),
  関数型の引数への `Call` の引数, 関数型のフィールドを持つレコードのフィールド ([self-hosting.md](self-hosting.md) の「Lambda の配置規則」)
- 関数を返す呼び出し (`core.type-checker` が返すレコードの `check` に入れる `core.type-checker-in-env(env)` など) は値にしてよい.
  ただし呼び出しの結果をそのまま呼ぶ構文は無い

seed の `core.list-map` `core.list-map-inner` `core.list-fold` `core.list-fold-inner` は関数型の引数を再帰呼び出しにそのまま渡していたので,
`(item) => f(item: item)` のようなラムダ式で包んだ.

## 式エディタ

- 呼び出す関数は呼び出しの一部として, 名前 (パーツ名・引数名・`clock.now`) のバッジで出す. 名前のバッジは呼び出しと同じパスで式ではないので,
  名前を押す・ホバーすると呼び出し全体を選ぶ・説明を出す (以前は呼び出す関数が別の式 `callFunction` で, 呼び出し自体を選べる当たり判定が狭かった)
- パスの `callFunction` は無くした. 呼び出しを別のパーツに差し替えるときは, 呼び出しを選んで置換メニューでパーツを選ぶ (同じ名前の引数の式を引き継ぐ)

- 置換メニューで関数のパーツ (関数の型か, 型の無い組み込み) を選ぶと, 引数名をすべて入れて値を未入力にしたそのパーツの呼び出しにする (`partParameterNames`)
- 関数型の変数 (関数の引数) を選んだときも, 同じく引数名をすべて入れたその変数の呼び出しにする.
  変数の型は書いた位置から求める (`functionParameterTypes`, `src/tree_layout/selection.ts`): パーツの式の直下の関数の引数はパーツの型,
  呼び出しの引数に書いたラムダ式の引数は呼び出すパーツ (か関数型の変数) のその引数の型. 型の分からない変数はそのまま変数にする
- 呼び出しを選んで別のパーツ・関数型の変数を選ぶと, 同じ名前の引数の式を引き継ぐ

残課題: 関数型の引数の位置 (`core.list-map` の `f:` など) でパーツを選んだときにラムダ式で包む, はまだ無い (呼び出しになるので型エラー).
