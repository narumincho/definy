# @narumincho/gen

[Definy](https://github.com/narumincho/Definy) で HTML, TypeScript, JavaScript, package.json, wasm を生成したかったので作った.

## JsTs の 特徴

- 入力値は, 構造化されているので TypeScript の AST(抽象構文木)とは違う
- 出力した形式は人間にも読みやすい
- 予約語はあまり気にしなくて良い
- 対応している構文は一部だけ
- var などの古い構文を出力せず, 新しいスタイルのコードを生成する

サンプルコードは, https://github.com/narumincho/Definy/tree/main/test のコードを見るべし
