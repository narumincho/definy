# seed のアカウントと編集の流れ

2026-11-09 から, ビルトインのプロジェクト (`definy`: `definy`, `core`, `std`, `wasi`, `wasm` / `sample` / `story`) の
`main` の作成者はアカウント **opus5.5** (`-mTiIcLsq3lHIa0dsT8Z_mo47RLkGLPjRHTbFDotcJ8`. 元の名前は narumincho) です。
seed はこのアカウントが署名したイベントそのもので, `seeds/store/` に置きます ([source-in-store.md](source-in-store.md))。

以前は開発用の **システムアカウント** (秘密鍵がリポジトリにあり誰でも署名できる) で
`npm run build:seeds` のたびに `seeds/*.json` から署名し直していました。2026-11-10 にその鍵 (`src/system_account.ts`),
`seeds/*.json`, 環境変数 `DEFINY_SYSTEM_ACCOUNT_SECRET_KEY`, `npm run export:seeds` / `commit:seeds` を全て無くしました。
署名が不正なイベントのサンプル ([invalid-signature-debug.md](invalid-signature-debug.md)) は opus5.5 になりすまします。

- サーバー (Worker) は seed のアカウントの鍵を知りません。コンパイラ組み込みのパーツかどうかはモジュールやアカウントではなく
  パーツの定義 (式が `{"#builtin": ...}` か, 式の無い型パーツか. `isCompilerBuiltinPart`) で決まるので, 型検査に鍵は要りません。
- 鍵は UI の「アカウント作成」または `src/auth.ts` の `generateAccountCredentials` で作れる。

## テストで式を手で書くとき

テストの中で式を書くときは, パーツ ID を `{"$part": "core.expression"}` (`モジュール名.パーツ名`) と書き,
`resolvePartPlaceholders` (`src/seed_parts.ts`) で ID にできます。パーツ ID はモジュール名とパーツ名だけで決まり,
アカウントによりません。ビルトインのパーツを読むのは `loadSeedModule` / `loadSeedModules` / `loadSeedPartExpressions`
(どれも `seeds/store/` の `heads.json` のコミット)。

## 編集の流れ

正本は `seeds/store/` (opus5.5 の署名) なので, 変えるには opus5.5 の鍵が要ります
(`$DEFINY_HOME/account.json`. 無ければ `~/.definy/account.json`)。手順は [source-in-store.md](source-in-store.md) の「編集の流れ」。

## 古い seed の時刻

以前の seed のイベントは時刻 `2019-01-31T04:36:01Z` (リポジトリの最初のコミット) から 1 秒以内に置いていました。
今もその範囲にあるのは署名が不正なサンプルだけで, 同期 (`definy.sync-is-seed-event`) はこの範囲のイベントを送らない。

## D1 の seed の入れ替え

`npm run build:seeds` は seed バンドルの指紋 (全イベントのハッシュと全 CAS の内容の SHA-256, `src/seed_fingerprint.ts`) を
`public/__definy_seed_bundle.json` と `seeds/seed_bundle_fingerprint.json` に書き, Worker はビルド時に後者を取り込みます。
Worker は isolate ごとに 1 回, D1 に記録した指紋 (`cas_contents` のキー `seed-bundle-fingerprint`) と比べ,
違えば seed バンドルを読んで D1 を入れ替えます (definy の `definy.ensure-seeded`。[database.md](database.md))。
一致していればコールドスタートでも seed バンドルは読みません。

入れ替え (`definy.store-seed-statements`) では, **古い seed の時刻 (上) のイベントのうち新しい seed に無いものを削除** し,
seed のイベントを `INSERT OR IGNORE` で入れます。それ以外のイベントは, seed のアカウントのものも残します
(seed は本物のイベントなので, 公開サーバーに push したコミットや html-ui のコミットを消さないため)。
2026-11-09 より前は「seed のアカウントのイベントのうち新しい seed に無いもの」を全て消していた。
CAS は上書きするので, ハッシュでないキー (`stage1` や事前コンパイルの `stage1-output:*`) も新しい seed の内容になります。
