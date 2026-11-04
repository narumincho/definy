# 紹介スライド (/about/story)

definy の紹介とこれからの計画を見せるスライド。[/about](../pages/about.tsx) のボタンから開く。LT などの発表でもそのまま使う。

## ファイル

| ファイル                                                  | 役割                                                                                |
| --------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| [pages/about/story.tsx](../pages/about/story.tsx)         | ページ                                                                              |
| [src/story/slides.tsx](../src/story/slides.tsx)           | スライドの内容 (`SLIDES`) と関連プロジェクトのリンク (`PROJECTS`). 文は日本語と英語 |
| [src/story/timeline.ts](../src/story/timeline.ts)         | 再生位置 (秒) とスライド・ステップの対応                                            |
| [src/story/StoryPlayer.tsx](../src/story/StoryPlayer.tsx) | 再生 (シークバー・再生/一時停止・全画面・キー操作)                                  |
| [src/story/audio.ts](../src/story/audio.ts)               | 効果音と BGM. Web Audio API で合成し, 音声ファイルは無い                            |
| [src/story/story.css](../src/story/story.css)             | 見た目                                                                              |
| [public/story/logos/](../public/story/logos)              | 言語などのロゴ. [simple-icons](https://simpleicons.org/) 16.36.0 の SVG (CC0)       |

## 操作

YouTube のように再生位置 (`3:21 / 5:05`) を持つ。既定は止まった状態で, 手で送る。
シークバーのどこ (ステップの途中や, 全て表示された後でも) からでも再生を始められる。

| キー                                      | 動作                         |
| ----------------------------------------- | ---------------------------- |
| → / PageDown / Enter / スライドのクリック | 次のステップの先頭へ         |
| ← / PageUp                                | 前のステップの先頭へ         |
| Space / K                                 | 再生と一時停止               |
| J / L                                     | 5 秒戻る / 進む              |
| Home                                      | 最初へ                       |
| S                                         | 効果音の切り替え (既定 オン) |
| B                                         | BGM の切り替え (既定 オフ)   |
| F                                         | 全画面                       |

全画面 (F) でも操作 UI はスライドの下に常に出す。スライドは操作 UI の高さ (`--story-controls-height`) を除いた画面に 16:9 で収まる。

スライドの文字は選んでコピーできる。文字を選んでいるときのクリックと, リンクのクリックではスライドを進めない。
関連プロジェクトのリンクは新しいタブで開く。

効果音と BGM の設定は localStorage (`definy-story-sound`) に覚える。
ブラウザは利用者の操作の後でないと音を出させないので, 最初のクリックやキーで AudioContext を作る。

## スライドの書き方

- 1 枚は `steps` 回の「次へ」で `<Reveal at={n}>` の要素が順に現れる。`at={0}` は最初から出る。
- 再生すると `duration` 秒をステップの数 + 1 で等分した間隔で進む。全体は約 5 分 (305 秒)。
- ロゴは単色の SVG を CSS の mask にし, `PROJECTS` の `color` で塗る。ロゴの無いもの (nostr, Lean など) は名前だけ出す。
- 複数のサーバーの線は SVG の `preserveAspectRatio="none"` で伸ばすので, 線の上を進む光は円ではなく丸い端の短い破線で描く。
- 大きさは全て `em` で書く。`.story-slide` の 1em はスライドの幅の 1/80 (`1.25cqw`) なので, 全画面でも同じ見た目のまま大きくなる。
- `prefers-reduced-motion` では main.css が animation を全て消すので, `.story-reveal.is-on` は animation が無くても表示される形にしてある。
- エスペラントの文は用意していないので, `lang=eo` では英語を出す。

## 数値の出どころ

- 年ごとのコミット数・言語の移り変わり: `git log` (2026-11-04 時点, 4,040 コミット)。
  主な言語は 2019〜2020 Elm, 2020〜2022 TypeScript + PureScript, 2023〜2025 Deno・Flutter (Dart) などを試す, 2026 Rust → definy 製コンパイラ (2026-10-18 に Rust 製の stage0 を削除)。
- definy で書いたパーツの数: `seeds/*.json` の `parts` の合計 (869)。
- セルフホストの到達状況: [self-hosting.md](self-hosting.md)。
- セルフホストを終える目標の時期 (`SELF_HOSTING_TARGET`) は仮の値。
