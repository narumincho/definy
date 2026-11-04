# 紹介スライド (/about の上)

definy の紹介とこれからの計画を見せるスライド。[/about](../pages/about.tsx) の一番上に出す。LT などの発表でもそのまま使う (F で全画面)。
キー操作はスライドが画面に 4 割以上見えているとき (と全画面のとき) だけ受け付ける。

## ファイル

| ファイル                                                              | 役割                                                                                                                                                                                         |
| --------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [src/story/slides.tsx](../src/story/slides.tsx)                       | スライドの内容 (`SLIDES`) と関連プロジェクトのリンク (`PROJECTS`). 文は日本語と英語                                                                                                          |
| [src/story/timeline.ts](../src/story/timeline.ts)                     | 再生位置 (秒) とスライド・ステップの対応                                                                                                                                                     |
| [src/story/StoryPlayer.tsx](../src/story/StoryPlayer.tsx)             | 再生 (シークバー・再生/一時停止・全画面・キー操作)                                                                                                                                           |
| [src/story/audio.ts](../src/story/audio.ts)                           | 効果音と BGM (Web Audio API で合成) と解説音声の再生                                                                                                                                         |
| [src/story/narration.ts](../src/story/narration.ts)                   | ずんだもんの解説の台本 (日本語だけ)                                                                                                                                                          |
| [src/story/Narrator.tsx](../src/story/Narrator.tsx)                   | ずんだもんの立ち絵と字幕. 口の形・まばたき・表情                                                                                                                                             |
| [scripts/generate_story_voice.ts](../scripts/generate_story_voice.ts) | VOICEVOX ENGINE で解説音声を作る                                                                                                                                                             |
| [src/story/voice_manifest.ts](../src/story/voice_manifest.ts)         | 解説音声の一覧 (長さ・口の形の時刻). スクリプトが作るので手で直さない                                                                                                                        |
| [public/story/voice/](../public/story/voice)                          | 解説音声 (AAC, .m4a)                                                                                                                                                                         |
| [scripts/export_zundamon.ts](../scripts/export_zundamon.ts)           | 立ち絵の PSD から口・目・眉などのパーツを PNG に書き出す                                                                                                                                     |
| [src/story/zundamon_parts.ts](../src/story/zundamon_parts.ts)         | 立ち絵のパーツの位置. スクリプトが作るので手で直さない                                                                                                                                       |
| [public/story/zundamon/](../public/story/zundamon)                    | 立ち絵のパーツ (PNG)                                                                                                                                                                         |
| [src/story/story.css](../src/story/story.css)                         | 見た目                                                                                                                                                                                       |
| [public/story/logos/](../public/story/logos)                          | 言語などのロゴ. [simple-icons](https://simpleicons.org/) 16.36.0 の SVG (CC0). nostr だけは [nostr-logo](https://github.com/mbarulli/nostr-logo) の `nostr-icon-black-transparent.svg` (CC0) |

## 操作

YouTube のように再生位置 (`3:21 / 5:05`) を持つ。既定は止まった状態で, 手で送る。
シークバーのどこ (ステップの途中や, 全て表示された後でも) からでも再生を始められる。

| キー                 | 動作                                                     |
| -------------------- | -------------------------------------------------------- |
| → / PageDown / Enter | 次のステップの先頭へ                                     |
| ← / PageUp           | 前のステップの先頭へ                                     |
| Space / K            | 再生と一時停止                                           |
| J / L                | 5 秒戻る / 進む                                          |
| Home                 | 最初へ                                                   |
| S                    | 効果音の切り替え (既定 オン)                             |
| B                    | BGM の切り替え (既定 オフ)                               |
| V                    | ずんだもんの解説の切り替え (既定 オフ, 日本語のときだけ) |
| F                    | 全画面                                                   |

全画面 (F) でも操作 UI はスライドの下に常に出す。スライドは操作 UI の高さ (`--story-controls-height`) を除いた画面に 16:9 で収まる。

スライドの文字は選んでコピーできる。スライドのクリックでは進めない (文字の選択やリンクのため)。
シークバーには, スライドの中で要素が現れる (アニメーションが入る) 時刻に小さな点を出す。
関連プロジェクトのリンクは新しいタブで開く。

効果音・BGM・解説の設定は localStorage (`definy-story-sound`) に覚える。
ブラウザは利用者の操作の後でないと音を出させないので, 最初のクリックやキーで AudioContext を作る。

## スライドの書き方

- 1 枚は `steps` 回の「次へ」で `<Reveal at={n}>` の要素が順に現れる。`at={0}` は最初から出る。
- 台詞の無いスライドは `duration` 秒をステップの数 + 1 で等分する。台詞のあるスライド (今は全て) は, 要素が現れるだけのステップを 1.2 秒 (`REVEAL_SECONDS`) で済ませ, 台詞のあるステップを「音声の長さ + 0.4 秒」にする。全体は 4:51。
- ロゴは単色の SVG を CSS の mask にし, `PROJECTS` の `color` で塗る。ロゴの無いもの (nostr, Lean など) は名前だけ出す。
- 署名付きイベントのスライドの図はノードの位置を割合 (`NETWORK_NODES`) で持ち, 線は全体に重ねた 1 つの SVG で描く。
  Alice (ライトユーザー) はブラウザからナルミンチョのサーバーへ直接, Bob (データを持ちたい人) は自分で建てたサーバー経由でつなぐ。
  ステップごとに: 公開鍵 = ユーザー ID → イベントが広がる → 悪意のあるサーバーは偽造できない → 削除だけできる → 自分のサーバーに残り, 控えから出し直せる。
- 線は SVG の `preserveAspectRatio="none"` で伸ばすので, 線の上を進む光は円ではなく丸い端の短い破線で描く。
- 大きさは全て `em` で書く。`.story-slide` の 1em はスライドの幅の 1/80 (`1.25cqw`) なので, 全画面でも同じ見た目のまま大きくなる。
- `prefers-reduced-motion` では main.css が animation を全て消すので, `.story-reveal.is-on` は animation が無くても表示される形にしてある。
- エスペラントの文は用意していないので, `lang=eo` では英語を出す。

## 数値の出どころ

- 月ごとのコミット数 (`COMMITS_BY_MONTH`)・最初のコミット (2019-01-31 13:36)・言語の移り変わり: `git log` (2026-11-04 時点, 4,043 コミット)。
  月ごとの数は `git log --format=%ad --date=format:%Y-%m | sort | uniq -c` で作り直せる。合計や年ごとの数はこの表から求める。
  主な言語は 2019-01〜2020-05 Elm, 2020-06〜2022-12 TypeScript + PureScript, 2023〜2025 Deno・Flutter (Dart) などを試す, 2026-01〜2026-09 Rust, 2026-10 から TypeScript + definy 製コンパイラ (2026-10-18 に Rust 製の stage0 を削除)。
- definy 自身で書いている割合 (セルフホストのスライドの円グラフ): `node scripts/measure_self_hosting.ts` が `src/story/self_hosting_stats.ts` に書く。
  言語が違うので「語の数」で比べた目安。TypeScript は src・worker・middleware・pages のテスト以外のファイルの, コメント・括弧・区切りを除いた識別子・キーワード・リテラル・演算子の数
  (.tsx と src/components・src/story・src/tree_layout・pages は UI として分ける)。definy は core・std・wasi・wasm・definy モジュールの組み込みでないパーツの, 式と型の木のノード (`#` のキー) の数。
  definy は ID・名前・リテラルの中身を数えないので少なめに出る。2026-11-04 は definy 32%, TypeScript (サーバー・ホスト) 24%, TypeScript (UI) 43% (UI を除くと definy 57%)。
- Cloudflare Workers へのデプロイは definy で書いたパーツ `definy.deploy-to-cloudflare-workers` が REST API v4 を呼んで行う ([cloudflare-workers.md](cloudflare-workers.md))。
- セルフホストの到達状況: [self-hosting.md](self-hosting.md)。
- セルフホストを終える目標の時期 (`SELF_HOSTING_TARGET`) は仮の値。

## ずんだもんの解説

VOICEVOX の音声をあらかじめ作って `public/story/voice/` に置き, 配信する (ブラウザから VOICEVOX は呼ばない)。

1. 台本は `src/story/narration.ts` に, スライドの id ごと・ステップの順に書く。語尾は「〜なのだ」。
   全てのスライドにある。要素を先に全部出してから話せるよう, 台詞は基本的にスライドの最後のステップに置く (署名付きイベントのスライドだけはステップごと)。
   `speech` は読ませる文 (definy は「デファイニー」のようにかなで書く), `subtitle` は字幕, `face` は表情。
2. VOICEVOX を起動して `node scripts/generate_story_voice.ts` を実行する。
   ENGINE (`http://127.0.0.1:50021`, `VOICEVOX_URL` で変えられる) の `/audio_query` → `/synthesis` で WAV を作り, macOS の `afconvert` で AAC にする。
   話者はずんだもん (ノーマル, ID 3), 話速 1.15。ファイル名は文・話者・話速・`SYNTHESIS_VERSION` のハッシュなので, 変えていない台詞は作り直さない。使わなくなった音声は消す。
   VOICEVOX が区切って読む名前は `{デファイ'ニイワ}` のように {} の中にアクセント付きのかな (AquesTalk 風) で書き, `/accent_phrases?is_kana=true` で読ませる。
   助詞もかなに含める ({} の外の「は」だけを読ませると「ハ」になる)。{} の前で文が終わるときは息継ぎ (pau) を足す。
   読み間違えやすかったもの: 行 → くだり (「ぎょう」と書く), 直和型 → なおかずがた, Deno → デノ (「ディーノ」と書く)。台詞を変えたら `audio_query` の `kana` で読みを確かめる。
3. `src/story/voice_manifest.ts` に長さと口の形の時刻が書かれる。口の形は audio_query のモーラの母音 (a i u e o, ん, m/b/p の子音で閉じる) から求める。

再生のしかた:

- 時間軸は解説音声のオン・オフによらず同じ (`buildTimeline` の `stepLength`)。オン・オフで再生位置がずれない。
- 次へ・戻るで移ったときは, 止まっていてもそのステップの解説を最初から鳴らす。
- 再生中のシークや再生の再開では, ステップの中の位置から鳴らす。止まっているときのシークでは鳴らさない。
- 解説の間は BGM を小さくする。
- 解説がオンのときはスライド全体を左上に 86% に縮め (`.story-slide-area`), 下を字幕, 右をずんだもんの場所にする。スライドの中は全て em なので縮めても崩れず, ずんだもんと重ならない。
- 「VOICEVOX:ずんだもん」の表記が必要 ([ずんだもんの音声ライブラリの利用規約](https://zunko.jp/con_ongen_kiyaku.html))。最後のスライドの下に, 立ち絵とロゴのクレジットと一緒に常に出す (解説がオンでも途中のスライドには出さない)。
- 解説がオンなら最初の操作で全ての音声を読み込み始める。読み込みが遅れた分は先から鳴らし, 時間軸とずらさない。

## ずんだもんの立ち絵

坂本アヒルさんの「ずんだもん立ち絵素材 V3.2」(基本版) を使う。ダウンロード元: <https://tachie.net/w/sC90rhbReJ>。
規約は「動画やアイコン等に自由に利用可, 改変・加工も可, クレジット表記は任意」([公式ガイドライン](https://zunko.jp/guideline.html) にも従う)。
クレジットは任意だが, 最後のスライドに「立ち絵: 坂本アヒル「ずんだもん立ち絵素材」」とダウンロード元へのリンクを出す。

素材そのもの (PSD) は配布物なのでリポジトリに入れない (`.gitignore` の `*.psd`)。書き出した PNG だけを置く。

```sh
# パーツを書き出す (public/story/zundamon/*.png と src/story/zundamon_parts.ts)
node scripts/export_zundamon.ts ~/Desktop/ずんだもん立ち絵素材V3.2/ずんだもん立ち絵素材V3.2_基本版.psd

# 口・目・眉のレイヤーを顔に重ねて並べた確認用の画像
node scripts/export_zundamon.ts <PSD> --preview <出力先>
```

- PSD を読むのは devDependency の [ag-psd](https://github.com/Agamnentzar/ag-psd)。canvas は使わず, `initializeCanvas` に画素の配列を作る関数だけを渡す。
  `useImageData: true` なら層の画素は読み込んだときに `layer.imageData` に入る (`getLayerImageData` は `useRawData` のときだけ要る)。PNG は `node:zlib` で自前で書く。
- レイヤーの名前は PSDTool の書き方。`!` で始まるグループは常に表示し, `*` で始まるレイヤーはその中から 1 つ選ぶ。`children` は下の層から順。
- 体 (体・腕「腰」・枝豆「枝豆通常」・顔色「ほっぺ基本」) を 1 枚にまとめ, その上に口・目・眉を重ねる。どれも 1/2 に縮小する。
- 口の形: 閉じ = ほほえみ, あ = ほあー, い = にやり, う = お, え = んえー, お = ほう, ん = んー。
- 表情: 通常 = 基本目 + 基本眉, 笑顔 = にっこり + 上がり眉, 驚き = 〇〇 + 上がり眉, 困り = 基本目 + 困り眉。まばたきは閉じ目 (笑顔のときはしない)。
- 画面には肩から上だけを出す (スライドを大きく見せるため)。話している間は動かさず (口とまばたきだけ), 解説ボタンでの登場と退出だけ下から出入りさせる (`is-leaving` の 350ms)。
- 台詞は漫画の吹き出し (`.story-bubble`) で出し, しっぽは吹き出しの上の方から, 右上のずんだもんの口へ少し上向きに出す (`clip-path` の三角形 2 枚)。字幕は 1 文ずつ出す: 生成スクリプトが文ごとにアクセント句を作って各文の始まる時刻を `voice_manifest.ts` の `sentences` に書き, 再生位置で切り替える (字幕と読み上げの文の数が違うとスクリプトがエラーにする)。

## スライドの切り替え

スライドごとに違う入り方をする (`SLIDES` の `transition`, story.css の `.is-enter-*`)。
タイトル: ズーム, 歴史: 左から拭く, バイブコーディング: 下から, 構造化編集: めくる, Scratch: 弾む, 署名付きイベント: 円が広がる,
比較: 右から, バージョン管理: 上から拭く, セルフホスト: 回る, デプロイ: 左から, 証明: ぼかし, おわりに: 小さいところから。
前のスライドは 700ms だけ下に残して薄れさせる (`LEAVING_SLIDE_MS`)。スライドごとに背景を持つので下が透けない。

## そのほかの部品

- Cloudflare Workers へのデプロイのスライドは, パーツ → definy 製コンパイラ → worker.js + app.wasm → REST API v4 → Workers の流れの図 ([cloudflare-workers.md](cloudflare-workers.md))。
- バージョン管理のスライドの上の図 (`CommitGraph`) は, main とブランチのコミットが取り込みで合流し, どのコミットもパーツの構文木をハッシュで指す (変わっていないものは共有する) ことを表す。

- 構造化編集のスライドの式は, エディタと同じ `expressionToLayoutNode` → `computeLayout` → `TreeLayoutRenderer` で描く (読むだけ)。
  ツリーの大きさは px で決まるので, 560px の幅で折り返したものをパネルの幅 (と `max-height`) に収まるよう `transform: scale` で拡大・縮小する。
- 最後のスライドの QR コード (`public/story/qr-definy.svg`, https://definy.narumincho.com/) は `npx qrcode@1.5.4 -t svg -e M -q 1 -o public/story/qr-definy.svg "https://definy.narumincho.com/"` で作った。
- 作者のアイコン (`public/story/narumincho.webp`) は narumincho の GitHub のアイコン。タイトルと, 歴史のグラフの最初のコミットに出す。
- 歴史のスライドの数は 2026-11-04 時点 (見出しにも書く)。作り直すスクリプトは作らない。
