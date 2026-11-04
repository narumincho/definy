# 紹介スライド (/about/story)

definy の紹介とこれからの計画を見せるスライド。[/about](../pages/about.tsx) のボタンから開く。LT などの発表でもそのまま使う。

## ファイル

| ファイル                                                  | 役割                                                     |
| --------------------------------------------------------- | -------------------------------------------------------- |
| [pages/about/story.tsx](../pages/about/story.tsx)         | ページ                                                   |
| [src/story/slides.tsx](../src/story/slides.tsx)           | スライドの内容 (`SLIDES`). 文は日本語と英語              |
| [src/story/StoryPlayer.tsx](../src/story/StoryPlayer.tsx) | 再生 (手送り・自動再生・全画面・キー操作)                |
| [src/story/audio.ts](../src/story/audio.ts)               | 効果音と BGM. Web Audio API で合成し, 音声ファイルは無い |
| [src/story/story.css](../src/story/story.css)             | 見た目                                                   |

## 操作

既定は手で送る。

| キー                         | 動作                                     |
| ---------------------------- | ---------------------------------------- |
| → / Space / Enter / クリック | 次へ (スライドの中の要素 → 次のスライド) |
| ←                            | 戻る                                     |
| A                            | 自動再生の切り替え                       |
| S                            | 効果音の切り替え (既定 オン)             |
| B                            | BGM の切り替え (既定 オフ)               |
| F                            | 全画面                                   |

効果音と BGM の設定は localStorage (`definy-story-sound`) に覚える。
ブラウザは利用者の操作の後でないと音を出させないので, 最初のクリックやキーで AudioContext を作る。

## スライドの書き方

- 1 枚は `steps` 回の「次へ」で `<Reveal at={n}>` の要素が順に現れる。`at={0}` は最初から出る。
- 自動再生では `duration` 秒をステップの数 + 1 で割った間隔で進む。全体は 5 分 (290 秒) にしてある。
- 大きさは全て `em` で書く。`.story-slide` の 1em はスライドの幅の 1/80 (`1.25cqw`) なので, 全画面でも同じ見た目のまま大きくなる。
- `prefers-reduced-motion` では main.css が animation を全て消すので, `.story-reveal.is-on` は animation が無くても表示される形にしてある。
- エスペラントの文は用意していないので, `lang=eo` では英語を出す。

## 数値の出どころ

- 年ごとのコミット数・言語の移り変わり: `git log` (2026-11-04 時点, 4,040 コミット)。
  主な言語は 2019〜2020 Elm, 2020〜2022 TypeScript + PureScript, 2023〜2025 Deno・Flutter (Dart) などを試す, 2026 Rust → definy 製コンパイラ (2026-10-18 に Rust 製の stage0 を削除)。
- definy で書いたパーツの数: `seeds/*.json` の `parts` の合計 (869)。
- セルフホストの到達状況: [self-hosting.md](self-hosting.md)。
- セルフホストを終える目標の時期 (`SELF_HOSTING_TARGET`) は仮の値。
