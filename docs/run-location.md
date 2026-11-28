# プログラムを動かす場所: ブラウザかサーバーか (2026-11-28)

I/O をするプログラム (`wasi.io`. [wasi-io.md](wasi-io.md)) は, **全体をブラウザで動かすか, 全体をサーバーで動かすか** を選ぶ。
サーバーで動かせるのは **そのサーバーの管理者だけ**。

以前は「ブラウザで動かし, `fetch` が CORS で失敗した HTTP リクエストだけをサーバーに仲介させる」
(`definy.v1.HttpProxyService/Fetch`) 仕組みだった。これを消し, 一部ではなく全体をどちらかで動かす形にした (ユーザーの要望)。

## 2 つの場所

|                 | ブラウザ                                                                              | サーバー                                                                                   |
| --------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| HTTP リクエスト | ブラウザの `fetch`。CORS を許可しない相手 (Cloudflare の API など) には届かず `error` | サーバー (Node.js) の `fetch`。CORS の制約は無い                                           |
| シークレット    | このブラウザに入れた値 (localStorage. [secret.md](secret.md))                         | サーバーに入れた値 (手元のサーバーの `secrets.json`. [local-server.md](local-server.md))   |
| `get_parts`     | ブラウザが持つパーツ (作業中の変更を含む)                                             | ブラウザが送ったパーツ (`RunService/RunIo`) か, サーバーのストアのパーツ (`definy_run_io`) |
| 使える人        | 誰でも                                                                                | サーバーの管理者 (`DEFINY_ADMIN_ACCOUNT_IDS`) だけ                                         |
| 使えるサーバー  | —                                                                                     | Node.js の definy サーバー (`npm run serve`) だけ                                          |

### サーバーで動かせるのは Node.js の definy サーバーだけ

Cloudflare Workers は実行時に Wasm をコンパイルできない (`WebAssembly.compile` などが禁止. [html-ui.md](html-ui.md))。
評価器 (`core.eval-value`) で動かす手もあるが, 無料プランの CPU 約 2 秒の上限で `html-ui.deploy` のような大きなプログラムは落ちる。
そこで **公開サーバー (Cloudflare) はサーバーでの実行をしない** と決めた (2026-11-28 ユーザーの決定。
他の案「Cloudflare では評価器で動かす」「Cloudflare では仲介を残す」は選ばなかった)。

- サーバーが実行できるかはホストの能力 `read_host_settings` の `run_expressions` (`definy_run_expression` と同じ)。
  `cli/serve.ts` は `DEFINY_RUN_EXPRESSIONS: "1"` と `LOCAL_IO` (`cli/local_io.ts`) を渡す。Worker は渡さない
- fly.io の html 版のホスト (`definy.node-host-script`. [fly-io.md](fly-io.md)) は Node.js だが, 動かすのは
  `definy.cloudflare-service-runtime-script` (Workers と同じ能力の土台) で, `run_wasi_io` は無い。まだサーバーで実行できない

### 管理者

- `DEFINY_ADMIN_ACCOUNT_IDS` (カンマ・セミコロン・空白区切り. 大文字小文字を区別する) に列挙したアカウント。
  確かめるのは definy の `definy.is-admin-account` (`read_admin_account_ids` を `definy.split-account-ids` で区切る)
- **手元のサーバー (`npm run serve`) は自分の鍵のアカウント (`account.json`) を管理者に足す**。環境変数
  `DEFINY_ADMIN_ACCOUNT_IDS` があればそれも足す
- 公開サーバー (Worker) の管理者は今までどおり Worker の環境変数。管理者でも公開サーバーでは実行できない (上)。
  アカウントのダイアログの「管理者」のバッジには使う

## RPC: `definy.v1.RunService` (`proto/definy/v1/run.proto`)

どちらも `definy.handle-rpc` から definy のパーツで処理する。署名は [rpc-authorization.md](rpc-authorization.md) の `Authorization` ヘッダー。

### `GetRunOptions` (`definy.get-run-options`)

```json
{} → { "administrator": true, "serverRun": true }
```

- `administrator`: 署名したアカウントが管理者か。署名が無ければ `false` (署名は無くてもよい)。署名が正しくなければ `unauthenticated`
- `serverRun`: このサーバーがプログラムを実行できるか (`run_expressions`)
- 両方 `true` のときだけ, UI はサーバーで動かす選択肢を出す。以前の「空の URL を `HttpProxyService/Fetch` に送って 400 なら管理者」という
  確かめ方は, 専用の RPC ができたのでやめた

### `RunIo` (`definy.run-io-on-server`)

```json
{
  "wasmBase64": "<core.compile-to-wasm でコンパイルしたプログラム (標準 Base64)>",
  "parts": [{ "id": "<パーツ ID>", "cbor": "<式の CBOR (CAS と同じ, 標準 Base64)>" }]
}
→ { "ok": true, "message": "<done のメッセージか止まった理由>", "steps": ["<I/O ごとの 1 行>"] }
```

1. `definy.read-rpc-authorization`: 署名が無ければ `unauthenticated` (`RunService/RunIo requires an Authorization header`), 違えばその理由で `unauthenticated`
2. `definy.is-admin-account`: 管理者でなければ `permission_denied` (`Only the administrators of this server (DEFINY_ADMIN_ACCOUNT_IDS) can run programs on it`)
3. `run_expressions` が `false` なら `failed_precondition` (400. `This server cannot run programs ...`)
4. ホストの能力 `run_wasi_io` に `wasm` と `parts` (`definy.json-wasi-io-parts`) を渡し, `src/wasi_io.ts` の `runWasiIo` で `done` まで動かす
   (`definy_run_io` と同じもの)。`get_parts` には `parts` で答える

- プログラム (Wasm) はブラウザがコンパイルして送る。管理者だけなので, 任意の Wasm を動かしてよいとした (管理者は手元のサーバーの持ち主)
- `parts` はブラウザ (`collectServerRunParts`, `src/run_expression.ts`) が式から参照をたどれる全てのパーツ
  (quote の中と型パーツの宣言の中もたどる。`get_parts` が quote したコードのパーツを読むため)。作業中の変更もそのまま送る
- 送る式は `encodeCborItem` (`src/cbor.ts`) の CBOR。サーバーは `decodeCborItem` で JSON AST に戻す

## MCP の `definy_run_io`

HTML の UI (手元のサーバーが配る html-ui) と AI のクライアントは MCP の `definy_run_io` でサーバーで動かす ([local-server.md](local-server.md))。

- `definy.mcp-run-io` は `run_expressions` に加えて, **MCP のアカウント (`read_mcp_account`) が管理者か** を確かめ,
  そうでなければ `Only the administrators of this server (DEFINY_ADMIN_ACCOUNT_IDS) can run I/O programs on it` のエラー。
  確かめた後の型検査・パーツ集め・コンパイル・実行は `definy.mcp-run-io-checked`
- 手元のサーバーの MCP のアカウントは自分の鍵のアカウントなので, いつも管理者 (上)。`/mcp` はトークン (`mcp-token`) を持つ人だけが呼べる

## UI

- React の UI (`src/components/RunPanel.tsx`): 実行パネルのヘッダーの「I/O の実行」で **ブラウザ / サーバー** を選ぶ。設定画面
  (`pages/settings.tsx`) の「プログラムを実行する場所」と同じ値 (`definy.wasi-io-settings` の `runLocation`)。
  サーバーは `GetRunOptions` が両方 `true` のときだけ選べ, そうでなければブラウザで動かす (`src/state/useRunOptions.ts`)。
  公開サイト (Cloudflare) は `serverRun: false` なので, 今はいつもブラウザ
- ブラウザで動かすとき, Cloudflare の API のように CORS を許可しない相手には届かない (仲介は無い)。
  そういうプログラム (`html-ui.deploy` など) は手元のサーバーの html-ui か MCP の `definy_run_io` で動かす
- html-ui (definy のストア) の「I/O を実行」は MCP の `definy_run_io` (サーバー)。html-ui でブラウザで動かす方法はまだ無い
  (ブラウザでコンパイルし, 値の読み書きをする JavaScript の土台が要る)

## テスト

- `worker/service_io.test.ts`: `RunService/RunIo` の認可 (署名なし 401, 管理者でない 403, 実行できないサーバー 400) と `run_wasi_io` に渡すもの,
  `GetRunOptions`, 署名の検証 (`Authorization の署名は definy が確かめる`)
- `worker/run_service.test.ts`: ブラウザ側の `fetchRunOptions` / `runIoOnServer` を Worker の処理につなぎ, Node.js のサーバーと
  Cloudflare (実行の能力なし) の違い, `HttpProxyService/Fetch` が 404 になったこと
- `cli/serve.test.ts`: 手元のサーバーで `definy_compile_expression` したプログラムを `RunService/RunIo` で動かす (自分の鍵のアカウントは管理者,
  他のアカウントは断られる)
- `src/run_expression.test.ts`: `runOnServer` を渡すとブラウザでは HTTP を送らずサーバーに送ること, `collectServerRunParts`
