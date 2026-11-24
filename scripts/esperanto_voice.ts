/**
 * エスペラントの文を VOICEVOX (日本語の音声合成) に読ませる.
 *
 *   node scripts/esperanto_voice.ts <出力.wav> <話者 ID> "<エスペラントの文>"
 *
 * エスペラントは母音が 5 つで, つづりどおりに読み, アクセントは後ろから 2 番目の音節にあるので,
 * かな (AquesTalk 風の記法, ' がアクセント) に機械的に直せる. ただしかなにすると子音の連続
 * (pro, gr, lingvo の ng など) に母音が挟まって日本語らしくなるので, 補った母音は音素の段階で
 * 短くする (無声子音の後は無声化する). 強く読む母音は少し長くする.
 * - 名前などで読み方を変えたいときは, つづりを読みどおりに書く (definy → defajni)
 * - アクセントの位置を変えたいときは母音に ´ を付ける (á é í ó ú)
 * - l と r はどちらもラ行になる
 */
import { writeFile } from "node:fs/promises";

const ENGINE_URL = process.env["VOICEVOX_URL"] ?? "http://127.0.0.1:50021";
/** エスペラントは日本語 (1.15) より少しゆっくり読ませる */
export const ESPERANTO_SPEED_SCALE = 1.1;

type Mora = {
  text?: string;
  pitch: number;
  consonant: string | null;
  consonant_length: number | null;
  vowel: string;
  vowel_length: number;
};

type AccentPhrase = {
  moras: Mora[];
  accent: number;
  pause_mora: Mora | null;
};

/** かなにした 1 モーラ */
type EoMora = {
  readonly kana: string;
  /** 子音の連続に補った母音 (短く読む) */
  readonly epenthetic: boolean;
  /** 補った母音の前が無声子音 (母音を無声化する) */
  readonly voiceless: boolean;
};

/** アクセント句 (単語. 1 音節の語は次の語に付ける) */
type EoPhrase = {
  readonly moras: readonly EoMora[];
  /** 強く読むモーラの番号 (0 から) */
  readonly stressed: number;
  /** この句の後が読点 (,) か */
  readonly comma: boolean;
};

const VOWELS = new Set(["a", "e", "i", "o", "u"]);
const STRESSED_VOWELS: Readonly<Record<string, string>> = {
  á: "a",
  é: "e",
  í: "i",
  ó: "o",
  ú: "u",
};
const VOICELESS = new Set(["p", "t", "k", "s", "f", "ŝ", "ĉ", "c", "h", "ĥ"]);

/** 子音と母音の組をかなにする (VOICEVOX のかな記法で 1 モーラになるもの) */
const KANA: Readonly<
  Record<string, readonly [string, string, string, string, string]>
> = {
  //    a       e         i         o         u
  "": ["ア", "エ", "イ", "オ", "ウ"],
  b: ["バ", "ベ", "ビ", "ボ", "ブ"],
  c: ["ツァ", "ツェ", "ツィ", "ツォ", "ツ"],
  ĉ: ["チャ", "チェ", "チ", "チョ", "チュ"],
  d: ["ダ", "デ", "ディ", "ド", "ドゥ"],
  f: ["ファ", "フェ", "フィ", "フォ", "フ"],
  g: ["ガ", "ゲ", "ギ", "ゴ", "グ"],
  ĝ: ["ジャ", "ジェ", "ジ", "ジョ", "ジュ"],
  h: ["ハ", "ヘ", "ヒ", "ホ", "フ"],
  ĥ: ["ハ", "ヘ", "ヒ", "ホ", "フ"],
  j: ["ヤ", "イェ", "イ", "ヨ", "ユ"],
  ĵ: ["ジャ", "ジェ", "ジ", "ジョ", "ジュ"],
  k: ["カ", "ケ", "キ", "コ", "ク"],
  l: ["ラ", "レ", "リ", "ロ", "ル"],
  m: ["マ", "メ", "ミ", "モ", "ム"],
  n: ["ナ", "ネ", "ニ", "ノ", "ヌ"],
  p: ["パ", "ペ", "ピ", "ポ", "プ"],
  r: ["ラ", "レ", "リ", "ロ", "ル"],
  s: ["サ", "セ", "スィ", "ソ", "ス"],
  ŝ: ["シャ", "シェ", "シ", "ショ", "シュ"],
  t: ["タ", "テ", "ティ", "ト", "トゥ"],
  ŭ: ["ワ", "ウェ", "ウィ", "ウォ", "ウ"],
  v: ["ヴァ", "ヴェ", "ヴィ", "ヴォ", "ヴ"],
  z: ["ザ", "ゼ", "ズィ", "ゾ", "ズ"],
};
const VOWEL_INDEX: Readonly<Record<string, number>> = {
  a: 0,
  e: 1,
  i: 2,
  o: 3,
  u: 4,
};

function kana(consonant: string, vowel: string): string {
  const row = KANA[consonant];
  const index = VOWEL_INDEX[vowel];
  if (row === undefined || index === undefined) {
    throw new Error(`かなにできない音: ${consonant}${vowel}`);
  }
  return row[index];
}

/** 母音の無い子音 (子音の連続の前の方と語末) のモーラ. n はンにする */
function codaMora(consonant: string): EoMora {
  if (consonant === "n") {
    return { kana: "ン", epenthetic: false, voiceless: false };
  }
  return {
    kana: kana(consonant, "u"),
    epenthetic: true,
    voiceless: VOICELESS.has(consonant),
  };
}

/** 1 語をモーラに分け, 強く読むモーラの番号と音節の数を返す */
function wordMoras(word: string): {
  moras: EoMora[];
  stressed: number | undefined;
  syllables: number;
} {
  const letters = [...word.toLowerCase()];
  const moras: EoMora[] = [];
  /** 各母音のモーラの番号 */
  const vowelMoras: number[] = [];
  let explicitStress: number | undefined;
  let pending: string[] = [];
  for (let index = 0; index < letters.length; index += 1) {
    const raw = letters[index] ?? "";
    const vowel = STRESSED_VOWELS[raw] ?? raw;
    if (!VOWELS.has(vowel)) {
      pending.push(raw);
      continue;
    }
    const onset = pending.pop() ?? "";
    moras.push(...pending.map(codaMora));
    pending = [];
    if (STRESSED_VOWELS[raw] !== undefined) {
      explicitStress = vowelMoras.length;
    }
    vowelMoras.push(moras.length);
    moras.push({
      kana: kana(onset, vowel),
      epenthetic: false,
      voiceless: false,
    });
    // 母音の後の j と ŭ は二重母音 (次が母音なら次の音節の頭)
    const next = letters[index + 1];
    const afterNext = letters[index + 2];
    const nextIsVowel =
      afterNext !== undefined &&
      VOWELS.has(STRESSED_VOWELS[afterNext] ?? afterNext);
    if ((next === "j" || next === "ŭ") && !nextIsVowel) {
      moras.push({
        kana: next === "j" ? "イ" : "ウ",
        epenthetic: false,
        voiceless: false,
      });
      index += 1;
    }
  }
  moras.push(...pending.map(codaMora));
  const stressIndex =
    explicitStress ?? (vowelMoras.length >= 2 ? vowelMoras.length - 2 : 0);
  return {
    moras,
    stressed: vowelMoras[stressIndex],
    syllables: vowelMoras.length,
  };
}

/** 1 文をアクセント句に分ける. 1 音節の語 (mi, la, kaj など) は次の語と同じ句にする */
export function esperantoPhrases(sentence: string): EoPhrase[] {
  const tokens =
    sentence.match(/[a-zA-ZĉĝĥĵŝŭĈĜĤĴŜŬáéíóúÁÉÍÓÚ]+|[,.!?;:]/g) ?? [];
  const phrases: EoPhrase[] = [];
  let carried: EoMora[] = [];
  for (const [index, token] of tokens.entries()) {
    if (/^[,.!?;:]$/.test(token)) {
      const last = phrases[phrases.length - 1];
      if (token === "," && last !== undefined) {
        phrases[phrases.length - 1] = { ...last, comma: true };
      }
      continue;
    }
    const { moras, stressed, syllables } = wordMoras(token);
    const next = tokens[index + 1];
    const nextIsWord = next !== undefined && !/^[,.!?;:]$/.test(next);
    if (syllables <= 1 && nextIsWord) {
      carried = [...carried, ...moras];
      continue;
    }
    phrases.push({
      moras: [...carried, ...moras],
      // VOICEVOX のかな記法はどの句にもアクセントが要るので, 1 音節の語だけの句 (Elm, Bob など) もその母音に置く
      stressed: carried.length + (stressed ?? 0),
      comma: false,
    });
    carried = [];
  }
  return phrases;
}

/** アクセント句を VOICEVOX のかな記法にする (' はアクセント核. 強く読むモーラの後) */
export function phrasesToKana(phrases: readonly EoPhrase[]): string {
  return phrases
    .map((phrase, index) => {
      const text = phrase.moras
        .map(
          (mora, moraIndex) =>
            mora.kana + (moraIndex === phrase.stressed ? "'" : ""),
        )
        .join("");
      const separator =
        index === phrases.length - 1 ? "" : phrase.comma ? "、" : "/";
      return text + separator;
    })
    .join("");
}

async function engine(path: string, init?: RequestInit): Promise<Response> {
  const response = await fetch(`${ENGINE_URL}${path}`, init);
  if (!response.ok) {
    throw new Error(`${path}: ${response.status} ${await response.text()}`);
  }
  return response;
}

/** 補った母音を短く (無声子音の後は無声化) し, 強く読む母音を少し長くする */
function adjust(phrases: AccentPhrase[], eoPhrases: readonly EoPhrase[]): void {
  for (const [index, phrase] of phrases.entries()) {
    const eo = eoPhrases[index];
    if (eo === undefined || eo.moras.length !== phrase.moras.length) {
      throw new Error(
        `モーラの数が合いません: ${phrase.moras.map((m) => m.text).join("")}`,
      );
    }
    for (const [moraIndex, mora] of phrase.moras.entries()) {
      const source = eo.moras[moraIndex];
      if (source?.epenthetic === true) {
        if (source.voiceless) {
          mora.vowel = mora.vowel.toUpperCase();
          mora.pitch = 0;
          mora.vowel_length = 0.03;
        } else {
          mora.vowel_length = 0.035;
        }
      }
      if (moraIndex === eo.stressed) {
        mora.vowel_length *= 1.3;
      }
    }
  }
}

/** エスペラントの文 (複数文可) の audio_query を作る */
/** 文を . ! ? で分ける */
export function esperantoSentences(text: string): string[] {
  return (text.match(/[^.!?]+[.!?]?/g) ?? [])
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence !== "");
}

/**
 * エスペラントの文の並びから audio_query を作る.
 * `sentenceFirstPhrase` は各文の最初のアクセント句の番号 (字幕を 1 文ずつ切り替える時刻を求めるのに使う)
 */
export async function esperantoQuery(
  sentences: readonly string[],
  speaker: number,
  speedScale: number,
): Promise<{
  query: Record<string, unknown>;
  kana: string[];
  sentenceFirstPhrase: number[];
}> {
  const query = (await (
    await engine(
      `/audio_query?speaker=${speaker}&text=${encodeURIComponent("あ")}`,
      {
        method: "POST",
      },
    )
  ).json()) as Record<string, unknown>;
  const all: AccentPhrase[] = [];
  const kanaList: string[] = [];
  const sentenceFirstPhrase: number[] = [];
  for (const [index, sentence] of sentences.entries()) {
    sentenceFirstPhrase.push(all.length);
    const eoPhrases = esperantoPhrases(sentence);
    const kanaText = phrasesToKana(eoPhrases);
    kanaList.push(kanaText);
    const phrases = (await (
      await engine(
        `/accent_phrases?speaker=${speaker}&is_kana=true&text=${encodeURIComponent(kanaText)}`,
        { method: "POST" },
      )
    ).json()) as AccentPhrase[];
    adjust(phrases, eoPhrases);
    const last = phrases[phrases.length - 1];
    if (last !== undefined && index < sentences.length - 1) {
      last.pause_mora = {
        text: "、",
        pitch: 0,
        consonant: null,
        consonant_length: null,
        vowel: "pau",
        vowel_length: 0.45,
      };
    }
    all.push(...phrases);
  }
  query["accent_phrases"] = all;
  query["speedScale"] = speedScale;
  query["outputSamplingRate"] = 24000;
  query["outputStereo"] = false;
  return { query, kana: kanaList, sentenceFirstPhrase };
}

if (import.meta.main) {
  const [output, speakerText, text] = process.argv.slice(2);
  if (output === undefined || speakerText === undefined || text === undefined) {
    throw new Error(
      '使い方: node scripts/esperanto_voice.ts <出力.wav> <話者 ID> "<文>"',
    );
  }
  const speaker = Number(speakerText);
  const { query, kana: kanaList } = await esperantoQuery(
    esperantoSentences(text),
    speaker,
    ESPERANTO_SPEED_SCALE,
  );
  console.log(kanaList.join("\n"));
  const wav = await (
    await engine(`/synthesis?speaker=${speaker}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(query),
    })
  ).arrayBuffer();
  await writeFile(output, new Uint8Array(wav));
}
