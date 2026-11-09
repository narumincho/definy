# seed のアカウントと編集の流れ

2026-11-09 から, ビルトインのプロジェクト (`definy`: `definy`, `core`, `std`, `wasi`, `wasm` / `sample` / `story`) の
`main` の作成者はアカウント **opus5.5** (`-mTiIcLsq3lHIa0dsT8Z_mo47RLkGLPjRHTbFDotcJ8`. 元の名前は narumincho) です。
seed はこのアカウントが署名したイベントそのもので, `seeds/store/` に置きます ([source-in-store.md](source-in-store.md))。

以前は開発用の **システムアカウント** (`DEV_SYSTEM_KEY_SEED`. 秘密鍵がリポジトリにあり誰でも署名できる) で
`npm run build:seeds` のたびに `seeds/*.json` から署名し直していました。今その鍵が使われるのは, 署名が不正なイベントの
サンプル ([invalid-signature-debug.md](invalid-signature-debug.md)) のなりすまし先のアカウント ID だけです。
環境変数 `DEFINY_SYSTEM_ACCOUNT_SECRET_KEY` と `npm run export:seeds` は無くしました。

- サーバー (Worker) は seed のアカウントの鍵を知りません。コンパイラ組み込みのパーツかどうかはモジュールやアカウントではなく
  パーツの定義 (式が `{"#builtin": ...}` か, 式の無い型パーツか. `isCompilerBuiltinPart`) で決まるので, 型検査に鍵は要りません。
- 鍵は UI の「アカウント作成」または `src/auth.ts` の `generateAccountCredentials` で作れる。

## seed のパーツ参照は名前で書く

`seeds/*.json` の中のパーツ ID は, 32 バイトの配列ではなく `{"$part": "core.expression"}` (`モジュール名.パーツ名`) で書きます。
読み込み時に `derive_module_part_id(derive_module_id(module), part)` で ID を導出します。パーツ ID はモジュール名とパーツ名だけで決まり,
アカウントによりません。

## 編集の流れ (移行の途中)

`seeds/*.json` を消すまでの間 ([source-in-store.md](source-in-store.md) の 4 段目) は, 今までどおり JSON を直してから
コミットにします。

1. `seeds/*.json` を直す
2. `npm run commit:seeds` (`scripts/commit_seeds.ts`): JSON と `seeds/store/heads.json` のコミットが違うプロジェクトを,
   そのコミットを親にした新しいコミットにして署名し, `seeds/store/` に書く。鍵は `$DEFINY_HOME/account.json`
   (無ければ `~/.definy/account.json`) で, main の作成者 (opus5.5) の鍵でないと断る。`--message` でコミットのメッセージ
3. `npm run build:seeds` で指紋 `seeds/seed_bundle_fingerprint.json` を更新してコミットする

JSON だけ直して 2 を忘れると `src/store_seed.test.ts` が落ちる。

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
