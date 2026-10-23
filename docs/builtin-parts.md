# コンパイラ組み込みのパーツと演算子の廃止

definy には演算子 (operator) という概念は無く, あるのはパーツ (関数) だけ ([Issue #717](https://github.com/narumincho/definy/issues/717)).
数値の加算・比較・論理演算・文字列やリストの操作も, `core.plus` `core.less-than` `core.not` `core.list-get` などの
**コンパイラ組み込みのパーツ** を他のパーツと同じく `Call` で呼んで書く. `!` や `+` のような記号でも表さない.

```json
{
  "Call": {
    "function": {
      "PartReference": {
        "part_definition_event_hash": { "$part": "core.plus" }
      }
    },
    "arguments": [
      { "name": "left", "value": { "Number": { "value": 1 } } },
      { "name": "right", "value": { "Variable": { "variable_id": 0 } } }
    ]
  }
}
```

以前の式の AST には `Add` `Not` `ListGet` などの演算専用のノードがあったが, seed・適合テスト・エディタから取り除いた
(seed は `{"Add": {left, right}}` を `core.plus` の呼び出しに機械的に書き換えた).

## 組み込みのパーツ

- 式が `{"Compiler": "plus"}` のパーツがコンパイラ組み込み. 組み込みかどうかはパーツ名ではなく式で決まる (`compilerBuiltinName`)
- 引数名は下の表のとおり. 型の決まるもの (`core.plus` は `(left: number, right: number) -> number` など) は `part_type` を持つ.
  `core.equal` `core.not-equal` `core.list-length` `core.list-concat` `core.list-get` `core.list-append` は
  どの型の値にも使えて今の `PartType` (型引数が無い) では書けないので, 型を持たない

| 組み込み (`Compiler`)                                                                                                                                                | パーツ                            | 引数                    | `core.expression`  |
| :------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :-------------------------------- | :---------------------- | :----------------- |
| `plus` / `minus`                                                                                                                                                     | `core.plus` / `core.minus`        | `left`, `right`         | `add` / `subtract` |
| `multiply` `divide` `remainder` `equal` `not_equal` `less_than` `less_than_or_equal` `greater_than` `greater_than_or_equal` `and` `or` `string_concat` `list_concat` | `core.multiply` など (`_` は `-`) | `left`, `right`         | 同じ名前           |
| `not` `string_length` `string_to_bytes` `list_length`                                                                                                                | `core.not` など                   | `value`                 | 同じ名前           |
| `string_slice`                                                                                                                                                       | `core.string-slice`               | `value`, `start`, `end` | `string_slice`     |
| `list_get`                                                                                                                                                           | `core.list-get`                   | `list`, `index`         | `list_get`         |
| `list_append`                                                                                                                                                        | `core.list-append`                | `list`, `item`          | `list_append`      |

`bit_and` などのビット演算は `core.expression` に対応するバリアントが無いので, 呼び出すと `SelfHostedAstConversionError` になる.

## stage1・型チェッカーに渡すとき

definy 製のコンパイラ・型チェッカー・評価器が受け取る `core.expression` には, まだ `add` などの専用のバリアントがある.
そのため TypeScript 側の変換 (`definyAstToSelfHostedAst`, `src/stage1_compiler.ts`) で,
組み込みのパーツの呼び出しを `BUILTIN_FUNCTIONS` の表のバリアントにする (引数名がそのままバリアントのフィールド名).
変換の結果は以前の `Add` などと同じなので, seed を書き換えても `wasm/stage1.wasm` はバイト単位で変わらなかった.

変換には「その ID のパーツが組み込みか」を知る `BuiltinResolver` が要る. パーツ ID は内容から決まらないので, パーツの式から求めて渡す.

- コンパイル: `collectReferencedParts` は呼び出している組み込みのパーツも `parts` の最後に (式 `{"Compiler": ...}` のまま) 入れる.
  `Stage1CompilerInstance.compile` はそこから `builtinResolverOf` で組み込みを引き, stage1 には組み込み以外のパーツだけを渡す
  (`stage1PartsExpression`). 呼ばずに参照している組み込みのパーツは今までどおり `unresolved`
- 型検査: 型環境のエントリ (`PartTypeEntry` / 型チェッカーの `ModuleEntry`) に `builtin` (組み込みの名前) を持たせる.
  `typeEnvFromParts` は型の無い組み込みのパーツも型環境に入れる.
  サーバー (`worker/type_check.ts`) は型パーツ以外の式を読まないので, CAS に預けた式でも `{"Compiler": name}` の content hash から組み込みと分かるようにしている
- UI の型エラーの位置 (`findTypeErrorPath`) も同じ `BuiltinResolver` で変換して型チェッカーの式と比べる

### 残っていること

`core.expression` から `add` などのバリアントをなくし, definy 製のコンパイラ・型チェッカー・評価器が
組み込みのパーツの呼び出しを直接扱うようにすれば, TypeScript 側の変換の表 (`BUILTIN_FUNCTIONS`) は要らなくなる.
コンパイラ自身のソースも組み込みのパーツを呼んでいるので, 今の stage1 で一度コンパイルし直す自己ホストのブートストラップが要る.

## 式エディタ

- 置換メニューに演算子の選択肢は無く, `core.plus` などはパーツの選択肢として出る (検索語 `plus` で `core.plus` が出る)
- 関数のパーツ (型が関数か, 型の無い組み込み) を選ぶと, 引数を未入力にしたそのパーツの呼び出しにする (`partParameterNames`, `applySelection`).
  呼び出しを別のパーツに差し替えるときは同じ名前の引数の式を引き継ぐ (`core.less-than` → `core.less-than-or-equal`).
  呼び出しの関数の位置 (パーツ名のバッジ) で選んだときは参照だけを置き換える
- ツリーでは他のパーツの呼び出しと同じく `call core.plus left: … right: …` と表示する
