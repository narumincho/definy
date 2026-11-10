/**
 * 紹介スライドの並び・題・ずんだもんの台詞は definy の値 `story.slides` (seeds/store の story モジュール) で書く.
 * ここではそのパーツの式 (リテラル. `npm run build:seeds` が src/story/story_slides.generated.json に書き出す) を
 * その場で評価し, TypeScript の値に読み替える.
 * 値が `story.slide` の型に合うことは definy の型チェッカーが確かめている
 * (src/self_hosted_type_check.test.ts の「accepts every seed part」). ここでの読み替えは形が違えば例外にする.
 * スライドの絵は id ごとの React のコンポーネント (src/story/slides.tsx) が描く
 */
import storySlides from "./story_slides.generated.json" with { type: "json" };
import { variantOf } from "../definy_value.ts";
import { evaluateLiteral } from "../part_definition.ts";

/** 日本語・英語・エスペラントの同じ文 (`story.text`) */
export type Text = {
  readonly ja: string;
  readonly en: string;
  readonly eo: string;
};

/** 台詞を話すときのずんだもんの表情 (`story.face`) */
export type Face = "normal" | "happy" | "surprised" | "troubled";

const FACES: readonly Face[] = ["normal", "happy", "surprised", "troubled"];

/** スライドが現れるときのアニメーション (`story.transition`. src/story/story.css の .is-enter-*) */
export type SlideTransition =
  | "zoom"
  | "wipe-right"
  | "rise"
  | "flip"
  | "pop"
  | "iris"
  | "slide-left"
  | "wipe-down"
  | "spin"
  | "slide-right"
  | "blur"
  | "shrink";

const TRANSITIONS: readonly SlideTransition[] = [
  "zoom",
  "wipe-right",
  "rise",
  "flip",
  "pop",
  "iris",
  "slide-left",
  "wipe-down",
  "spin",
  "slide-right",
  "blur",
  "shrink",
];

/** ずんだもんの台詞 1 つ (`story.narration-line`) */
export type NarrationLine = {
  /** VOICEVOX に読ませる文 (英単語などはかなにする. `{デファイ'ニイワ}` のように {} の中にアクセント付きのかなも書ける) */
  readonly speech: string;
  /** 画面に出す日本語の字幕 (無ければ `speech`) */
  readonly subtitle?: string;
  readonly face: Face;
  /** 英語の字幕. 日本語の字幕の文と 1 つずつ対応させる. 英語の音声はこれをそのまま読ませる */
  readonly en: readonly string[];
  /** エスペラントの字幕. 日本語の字幕の文と 1 つずつ対応させる */
  readonly eo: readonly string[];
  /** エスペラントの音声で読ませる文 (`eo` と同じ数の文). 無ければエスペラントでも日本語の音声 */
  readonly eoSpeech?: readonly string[];
};

/** スライド 1 枚 (`story.slide`) */
export type SlideValue = {
  readonly id: string;
  readonly title: Text;
  /** 自動再生で このスライドに使う秒数 */
  readonly duration: number;
  /** 最初の表示の後に「次へ」で進むステップの数 */
  readonly steps: number;
  readonly transition: SlideTransition;
  /** ステップごとの台詞 (`steps + 1` 個. 無いステップは undefined) */
  readonly narration: ReadonlyArray<NarrationLine | undefined>;
};

function fail(path: string, expected: string): never {
  throw new Error(`story.slides${path}: ${expected} ではありません`);
}

function recordOf(
  value: unknown,
  path: string,
): Readonly<Record<string, unknown>> {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value) ||
    variantOf(value) !== undefined
  ) {
    fail(path, "レコード");
  }
  return value as Readonly<Record<string, unknown>>;
}

function stringOf(value: unknown, path: string): string {
  return typeof value === "string" ? value : fail(path, "文字列");
}

function numberOf(value: unknown, path: string): number {
  return typeof value === "number" ? value : fail(path, "数値");
}

function listOf<T>(
  value: unknown,
  path: string,
  item: (value: unknown, path: string) => T,
): readonly T[] {
  return Array.isArray(value)
    ? value.map((v, index) => item(v, `${path}[${index}]`))
    : fail(path, "リスト");
}

/** `none` なら undefined, `some(x)` なら x を読む */
function optionOf<T>(
  value: unknown,
  path: string,
  item: (value: unknown, path: string) => T,
): T | undefined {
  const tagged = variantOf(value);
  if (tagged?.tag === "none") {
    return undefined;
  }
  return tagged?.tag === "some"
    ? item(tagged.payload, `${path}.some`)
    : fail(path, "option");
}

/** 中身の無いタグ. definy のタグは _ で書き, TypeScript では - にする */
function tagOf<T extends string>(
  value: unknown,
  path: string,
  tags: readonly T[],
): T {
  const tagged = variantOf(value);
  const tag = tagged?.tag.replaceAll("_", "-");
  return tags.find((t) => t === tag) ?? fail(path, tags.join(" | "));
}

function textOf(value: unknown, path: string): Text {
  const record = recordOf(value, path);
  return {
    ja: stringOf(record["ja"], `${path}.ja`),
    en: stringOf(record["en"], `${path}.en`),
    eo: stringOf(record["eo"], `${path}.eo`),
  };
}

function narrationLineOf(value: unknown, path: string): NarrationLine {
  const record = recordOf(value, path);
  const subtitle = optionOf(record["subtitle"], `${path}.subtitle`, stringOf);
  const eoSpeech = optionOf(record["eo_speech"], `${path}.eo_speech`, (v, p) =>
    listOf(v, p, stringOf),
  );
  return {
    speech: stringOf(record["speech"], `${path}.speech`),
    ...(subtitle === undefined ? {} : { subtitle }),
    face: tagOf(record["face"], `${path}.face`, FACES),
    en: listOf(record["en"], `${path}.en`, stringOf),
    eo: listOf(record["eo"], `${path}.eo`, stringOf),
    ...(eoSpeech === undefined ? {} : { eoSpeech }),
  };
}

function slideOf(value: unknown, path: string): SlideValue {
  const record = recordOf(value, path);
  const steps = numberOf(record["steps"], `${path}.steps`);
  const narration = listOf(record["narration"], `${path}.narration`, (v, p) =>
    optionOf(v, p, narrationLineOf),
  );
  if (narration.length !== steps + 1) {
    fail(`${path}.narration`, `steps + 1 (${steps + 1}) 個のリスト`);
  }
  return {
    id: stringOf(record["id"], `${path}.id`),
    title: textOf(record["title"], `${path}.title`),
    duration: numberOf(record["duration"], `${path}.duration`),
    steps,
    transition: tagOf(record["transition"], `${path}.transition`, TRANSITIONS),
    narration,
  };
}

/** `story.slides` の式 */
function slidesExpression(): unknown {
  return storySlides.expression;
}

/** definy の値 `story.slides` */
export const STORY_SLIDES: readonly SlideValue[] = listOf(
  evaluateLiteral(slidesExpression()),
  "",
  slideOf,
);

/**
 * `story.slides` の中のスライド `id` の式 (レコードのリテラル) から, `keys` の項目だけを残した式.
 * スライドの中で自分自身の値を見せるのに使う
 */
export function slideExpression(id: string, keys: readonly string[]): unknown {
  const items = (slidesExpression() as { "#list": unknown[] })["#list"];
  for (const item of items) {
    const fields = (
      item as {
        "#record": ReadonlyArray<{ key: string; value: unknown }>;
      }
    )["#record"];
    const idField = fields.find((f) => f.key === "id")?.value as
      { "#string"?: unknown } | undefined;
    if (idField?.["#string"] === id) {
      return { "#record": fields.filter((f) => keys.includes(f.key)) };
    }
  }
  throw new Error(`story.slides にスライド ${id} がありません`);
}
