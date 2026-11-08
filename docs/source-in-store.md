# 正本を seeds JSON から definy のストアへ移す

[mcp-self-hosting.md](mcp-self-hosting.md) の 4 段目の計画 (2026-11-08)。
今は `seeds/*.json` が definy / core / std / wasi / wasm / sample / story のパーツの正本で,
人間やエージェントが JSON を直接書き換え, `npm run build:seeds` が開発用のシステムアカウントの鍵で署名したイベントにする。
これを, **definy のストアのコミット (自分の鍵で署名したもの) を正本** にし,
変更は手元のサーバー (`npm run serve`) の MCP (`definy_commit_parts`) でするように変える。

## 今の seeds の使われ方 (2026-11-08 に調べた)

| 使う所                                                    | 何をしているか                                                                                                                         |
| --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `scripts/generate_seed_bundle.ts` (`npm run build:seeds`) | seeds を開発用のシステムアカウントの鍵で署名したイベント (2019-01-31T04:36:01Z から 1 秒) にし `public/__definy_seed_bundle.json` へ。 |
|                                                           | 同時に seeds のパーツを stage1 でコンパイルして `wasm/service.wasm` などサーバーの wasm 10 個を作る                                    |
| サーバー (Worker, 手元のサーバー)                         | `definy.ensure-seeded` が指紋の違う seed バンドルを D1 / SQLite に入れ, 新しい seed に無いシステムアカウントのイベントを消す           |
| `definy_pull` / `definy_push`                             | seed のイベントは同期しない (サーバーごとに自分の seed を入れるので)                                                                   |
| `scripts/regenerate_stage1.ts`                            | seeds の `core.compile-to-wasm` から `wasm/stage1.wasm` を作り直す                                                                     |
| `scripts/generate_value_decoders.ts`                      | 型パーツの宣言から `core.value-to-*` を生成し `seeds/core.json` に書き込む                                                             |
| `scripts/export_seeds.ts` (`npm run export:seeds`)        | サーバーのシステムアカウントの `main` の最新のコミットを seeds に書き戻す                                                              |
| Vitest のテスト約 15 個, `src/story/*`                    | `seeds/*.json` を直接読んでパーツを探す                                                                                                |
| `seeds/schemas/`, `scripts/generate_seed_schema.ts`       | seeds の JSON Schema (エディタでの手書き用)                                                                                            |

`html-ui` プロジェクトは既にストアだけで管理している ([html-ui.md](html-ui.md))。

## 問題

- システムアカウントの開発用の鍵はリポジトリにあって誰でも署名できる。今は seed のイベントを同期しないので害が無いが,
  正本をストアに置いて公開サーバーと同期するなら, 本当の持ち主の鍵で署名したコミットでないといけない
- サーバーの wasm (service.wasm など) はビルドのときに作るので, ビルド (GitHub Actions) がパーツを読める所に正本が要る
- 公開サーバー (Workers の無料プラン) は 1 回のリクエストの CPU が約 2 秒で止まる ([html-ui.md](html-ui.md))。
  definy プロジェクト全体 (パーツ約 1000) の最初のコミットを公開サーバーの `SubmitEvent` で型検査させると上限を超える見込み
- 言語の変更 (`core.expression` の形を変えるなど) をしたコミットは, 古いサーバーの型チェッカーでは通らない。
  今は seed を検査せずにストアに入れるので問題にならない

## 方針

1. **持ち主を narumincho のアカウントにする**。definy / sample / story のプロジェクトの `main` の作成者は
   アカウント narumincho (`-mTiIcLsq3lHIa0dsT8Z_mo47RLkGLPjRHTbFDotcJ8`. html-ui と同じ)。
   システムアカウントと開発用の鍵による seed の署名は無くす
2. **リポジトリには署名済みのイベントと中身をそのまま置く** (`seeds/store/`。手では書かない)。
   - `seeds/store/events/<イベントのハッシュ>` (署名済みの `SignedEvent` の CBOR) と
     `seeds/store/contents/<中身のハッシュ>` (パーツの定義の式の CBOR)。
     内容アドレスのファイルなので, 変わらないパーツは git でも同じファイルのまま
   - `seeds/store/heads.json`: プロジェクトごとに, ビルドに使う `main` のコミットのハッシュ
   - 中身はアカウント作成と, 各プロジェクトの `main` の先頭までのコミット (と使う中身)。
     ストア (手元のサーバー) から `npm run export:store` (仮) で書き出す
3. **ビルドは `seeds/store/` から読む**。`npm run build:seeds` は署名し直さず, そのイベントをそのまま seed バンドルにし,
   `heads.json` のコミットのパーツからサーバーの wasm を作る。テストや scripts も `seeds/*.json` の代わりに
   同じ読み込み (`src/store_seed.ts` 仮) からパーツを探す
4. **サーバーは今と同じく seed バンドルを検査せずに入れる**。これで最初の大きなコミットや言語の変更も,
   公開サーバーの `SubmitEvent` の上限や古い型チェッカーを通らずに入る (検査はビルド前に手元のサーバーでしている)。
   seed のイベントは本物のイベントなので同期してよい (`definy.sync-is-seed-event` は消す)
5. **変更の流れ**: 手元のサーバーで `definy_commit_parts` → `npm run export:store` → PR (TypeScript の変更と一緒に)。
   マージされてデプロイされると公開サーバーにも入る。他の人は `definy_pull` で取り込める。
   main 以外のブランチでの試しは今の definy のブランチの仕組みで, 公開サーバーに push してよい

GitHub はビルドの入力 (どのコミットを使うか) を決める場所として残り, 正本の編集は definy のストアでする。
Git でいう「サブモジュールのコミットを固定する」のに近い。html-ui はビルドに要らないので今どおり seeds に置かない。

### 他の案

- **ビルドが公開サーバーから読む** (リポジトリには `heads.json` のハッシュだけ): リポジトリは小さいが, CI が公開サーバーに頼り,
  PR のコミットを先に公開サーバーへ push する必要があり, 上の CPU の上限と言語の変更の問題に当たる
- **今の `export:seeds` の JSON をそのまま使う**: 手で書けてしまい正本が 2 つになる。署名が手元の鍵と合わない

## 段階

1. この計画 (docs) — この PR
2. 読み書きの道具: `seeds/store/` の形式, ストアから書き出す `npm run export:store`, そこから seed バンドルとパーツを読む
   `src/store_seed.ts`。この段では `seeds/*.json` から作った seed とバイト単位で同じパーツになることをテストで確かめる
3. 移行: seeds の JSON の内容を narumincho の鍵で手元のストアにコミットし (アカウント作成 + プロジェクトごとに 1 コミット),
   `seeds/store/` に書き出す。ビルドとテストの読み込みを `seeds/store/` に切り替え, システムアカウントの seed と
   `definy.sync-is-seed-event` を消す
4. 片付け: `seeds/*.json`, `seeds/schemas/`, `export:seeds`, `generate_seed_schema.ts`, 開発用のシステムアカウントの鍵を消す。
   `generate_value_decoders.ts` と `regenerate_stage1.ts` はストアのパーツを読み, 生成したパーツを手元のサーバーにコミットする形にする。
   CLAUDE.md の「正本は seeds/\*.json」を書き換える
5. 公開サーバーへの反映: デプロイで seed の入れ替えが起き, システムアカウントの古いイベントが消えて narumincho のコミットが入る

## 気をつけること

- 手元のストアにはもうシステムアカウントの definy プロジェクトがあるので, 移行は新しい `DEFINY_HOME` で始める
  (古いコミットの上には narumincho はコミットできない: `not_branch_creator`)
- テスト (Vitest) が開発用の鍵でコミットを作っている所は,narumincho の鍵はリポジトリに置けないので,
  テストで作るコミットは別のテスト用のアカウントで, 別のプロジェクトにする
- エージェントがクラウドで core を変えるには narumincho の鍵が要る (今は project files にある)
