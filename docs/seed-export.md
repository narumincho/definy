# seed の書き戻し (`export:seeds`)

UI でシステムアカウントとしてビルトインモジュール（`definy`, `core`, `std`, `wasi`, `sample`）のパーツを編集した後、稼働中の definy サーバーから最新コミットを取得してリポジトリの `seeds/*.json`（正本）に書き戻すコマンドです。

## 使い方

```bash
# ローカルで起動中のサーバーから seeds/ に書き戻す
npm run export:seeds http://localhost:8787

# 書き出し先ディレクトリを指定する場合
npm run export:seeds http://localhost:8787 path/to/seeds

# 直接 node で実行する場合
node scripts/export_seeds.ts http://localhost:8787 [outDir=seeds]
```

書き出しが完了したモジュール名が表示されます（例: `Successfully exported 5 modules to seeds: definy, core, std, wasi, sample`）。

## 環境変数（システムアカウント）

パーツ ID はシステムアカウントの公開鍵に依存するため、書き戻し時にパーツ参照を名前形式（`{"$part": "module.name"}`）へ復元するには、書き出し元サーバーと同じシステムアカウント鍵が必要です。鍵は次の優先順位で解決されます（詳細は [システムアカウントと seed の編集フロー](./system-account.md) を参照）。

1. `DEFINY_SYSTEM_ACCOUNT_PUBLIC_KEY`: サーバーのシステムアカウント公開鍵（32 バイト URL-safe Base64）
2. `DEFINY_SYSTEM_ACCOUNT_SECRET_KEY`: システムアカウント秘密鍵（公開鍵を自動導出）
3. 未設定時: リポジトリ組み込みの開発用鍵（`src/seed_parts.ts` の `devSystemAccountBytes`）

本番やステージング環境など、開発用鍵以外で稼働しているサーバーから書き戻す際は `DEFINY_SYSTEM_ACCOUNT_PUBLIC_KEY` または `DEFINY_SYSTEM_ACCOUNT_SECRET_KEY` を設定して実行してください:

```bash
DEFINY_SYSTEM_ACCOUNT_PUBLIC_KEY="<public_key>" npm run export:seeds https://definy.example.com
```

## 動作の流れ

1. Connect-RPC `POST {baseUrl}/definy.v1.EventService/GetEvents`（`{ eventType: "module_commit", limit: 500 }`）をページングして全件取得します。
2. 各イベントの Ed25519 署名を検証し、`account_id` がシステムアカウントで内容が `ModuleCommit` のものを抽出します。モジュールごとにイベント時刻が最新のコミットを採用します。他アカウントのコミットは無視されます。
3. 式を持たず content hash のみを持つパーツは、Connect-RPC `GetContent` で CAS から CBOR バイト列を取得して式を復元します（式を持つパーツの `content_hash` は seed に書き出しません）。
4. 書き出し後の全モジュール（新規追加されたパーツを含む）の「システムアカウント × モジュール名 × パーツ名」から導出した 32 バイトのパーツ ID 対応表を作成し、式や型定義の中の該当 ID を `{"$part": "module.name"}` に置き換えます。対応表にない ID はそのまま残します。
5. システムアカウントのコミットが見つからないモジュールの seed ファイルは書き換えません。ビルトインモジュール以外のモジュールは `npm run build:seeds` が読まないため書き出しません。
6. インデント 2、キー順序（トップレベル: `$schema`, `module_name`, `module_description`, `message`, `parts` / 各パーツ: `name`, `part_type`, `description`, `expression`）、末尾改行なしの形式で書き出します。

## 往復テスト (Roundtrip)

`seeds/*.json` の正規化形式の整合性を保証するため、Vitest (`src/seed_export.test.ts`) にて往復テストが自動実行されます。
現在の seed で初期化したプロセス内サーバーから書き出した結果が、既存の `seeds/{definy,core,std,wasi,sample}.json` と**バイト単位で完全一致**することを検証しています。

## 書き出し後の手順 (`npm run build:seeds`)

`seeds/*.json` を書き戻した後は、シードバンドルの指紋を更新してください:

```bash
npm run build:seeds
```

これにより `public/__definy_seed_bundle.json` (コミットしない) と `seeds/seed_bundle_fingerprint.json` (コミットする) が最新の seed から更新されます ([build-artifacts.md](build-artifacts.md))。
その後、`git status` や `git diff` で差分を確認してください。
