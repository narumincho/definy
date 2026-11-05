/**
 * 紹介スライド (/about の上) のずんだもんの解説音声を VOICEVOX ENGINE で作る.
 *
 *   node scripts/generate_story_voice.ts
 *
 * - VOICEVOX を起動しておく (ENGINE が http://127.0.0.1:50021 で待ち受ける. VOICEVOX_URL で変えられる)
 * - 台詞は definy の値 `story.slides` (seeds/story.json. src/story/narration.ts が読む). 文・話者・話速が同じ音声は作り直さない.
 *   `{デファイ'ニイワ}` のように {} で囲んだところは, アクセント付きのかなとして読ませる
 * - 英語の音声は英語の字幕 (`en`) をそのまま読ませる (数字と読み違える語だけ直す. scripts/english_voice.ts).
 *   エスペラントの音声は `eoSpeech` (scripts/esperanto_voice.ts)
 * - 出力: public/story/voice/*.m4a (macOS の afconvert で AAC にする) と
 *   src/story/voice_manifest.ts (長さと口の形の時刻)
 * - VOICEVOX:ずんだもん の表記が必要 (https://zunko.jp/con_ongen_kiyaku.html)
 */
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readdir, rm, writeFile, access } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { promisify } from "node:util";
import { NARRATION, splitSentences } from "../src/story/narration.ts";
import { ENGLISH_SPEED_SCALE, englishSpeech } from "./english_voice.ts";
import { ESPERANTO_SPEED_SCALE, esperantoQuery } from "./esperanto_voice.ts";
import type { MouthShape, VoiceClip } from "../src/story/voice_manifest.ts";

const ENGINE_URL = process.env["VOICEVOX_URL"] ?? "http://127.0.0.1:50021";
/** ずんだもん (ノーマル) */
const SPEAKER = 3;
const SPEED_SCALE = 1.15;
/** 音声の作り方 (buildQuery など) を変えたら上げる. 全ての音声を作り直す */
const SYNTHESIS_VERSION = 3;
/** エスペラントの読ませ方 (scripts/esperanto_voice.ts) を変えたら上げる. エスペラントの音声を作り直す */
const ESPERANTO_VERSION = 1;
/** 英語の読ませ方 (scripts/english_voice.ts) を変えたら上げる. 英語の音声を作り直す */
const ENGLISH_VERSION = 3;

const ROOT = resolve(import.meta.dirname, "..");
const VOICE_DIR = join(ROOT, "public", "story", "voice");
const MANIFEST_PATH = join(ROOT, "src", "story", "voice_manifest.ts");

type Mora = {
  readonly text?: string;
  readonly pitch?: number;
  readonly consonant: string | null;
  readonly consonant_length: number | null;
  readonly vowel: string;
  readonly vowel_length: number;
};

type AudioQuery = {
  accent_phrases: ReadonlyArray<{
    readonly moras: readonly Mora[];
    readonly pause_mora: Mora | null;
  }>;
  speedScale: number;
  prePhonemeLength: number;
  postPhonemeLength: number;
  outputSamplingRate: number;
  outputStereo: boolean;
};

function mouthOf(vowel: string): MouthShape {
  switch (vowel.toLowerCase()) {
    case "a":
    case "i":
    case "u":
    case "e":
    case "o":
      return vowel.toLowerCase() as MouthShape;
    case "n":
      return "n";
    default:
      // cl (っ), pau (息継ぎ)
      return "closed";
  }
}

/** audio_query のモーラの長さから, 口の形が変わる時刻 (秒, 話速を反映) を求める */
function mouthTimeline(query: AudioQuery): Array<[number, MouthShape]> {
  const result: Array<[number, MouthShape]> = [[0, "closed"]];
  let time = query.prePhonemeLength;
  const push = (shape: MouthShape): void => {
    const last = result[result.length - 1];
    if (last?.[1] !== shape) {
      result.push([Math.round((time / query.speedScale) * 1000) / 1000, shape]);
    }
  };
  for (const phrase of query.accent_phrases) {
    const moras =
      phrase.pause_mora === null
        ? phrase.moras
        : [...phrase.moras, phrase.pause_mora];
    for (const mora of moras) {
      if (mora.consonant !== null) {
        // 唇を閉じる子音
        if (["m", "b", "p", "my", "by", "py"].includes(mora.consonant)) {
          push("closed");
        }
        time += mora.consonant_length ?? 0;
      }
      push(mouthOf(mora.vowel));
      time += mora.vowel_length;
    }
  }
  push("closed");
  return result;
}

/** WAV の長さ (秒) */
function wavDuration(wav: Uint8Array): number {
  const view = new DataView(wav.buffer, wav.byteOffset, wav.byteLength);
  let offset = 12;
  let byteRate = 0;
  while (offset + 8 <= wav.byteLength) {
    const id = String.fromCharCode(...wav.subarray(offset, offset + 4));
    const size = view.getUint32(offset + 4, true);
    if (id === "fmt ") {
      byteRate = view.getUint32(offset + 16, true);
    } else if (id === "data") {
      return size / byteRate;
    }
    offset += 8 + size + (size % 2);
  }
  throw new Error("WAV に data チャンクがありません");
}

async function engine(path: string, init?: RequestInit): Promise<Response> {
  const response = await fetch(`${ENGINE_URL}${path}`, init).catch(
    (error: unknown) => {
      throw new Error(
        `VOICEVOX ENGINE (${ENGINE_URL}) に繋がりません. VOICEVOX を起動してください`,
        { cause: error },
      );
    },
  );
  if (!response.ok) {
    throw new Error(`${path}: ${response.status} ${await response.text()}`);
  }
  return response;
}

type AccentPhrase = AudioQuery["accent_phrases"][number];

async function accentPhrases(
  text: string,
  isKana: boolean,
): Promise<AccentPhrase[]> {
  return (await (
    await engine(
      `/accent_phrases?speaker=${SPEAKER}&is_kana=${isKana}&text=${encodeURIComponent(text)}`,
      { method: "POST" },
    )
  ).json()) as AccentPhrase[];
}

/** 息継ぎ (pau) のモーラ */
function pauseMora(length: number): Mora {
  return {
    text: "、",
    pitch: 0,
    consonant: null,
    consonant_length: null,
    vowel: "pau",
    vowel_length: length,
  };
}

/** 区切りの記号の後の息継ぎの長さ (秒) */
function pauseAfter(punctuation: string): number {
  return /[。！？!?.]$/.test(punctuation)
    ? 0.45
    : /[、,;:]$/.test(punctuation)
      ? 0.25
      : 0;
}

/**
 * 台詞 (文の配列) から audio_query を作る. `{...}` の中は AquesTalk 風のかな (`デファイ'ニイワ` のように ' がアクセントの位置) として読み,
 * 外は普通の文として読む. VOICEVOX が名前を区切って読んでしまうもの (definy, ナルミンチョ など) は {} で書く
 */
async function buildQuery(
  sentences: readonly string[],
  speedScale: number,
): Promise<{ query: AudioQuery; sentenceStarts: number[] }> {
  const query = (await (
    await engine(
      `/audio_query?speaker=${SPEAKER}&text=${encodeURIComponent("あ")}`,
      { method: "POST" },
    )
  ).json()) as AudioQuery;
  query.speedScale = speedScale;
  const phrases: AccentPhrase[] = [];
  /** 各文の最初のアクセント句の番号 */
  const sentenceFirstPhrase: number[] = [];
  /** 直前のアクセント句の後に息継ぎを足す (もう息継ぎがあれば足さない) */
  const pauseLast = (length: number): void => {
    const last = phrases[phrases.length - 1];
    if (last !== undefined && last.pause_mora === null && length > 0) {
      phrases[phrases.length - 1] = { ...last, pause_mora: pauseMora(length) };
    }
  };
  for (const [sentenceIndex, sentence] of sentences.entries()) {
    sentenceFirstPhrase.push(phrases.length);
    const parts = sentence.split(/\{([^}]*)\}/);
    for (const [index, rawPart] of parts.entries()) {
      // 英語では {} の後に読点などが続く ("{ハ'イ}, ..."). 記号だけのところは読ませず, 前の句の後の息継ぎにする
      const leading = /^\s*[,.!?;:]+\s*/.exec(rawPart)?.[0] ?? "";
      if (leading !== "" && sentenceFirstPhrase.at(-1) !== phrases.length) {
        pauseLast(pauseAfter(leading.trim()));
      }
      const part = rawPart.slice(leading.length);
      if (part === "") {
        continue;
      }
      // split の奇数番目が {} の中
      const added = await accentPhrases(part, index % 2 === 1);
      // 文の終わり (。など) で区切ると最後の息継ぎが付かないので, 次の区切りとの間に足す
      const isLastOfAll =
        sentenceIndex === sentences.length - 1 &&
        parts.slice(index + 1).every((rest) => rest === "");
      const last = added[added.length - 1];
      const ending = isLastOfAll ? 0 : pauseAfter(part.trimEnd());
      if (last !== undefined && last.pause_mora === null && ending > 0) {
        added[added.length - 1] = { ...last, pause_mora: pauseMora(ending) };
      }
      phrases.push(...added);
    }
  }
  query.accent_phrases = phrases;
  return {
    query,
    sentenceStarts: sentenceStartsOf(query, sentenceFirstPhrase),
  };
}

/** 各文の始まる時刻 (秒, 話速を反映). 字幕を 1 文ずつ出すのに使う */
function sentenceStartsOf(
  query: AudioQuery,
  sentenceFirstPhrase: readonly number[],
): number[] {
  const sentenceStarts: number[] = [];
  let time = query.prePhonemeLength;
  for (const [index, phrase] of query.accent_phrases.entries()) {
    if (sentenceFirstPhrase.includes(index)) {
      sentenceStarts.push(Math.round((time / query.speedScale) * 1000) / 1000);
    }
    const moras =
      phrase.pause_mora === null
        ? phrase.moras
        : [...phrase.moras, phrase.pause_mora];
    for (const mora of moras) {
      time += (mora.consonant_length ?? 0) + mora.vowel_length;
    }
  }
  return sentenceStarts;
}

/** audio_query から音声を合成して m4a にし (同じキーのものがあれば作り直さない), 一覧に載せる情報を返す */
async function synthesizeClip(
  query: AudioQuery,
  key: string,
  work: string,
  name: string,
  sentenceStarts: number[],
): Promise<VoiceClip> {
  const file = `${key}.m4a`;
  const output = join(VOICE_DIR, file);
  query.outputSamplingRate = 24000;
  query.outputStereo = false;
  const wav = new Uint8Array(
    await (
      await engine(`/synthesis?speaker=${SPEAKER}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(query),
      })
    ).arrayBuffer(),
  );
  if (!(await exists(output))) {
    const wavPath = join(work, `${key}.wav`);
    await writeFile(wavPath, wav);
    await promisify(execFile)("afconvert", [
      "-f",
      "m4af",
      "-d",
      "aac",
      "-b",
      "64000",
      wavPath,
      output,
    ]);
    console.log(`作った: ${name} → ${file}`);
  }
  return {
    file: `/story/voice/${file}`,
    duration: Math.round(wavDuration(wav) * 1000) / 1000,
    mouth: mouthTimeline(query),
    sentences: sentenceStarts,
  };
}

async function exists(path: string): Promise<boolean> {
  return access(path).then(
    () => true,
    () => false,
  );
}

async function main(): Promise<void> {
  const version = (await (await engine("/version")).json()) as string;
  await mkdir(VOICE_DIR, { recursive: true });
  const clips: Record<string, VoiceClip> = {};
  const work = join(tmpdir(), `definy-story-voice-${process.pid}`);
  await mkdir(work, { recursive: true });

  for (const [slideId, lines] of Object.entries(NARRATION)) {
    for (const [step, line] of lines.entries()) {
      if (line === undefined) {
        continue;
      }
      const key = createHash("sha256")
        .update(
          JSON.stringify([
            line.speech,
            SPEAKER,
            SPEED_SCALE,
            SYNTHESIS_VERSION,
          ]),
        )
        .digest("hex")
        .slice(0, 16);

      // 字幕にはかなの記法 ({...}) を書かない. 記法を使う台詞は subtitle を必ず書く
      const shown = line.subtitle ?? line.speech;
      if (shown.includes("{") || shown.includes("}")) {
        throw new Error(
          `${slideId}/${step}: 字幕に {} の読み方の記法が入っています. subtitle に普通の文を書いてください`,
        );
      }
      const subtitleSentences = splitSentences(shown);
      // 英語・エスペラントの字幕は日本語の字幕の文と 1 つずつ対応させ, 同じ時刻で切り替える
      for (const [lang, translated] of [
        ["en", line.en],
        ["eo", line.eo],
      ] as const) {
        if (translated.length !== subtitleSentences.length) {
          throw new Error(
            `${slideId}/${step}: ${lang} の字幕の文の数が日本語と違います (${translated.length} と ${subtitleSentences.length})`,
          );
        }
      }
      const { query, sentenceStarts } = await buildQuery(
        splitSentences(line.speech),
        SPEED_SCALE,
      );
      if (subtitleSentences.length !== sentenceStarts.length) {
        throw new Error(
          `${slideId}/${step}: 字幕と読み上げの文の数が違います (${subtitleSentences.length} と ${sentenceStarts.length})`,
        );
      }
      clips[`${slideId}/${step}`] = await synthesizeClip(
        query,
        key,
        work,
        `${slideId}/${step}`,
        sentenceStarts,
      );

      // 英語の音声. 英語の字幕をそのまま読ませる (scripts/english_voice.ts)
      const enKey = createHash("sha256")
        .update(
          JSON.stringify([
            "en",
            line.en,
            SPEAKER,
            ENGLISH_SPEED_SCALE,
            SYNTHESIS_VERSION,
            ENGLISH_VERSION,
          ]),
        )
        .digest("hex")
        .slice(0, 16);
      const en = await buildQuery(
        line.en.map(englishSpeech),
        ENGLISH_SPEED_SCALE,
      );
      clips[`en/${slideId}/${step}`] = await synthesizeClip(
        en.query,
        enKey,
        work,
        `en/${slideId}/${step}`,
        en.sentenceStarts,
      );

      // エスペラントの音声 (eoSpeech を書いた台詞だけ. scripts/esperanto_voice.ts)
      if (line.eoSpeech !== undefined) {
        if (line.eoSpeech.length !== line.eo.length) {
          throw new Error(
            `${slideId}/${step}: eoSpeech と eo の文の数が違います (${line.eoSpeech.length} と ${line.eo.length})`,
          );
        }
        const eoKey = createHash("sha256")
          .update(
            JSON.stringify([
              "eo",
              line.eoSpeech,
              SPEAKER,
              ESPERANTO_SPEED_SCALE,
              SYNTHESIS_VERSION,
              ESPERANTO_VERSION,
            ]),
          )
          .digest("hex")
          .slice(0, 16);
        const eo = await esperantoQuery(
          line.eoSpeech,
          SPEAKER,
          ESPERANTO_SPEED_SCALE,
        );
        const eoQuery = eo.query as unknown as AudioQuery;
        clips[`eo/${slideId}/${step}`] = await synthesizeClip(
          eoQuery,
          eoKey,
          work,
          `eo/${slideId}/${step}`,
          sentenceStartsOf(eoQuery, eo.sentenceFirstPhrase),
        );
      }
    }
  }
  await rm(work, { recursive: true, force: true });

  // 使わなくなった音声を消す
  const used = new Set(
    Object.values(clips).map((c) => c.file.split("/").pop()),
  );
  for (const name of await readdir(VOICE_DIR)) {
    if (name.endsWith(".m4a") && !used.has(name)) {
      await rm(join(VOICE_DIR, name));
      console.log(`消した: ${name}`);
    }
  }

  await writeFile(
    MANIFEST_PATH,
    `/**
 * 紹介スライドのずんだもんの解説音声の一覧. scripts/generate_story_voice.ts が作るので手で直さない.
 * VOICEVOX ENGINE ${version}, 話者 ${SPEAKER} (ずんだもん ノーマル), 話速 ${SPEED_SCALE} (英語 ${ENGLISH_SPEED_SCALE}, エスペラント ${ESPERANTO_SPEED_SCALE})
 */

/** 口の形. VOICEVOX のモーラの母音から決める */
export type MouthShape = "closed" | "a" | "i" | "u" | "e" | "o" | "n";

export type VoiceClip = {
  /** public からのパス */
  readonly file: string;
  /** 長さ (秒) */
  readonly duration: number;
  /** [時刻 (秒), 口の形] を時刻の順に */
  readonly mouth: ReadonlyArray<readonly [number, MouthShape]>;
  /** 各文 (字幕を 1 文ずつ出す) の始まる時刻 (秒) */
  readonly sentences: readonly number[];
};

/** キーは \`スライドの id/ステップ\` (日本語). 英語・エスペラントの音声は \`en/スライドの id/ステップ\` と \`eo/スライドの id/ステップ\` */
export const VOICE_CLIPS: Readonly<Record<string, VoiceClip>> = ${JSON.stringify(clips, null, 2)};
`,
  );
  console.log(`${Object.keys(clips).length} 個の音声 → ${MANIFEST_PATH}`);
}

await main();
