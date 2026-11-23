コードを変更・保存した際は、以下のコマンドを実行してフォーマットと検証を行ってください。

- `npx prettier --write .`
- `npm run lint` (`oxlint`)
- `npm run check` (`tsc --noEmit`)
- `npm test` (`vitest run`)

作業で新しく判明したノウハウや definy の仕様があれば docs/ 以下のドキュメントを新しく作るか追記してください。

まともに稼働している本番環境はまだないため破壊的変更を入れても問題ありません。

ビルトインモジュール（core, std, sample など）のパーツ定義の正本は `seeds/store/` (アカウント opus5.5 が署名したコミット) です (docs/source-in-store.md)。
`seeds/store/` は手で書きません。手元のサーバー (`npm run serve`) の MCP `definy_commit_parts` でコミットし,
`npm run export:store http://127.0.0.1:8787` で書き出します (docs/source-in-store.md の「編集の流れ」。
鍵は `$DEFINY_HOME/account.json`。opus5.5 の鍵でないとコミットできない)。
テストやスクリプトがビルトインのパーツを読むときは `src/seed_parts.ts` の `loadSeedModule` などを使います。
サーバーは Cloudflare Worker (`wrangler.jsonc`) + self-hosted Wasm で, UI は definy のストアの html-ui (docs/html-ui.md) です。React/Vite の UI は 2026-11 に削除しました。
