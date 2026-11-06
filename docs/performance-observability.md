# パフォーマンス確認の仕組み

提出 (SubmitEvent) が遅いときに、どこで時間を使っているかを
調査のたびに計装し直さずに確認できるようにする仕組み。
2026-11-06 のパス別測定 ([pipeline-indexing.md](pipeline-indexing.md) の
フォローアップ) が動機で、そのときは `worker/service_io.ts` に一時計装を入れて
測っては戻していた。

## 記録するもの

対象は `POST /definy.v1.EventService/SubmitEvent` のリクエストだけ。
読み取りのリクエスト (GetEvents など) では D1 に一切書かないという
ストアの決まり (`worker/d1.test.ts` が守っている) があり、
記録の書き込みでそれを破らないため。ページや静的アセットも対象外。

1 リクエストにつき 1 件の記録が残る。内容は、2026-11-06 の測定 (Phase 1) と
同じ粒度の service-io セグメント別の内訳:

- `method` / `path` / `status` (definy が決めた HTTP ステータス。
  例外で終わったときは `null`)
- `startedAtMs` (処理を始めた時刻)
- `totalWasmMs` / `totalHostMs` (セグメントの合計)
- `segments`: service-io の要求のタグごとの `{ tag, count, wasmMs, hostMs }`
  - `wasmMs`: その要求に応答してから次の要求が出るまでの wasm の実行時間
    (`then` の呼び出し時間)。最初の呼び出しはタグ `entry`
  - `hostMs`: その要求をホストが行うのにかかった時間
    (値の変換・DB・署名検証など)
  - 終端の `respond` も 1 セグメントとして数える (時間は 0)

セグメントはタグ単位の集計で、個々の要求の列ではない。
どのタグの後ろの wasm が重いかを見るための粒度で、
タグの中でさらにフェーズを切り分けることはできない (将来の拡張を参照)。

## 記録の仕組みとオーバーヘッド

- `worker/service_io.ts` の `handleRequestInDefiny` が、ホストに
  `recordPerf` の受け口があるときだけ集計する (`ServiceIoPerfCollector`)。
  `callClosure` とホストの能力を薄く包んで `performance.now()` で測る。
  受け口が無ければ計装自体が入らず、従来と完全に同じ動きになる
- 受け口は `worker/index.ts` が SubmitEvent のときだけ渡す。
  実体は `worker/perf_store.ts` の `createPerfSink` で、書き込みは
  レスポンスを待たせないが、書き込みの Promise を ExecutionContext の
  `waitUntil` に登録し、レスポンスを返した後も完了まで実行されることを
  保証する。Workers では `waitUntil` に登録されていない非同期処理は
  レスポンス後に打ち切られ得る。当初は登録しておらず、ローカルでは
  記録が残るのに本番では有効化後の提出が 1 件も記録されなかったため、
  この形に改めた。ExecutionContext は `worker/index.ts` の fetch と
  Void の middleware (`middleware/01.definy.ts`) の両方の経路から
  `handleWorkerRequest` へ渡している。`waitUntil` が無い環境
  (テストなど) では投げっぱなしになる
- 記録の失敗 (D1 の障害など) が本体のリクエストを失敗させることは
  決してない。ただし握り潰しはせず `console.error` でログに残す
  (本番で記録が残らないときに、waitUntil 以外の原因でも追えるように)。
  集計側の例外も同様
- オーバーヘッドは、要求とホスト呼び出しごとに `performance.now()` を
  2 回呼ぶことと、リクエストの終わりに INSERT + 剪定の DELETE を
  1 バッチ書くことだけ。提出そのものが数十〜数千 ms の処理なので、
  測定誤差の範囲に収まる想定

## 保存先と保持ポリシー

D1 の `host_perf_records` テーブル。イベントや CAS とは別で、
`host_commit_cache` などと同じホスト私用のテーブル
(definy の処理からは見えないし、署名付きイベントでもない。
サーバーを入れ替えれば消える、運用データとしての位置づけ)。

保持は直近 200 件 (`PERF_RECORD_LIMIT`)。新しい記録を書くときに、
上限を超えた古い記録を同じバッチで消す。SubmitEvent だけが対象なので、
200 件でも通常の調査には十分な期間を覆う。

## 読み取り経路と認証

### エンドポイント

`GET /__definy/perf/recent-submits` (`worker/perf_store.ts` の
`handlePerfRecentRequest` を `worker/index.ts` が先に受ける)。

- クエリ: `limit` (省略時 20、最大 200)、`pathContains` (パスの部分一致)
- レスポンス: `{ records: [...] }` (新しい順)

ルーティングは definy が決めるのが原則だが、記録はホスト私用のデータで
definy のイベントとして表現できないため、このパスだけは例外的に
ホストが受ける (`/__definy_seed_bundle.json` というホスト都合の
パスが既にあるのと同じ扱い)。

### 認証: 環境変数の Bearer トークン

Worker の環境変数 `DEFINY_PERF_TOKEN` と一致する
`Authorization: Bearer <token>` を要求する。比較はタイミング差を
付けない形で行う。

- トークン未設定ならエンドポイント自体が無効で 404 を返す
- トークンが違えば 401

既存の署名付き RPC 認可 ([rpc-authorization.md](rpc-authorization.md)) に
乗せなかった理由: あの認可の検証はサーバーの definy の責務で、
ホストは本文・時刻・署名検証の能力を渡すだけ、という分担になっている。
perf の読み取りを RPC にするには、definy 側に新しい RPC と
記録を読むための service-io の能力を足すシード変更が要り、
ホスト私用のデータを読むためだけには見合わない。
代わりに、漏れてもイベントデータには触れない (時間の内訳だけ)
読み取り専用のトークンをホストの環境変数で管理する形にした。

本番で有効にするには、サーバー (secret) と MCP サーバーの両方に
同じ `DEFINY_PERF_TOKEN` を設定する。設定しなければ機能ごと無効で、
既存の動作には影響しない。

残課題: トークンのローテーションは再設定と再デプロイで行う前提。
管理者アカウントの署名で読めるようにするのは、definy 側に
管理用 RPC を足すときに合わせて検討する。

### MCP ツール

`definy_perf_recent_submits` (`mcp/tools.ts`) が主たる読み取り経路。
調査は AI エージェントが MCP 経由で行うのが主なので、ページ (UI) は
作らなかった。人が直接見る必要が出たら、このエンドポイントの上に
薄いページを足せばよい。

引数は `limit` と `allRequests`。既定では SubmitEvent の記録だけを返す
(`pathContains=SubmitEvent`)。

信頼モデル上の注意: この記録はイベントと違い署名検証の対象ではなく、
サーバーのホストの申告をそのまま返す運用データ。調査の当たりを付ける
ためのもので、検証済みデータのような信用の置き方はしない
([mcp.md](mcp.md) の読み取りの原則とは別扱いであることを明記する)。

## 将来の拡張

- **フェーズ境界のマーカー**: 2026-11-06 の測定で、最後のセグメント
  (read_cached_definitions の後) の中に約 430〜490ms (測定時の VM 換算) が
  分離できないまま残った。切り分けるには definy 側のフェーズ境界に
  service-io の要求を挟む計装が要る。常設の仕組みが入ったので、
  次はその境界を増やすかどうかが論点になる
- **プロジェクト/ブランチの付記**: 今の記録はパスと時刻だけで、
  どのプロジェクトの提出かは分からない。対象はイベントの時刻と
  突き合わせれば特定できるが、よく使うなら記録に含めたい。
  提出イベントの project/branch は definy 側にしか無いので、
  渡し方 (service-io の能力の追加) の設計が要る
- **対象リクエストの拡大**: 読み取り系も記録したくなったら、
  D1 に書かない方式 (isolate 内の集計 + 提出時にまとめて書く等) が要る
