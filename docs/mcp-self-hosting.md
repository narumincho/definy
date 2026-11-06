# MCP を主役にした完全セルフホスト

2026-11-06 に決めた方針。definy で definy を作る ([self-hosting.md](self-hosting.md)) の残りのうち,
一番大きいのは UI を definy で作り直すこと (React の UI が TypeScript の大半)。
そこで操作の主役を UI ではなく MCP (AI エージェント) にし, UI は最小限にして,
TypeScript を無くしていく。

## 目標

- definy の変更 (core や definy モジュールのパーツも含む) は MCP のツールで読み書きする
- MCP のサーバーは definy サーバー (Worker) の中にあり, 処理は definy の関数で書く
- UI は閲覧と, 人間がブランチを取り込むかを決める画面くらいで, サーバーが HTML を返すだけにする
- TypeScript は無くす。ただし Cloudflare Workers は Wasm を起動するのに JavaScript の入口が要るので,
  能力 (ストア, 署名, HTTP) を渡すだけの固定の小さな JavaScript は残る

## 段階

1. **Worker の `/mcp` を definy で書く** ([mcp.md](mcp.md))
   - 1a (2026-11-06): JSON-RPC の処理 (`definy.handle-mcp`) と, 読み取りの RPC をそのまま呼ぶツール
   - 1b-1 (2026-11-06): パーツの中身を読めるツール (`definy_get_project`, `definy_get_part`) と式のテキスト ([expression-text.md](expression-text.md))
   - 1b-2a (2026-11-06): Worker に Ed25519 で署名する能力を足し (専用アカウントの鍵は Worker の secret), CBOR を書く関数と
     `definy_whoami`, `definy_create_branch`
   - 1b-2b: 式のテキストを読む関数 (2 段目の前倒し) と, パーツを変えるコミット (`definy_commit_parts`)
   - 1b-3: 性能ログ (`definy_perf_recent_submits`) を移し, stdio 版 (`mcp/`) を消す
2. **AI が式を読み書きしやすくする**: 式のテキスト形式 (今はプロジェクトの外の `dtx.mjs` で JSON と変換している) の
   表示と読み取りを definy に入れ, ツールで式をテキストで受け渡す。式を実行するツールも足し,
   エージェントが vitest なしで動きを確かめられるようにする
3. **正本を `seeds/*.json` から definy のストアに移す**: core や definy の変更も MCP の `commit_parts` で入れ,
   ビルドとブートストラップ (`build:seeds`, `build:stage1`) はストアから読む
4. **最小限の UI をサーバーが返す HTML にする**: definy の関数が HTML を作り, React と Vite をやめる
5. **JavaScript を固定の土台だけにする**: `worker/` のホストを能力を渡すだけにし, できればそれも definy で生成する

## 気をつけること

- Worker のリソース上限: 大きなプロジェクトへのコミットは上限に達することがある (2026-11-03 に stdio 版で確認。[mcp.md](mcp.md))
- TypeScript のテストを消した後の検証: 適合テストや E2E を definy の式とツールで書けるようにしてから消す
