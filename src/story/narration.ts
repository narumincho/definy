/**
 * 紹介スライドのずんだもんの解説.
 * 台詞は definy の値 `story.slides` (seeds/story.json) の各スライドの `narration` に, ステップの順に 1 つずつ書く
 * (無いステップは none). 要素が現れていくステップは短く (REVEAL_SECONDS) 済ませ, 全て表示したステップで話す.
 * `speech` は VOICEVOX に読ませる文 (英単語などはかなにする. 区切って読まれてしまう名前は
 * `{デファイ'ニイワ}` のように {} の中にアクセント付きのかなで書く. scripts/generate_story_voice.ts),
 * `subtitle` は画面に出す字幕 (none なら `speech`).
 * `en` / `eo` は英語・エスペラントの字幕. 英語の音声は `en` をそのまま読ませる (scripts/english_voice.ts), エスペラントの音声は `eo_speech`
 * (名前は読みどおりのつづりにする. definy → defajni. scripts/esperanto_voice.ts).
 * 字幕は 1 文ずつ出すので, 日本語の字幕と同じ数の文に分けて書く.
 * 変えたら `node scripts/generate_story_voice.ts` で音声を作り直す (docs/story.md)
 */

import type { LanguageCode } from "../types.ts";
import { STORY_SLIDES, type NarrationLine } from "./story_value.ts";

export type { Face, NarrationLine } from "./story_value.ts";

/** スライドの id ごとの, ステップの順の台詞 */
export const NARRATION: Readonly<
  Record<string, ReadonlyArray<NarrationLine | undefined>>
> = Object.fromEntries(
  STORY_SLIDES.map((slide) => [slide.id, slide.narration]),
);

export function narrationLine(
  slideId: string,
  step: number,
): NarrationLine | undefined {
  return NARRATION[slideId]?.[step];
}

/** 台詞のあるスライドか. 台詞のあるスライドでは, 台詞の無いステップを短くする */
export function slideHasNarration(slideId: string): boolean {
  return (NARRATION[slideId] ?? []).some((line) => line !== undefined);
}

/** 台詞を文 (。! ? で終わるまで) に分ける. 字幕は 1 文ずつ出す */
export function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[。！？!?])/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence !== "");
}

/**
 * 表示言語の字幕を文ごとに返す. 日本語は `subtitle` (無ければ `speech`) を文に分け,
 * 英語・エスペラントは書いてある配列をそのまま使う (どれも同じ数の文で, 音声の文の始まる時刻に合わせて切り替える)
 */
export function subtitleSentences(
  line: NarrationLine,
  lang: LanguageCode,
): readonly string[] {
  switch (lang) {
    case "ja":
      return splitSentences(line.subtitle ?? line.speech);
    case "en":
      return line.en;
    case "eo":
      return line.eo;
  }
}
