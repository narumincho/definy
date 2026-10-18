コードを変更・保存した際は、以下のコマンドを実行してフォーマットと検証を行ってください。

- `npx prettier --write .`
- `npm run lint` (`oxlint`)
- `npm run check` (`tsc --noEmit`)
- `npm test` (`vitest run`)

作業で新しく判明したノウハウや definy の仕様があれば docs/ 以下のドキュメントを新しく作るか追記してください。

まともに稼働している本番環境はまだないため破壊的変更を入れても問題ありません。

ビルトインモジュール（core, std, sample など）のパーツ定義の正本は `seeds/*.json` です。
seed 中のパーツ ID は `{"$part": "core.expression"}` の名前参照で書きます。
全スタックは TypeScript + React 19 + Void + self-hosted Wasm に一本化されています。
