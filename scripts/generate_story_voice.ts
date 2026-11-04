/**
 * 紹介スライド (/about の上) のずんだもんの解説音声を VOICEVOX ENGINE で作る.
 *
 *   node scripts/generate_story_voice.ts
 *
 * - VOICEVOX を起動しておく (ENGINE が http://127.0.0.1:50021 で待ち受ける. VOICEVOX_URL で変えられる)
 * - 台詞は src/story/narration.ts. 文・話者・話速が同じ音声は作り直さない.
 *   `{デファイ'ニイワ}` のように {} で囲んだところは, アクセント付きのかなとして読ませる
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
import { NARRATION } from "../src/story/narration.ts";
import type { MouthShape, VoiceClip } from "../src/story/voice_manifest.ts";

const ENGINE_URL = process.env["VOICEVOX_URL"] ?? "http://127.0.0.1:50021";
/** ずんだもん (ノーマル) */
const SPEAKER = 3;
const SPEED_SCALE = 1.15;
/** 音声の作り方 (buildQuery など) を変えたら上げる. 全ての音声を作り直す */
const SYNTHESIS_VERSION = 2;

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

/**
 * 台詞から audio_query を作る. `{...}` の中は AquesTalk 風のかな (`デファイ'ニイワ` のように ' がアクセントの位置) として読み,
 * 外は普通の文として読む. VOICEVOX が名前を区切って読んでしまうもの (definy, ナルミンチョ など) は {} で書く
 */
async function buildQuery(speech: string): Promise<AudioQuery> {
  const query = (await (
    await engine(
      `/audio_query?speaker=${SPEAKER}&text=${encodeURIComponent("あ")}`,
      {
        method: "POST",
      },
    )
  ).json()) as AudioQuery;
  const phrases: AccentPhrase[] = [];
  for (const [index, part] of speech.split(/\{([^}]*)\}/).entries()) {
    if (part === "") {
      continue;
    }
    // split の奇数番目が {} の中
    const added = await accentPhrases(part, index % 2 === 1);
    // 文の終わり (。など) で区切ると最後の息継ぎが付かないので, 次の区切りとの間に足す
    const last = added[added.length - 1];
    const ending = /[。！？!?]$/.test(part)
      ? 0.45
      : /[、,]$/.test(part)
        ? 0.25
        : 0;
    if (last !== undefined && last.pause_mora === null && ending > 0) {
      added[added.length - 1] = {
        ...last,
        pause_mora: {
          text: "、",
          pitch: 0,
          consonant: null,
          consonant_length: null,
          vowel: "pau",
          vowel_length: ending,
        },
      };
    }
    phrases.push(...added);
  }
  query.accent_phrases = phrases;
  return query;
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
      const file = `${key}.m4a`;
      const output = join(VOICE_DIR, file);

      const query = await buildQuery(line.speech);
      query.speedScale = SPEED_SCALE;
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
        console.log(`作った: ${slideId}/${step} → ${file}`);
      }
      clips[`${slideId}/${step}`] = {
        file: `/story/voice/${file}`,
        duration: Math.round(wavDuration(wav) * 1000) / 1000,
        mouth: mouthTimeline(query),
      };
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
 * VOICEVOX ENGINE ${version}, 話者 ${SPEAKER} (ずんだもん ノーマル), 話速 ${SPEED_SCALE}
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
};

/** キーは \`スライドの id/ステップ\` */
export const VOICE_CLIPS: Readonly<Record<string, VoiceClip>> = ${JSON.stringify(clips, null, 2)};
`,
  );
  console.log(`${Object.keys(clips).length} 個の音声 → ${MANIFEST_PATH}`);
}

await main();
