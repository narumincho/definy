/**
 * 紹介スライドのずんだもんの解説 (日本語だけ).
 * スライドの id ごとに, ステップの順に 1 つずつ台詞を書く (無いステップは undefined).
 * `speech` は VOICEVOX に読ませる文 (読み方を直したいときはここをかなにする),
 * `subtitle` は画面に出す字幕 (省略すると `speech`).
 * 変えたら `node scripts/generate_story_voice.ts` で音声を作り直す (docs/story.md)
 */

export type Face = "normal" | "happy" | "surprised" | "troubled";

export type NarrationLine = {
  readonly speech: string;
  readonly subtitle?: string;
  readonly face?: Face;
};

export const NARRATION: Readonly<
  Record<string, ReadonlyArray<NarrationLine | undefined>>
> = {
  title: [
    {
      speech:
        "こんにちは、ずんだもんなのだ。今日は、デファイニーっていうプログラミング言語を紹介するのだ。シンプルな純粋関数型の、ビジュアルプログラミング言語なのだ！",
      subtitle:
        "こんにちは、ずんだもんなのだ。今日は definy (デファイニー) っていうプログラミング言語を紹介するのだ。シンプルな純粋関数型の、ビジュアルプログラミング言語なのだ!",
      face: "happy",
    },
  ],
};

export function narrationLine(
  slideId: string,
  step: number,
): NarrationLine | undefined {
  return NARRATION[slideId]?.[step];
}
