コードを変更・保存した際は、以下のコマンドを実行してフォーマットを行ってください。

- `cargo fmt`
- `dx fmt`

作業で新しく判明したノウハウや definy の仕様があれば docs/
以下のドキュメントを新しく作るか 追記してください

まともに稼働している本番環境はまだないため破壊的変更を入れても問題ありません

ビルトインモジュール（core, std など）のパーツ定義の正本は `seeds/*.json` です。
Rust のコードで AST を組み立てて追加するのではなく、seed JSON を編集してください
（編集後は `cargo run -p definy-server -- --export-seeds seeds` で整形）。
seed 中のパーツ ID は `{"$part": "core.expression"}` の名前参照で書きます。
UI / MCP でシステムアカウントとして編集した内容は `--export-seeds-from <URL>` で seed に書き出せます
（詳細は docs/system-account.md）。
