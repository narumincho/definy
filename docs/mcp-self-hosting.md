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
   - 1b-2b (2026-11-06): 式のテキストを読む関数 (`definy.parse-expression-text`。2 段目の前倒し) と,
     パーツを変えるコミット (`definy_commit_parts`)
   - 1b-3 (2026-11-06): 性能ログ (`definy_perf_recent_submits`) を移し, stdio 版 (`mcp/`) を消した
     2 段目からは, 下の「方針の見直し」で書き直した (式のテキスト形式は 1b で前倒しして入れた)。

## 方針の見直し: 手元で動く definy サーバー (2026-11-06)

1 段目のあと, 式の実行は今の公開サーバー (definy.narumincho.com) ではしない仕様なので, 2 段目以降は
**手元で動く definy サーバー** (CLI が localhost に立てる HTTP サーバー) を主役にすることにした (ユーザーと相談して決めた)。
普通の言語の処理系と同じく手元で実行と署名をし, 公開サーバーは保存・検証・配布だけをする (Git と GitHub の関係)。

### 形

- `definy serve` (名前は仮) が `127.0.0.1` に HTTP サーバーを立てる。中身は Worker と同じ service の wasm
  (`definy.handle-request`) で, MCP (`/mcp`, Streamable HTTP), RPC, 将来の HTML の UI が 1 つのサーバーに乗る
- ホストが渡す能力だけをローカル用にする ([service.md](service.md) の service-io):
  - ストア: D1 の代わりに手元の SQLite (`sql` の能力をそのまま渡せる)
  - 署名: `sign_mcp_account` の鍵をユーザー自身の鍵にする (ファイルか OS の鍵の保管場所)。専用アカウントの信用の問題が無くなる
  - 式の実行: 手元なので Worker のリソース上限や公開サーバーの安全を気にしなくてよい。`wasi.io` ([wasi-io.md](wasi-io.md))
    の HTTP や secret もマシンの外に出ない
- 公開サーバーとはイベントの同期でつなぐ (push / pull)。手元で署名したイベントを `SubmitEvent` で送り,
  公開サーバーのイベントは `GetEvents` で取り込む。イベントは署名付きなので, どちらのストアにあっても検証できる
- Worker の `/mcp` (1 段目) は, 手元にサーバーを立てない人の読み取りと, ブランチの取り込み (人間の判断) のために残す

### localhost のサーバーの安全

- `127.0.0.1` だけで待つ
- ブラウザで開いた別のサイトから叩かれないように (CSRF, DNS rebinding), `Host` が localhost か, `Origin` が自分のものか確かめる
- 起動時にトークンを出し, MCP のクライアントの設定 (`Authorization` ヘッダー) に入れる

### 段階 (書き直し)

2. **手元の definy サーバー**: Node.js の小さなホスト (能力を渡すだけ) で service の wasm を動かし, SQLite のストアと
   手元の鍵の署名を渡す。MCP のツールに式の実行 (`definy_run_expression`。テキストの式を型検査してコンパイルし, 値をテキストで返す) を足す
   - サーバー: `npm run serve` (`cli/`, [local-server.md](local-server.md)) — 済
   - 式の実行のツール — まだ
3. **公開サーバーとの同期**: push / pull のツールと CLI のコマンド
4. **正本を `seeds/*.json` から definy のストアに移す**: core や definy の変更も手元のサーバーの `commit_parts` で入れ,
   公開サーバーに push する。ビルドとブートストラップはストアから読む
5. **最小限の UI**: 手元のサーバーと公開サーバーが definy の関数で HTML を返す。React と Vite をやめる
6. **JavaScript を固定の土台だけにする**: Worker と手元のサーバーのホストを能力を渡すだけにする。
   手元のホストは将来 wasmtime などの WASI のランタイムに置き換えられる

## 気をつけること

- Worker のリソース上限: 大きなプロジェクトへのコミットは上限に達することがある (2026-11-03 に消した stdio 版で確認。[mcp.md](mcp.md))
- TypeScript のテストを消した後の検証: 適合テストや E2E を definy の式とツールで書けるようにしてから消す
