/**
 * 英語の字幕 (seeds/story.json の `story.slides` の台詞の `en`) を VOICEVOX (日本語の音声合成) にそのまま読ませるための下ごしらえ.
 *
 * VOICEVOX ENGINE (0.26 で確認) は英単語をカタカナ読みにして読むので, 英文はほぼそのまま渡せる. ただし
 * - 数字は日本語で読む (2019 → ニセンジュウキュウ) → 英語の言葉に直す (twenty nineteen)
 * - 2 文字ほどの短い語と短縮形は 1 文字ずつ読む (it → アイティー, I'm → アイ、エム) → 読みを辞書 (`READINGS`) で与える
 * - definy などの名前は読み違える (デフィニイ) → 同じく辞書で与える
 * 辞書の読みは generate_story_voice.ts の `{...}` (AquesTalk 風のかな. ' がアクセントの位置) にして返す.
 * 1 文だけ試すには `node scripts/english_voice.ts "Hi, I'm Zundamon!"` (読ませる文と VOICEVOX の読みを出す)
 */

/** 英語の音声の話速. 英語はカタカナにするとモーラが多く長くなるので, 日本語 (1.15) より少し速くする */
export const ENGLISH_SPEED_SCALE = 1.2;

/**
 * VOICEVOX が読み違える語の読み (小文字. ' は短縮形のアポストロフィ).
 * 読みを足したら generate_story_voice.ts の ENGLISH_VERSION を上げる
 */
const READINGS: Readonly<Record<string, string>> = {
  definy: "デファイ'ニイ",
  // 数字を言葉にした one を「オン・イー」と読む
  one: "ワ'ン",
  "narumincho's": "ナル'ミンチョズ",
  // 冠詞の a を「エイ」と 1 文字ずつ読んでしまう
  a: "ア'",
  hi: "ハ'イ",
  "i'm": "ア'イム",
  "i'll": "ア'イル",
  it: "イ'ット",
  "it's": "イ'ッツ",
  as: "ア'ズ",
  so: "ソ'オ",
  no: "ノ'オ",
  an: "ア'ン",
  "don't": "ド'ント",
  "won't": "ウォ'ント",
  "didn't": "ディ'ドント",
  "you're": "ユ'ア",
  ids: "アイディ'イズ",
  uses: "ユ'ウジズ",
  once: "ワ'ンス",
  // 「アニョン」と読んでしまう
  anyone: "エ'ニイワン",
  "bob's": "ボ'ブズ",
  renaming: "リネ'イミング",
  maybe: "メ'イビイ",
  their: "ゼ'ア",
  // 複数形の s を 1 文字で読んでしまうもの
  machines: "マシ'インズ",
  projects: "プロ'ジェクツ",
  breaks: "ブレ'イクス",
  types: "タ'イプス",
  rest: "レ'スト",
  wasi: "ワ'ジ",
  h5i: "エ'イチ/ファ'イブ/ア'イ",
};

const ONES = [
  "zero",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
  "eleven",
  "twelve",
  "thirteen",
  "fourteen",
  "fifteen",
  "sixteen",
  "seventeen",
  "eighteen",
  "nineteen",
];
const TENS = [
  "",
  "",
  "twenty",
  "thirty",
  "forty",
  "fifty",
  "sixty",
  "seventy",
  "eighty",
  "ninety",
];

/** 0〜99 */
function belowHundred(n: number): string {
  if (n < 20) {
    return ONES[n] ?? "";
  }
  const tens = TENS[Math.floor(n / 10)] ?? "";
  return n % 10 === 0 ? tens : `${tens} ${ONES[n % 10]}`;
}

/** 0〜999 999 の整数を英語の言葉にする */
function integerWords(n: number): string {
  if (n >= 1000) {
    const rest = n % 1000;
    const thousands = `${integerWords(Math.floor(n / 1000))} thousand`;
    return rest === 0 ? thousands : `${thousands} ${integerWords(rest)}`;
  }
  if (n >= 100) {
    const rest = n % 100;
    const hundreds = `${ONES[Math.floor(n / 100)]} hundred`;
    return rest === 0 ? hundreds : `${hundreds} ${belowHundred(rest)}`;
  }
  return belowHundred(n);
}

/** 数字 (1,100 / 2019 / 0.3 / 30%) を英語の言葉にする. 2000〜2099 の 4 桁 (区切りなし) は年として 2 桁ずつ読む */
function numberWords(text: string): string {
  const percent = text.endsWith("%");
  const body = percent ? text.slice(0, -1) : text;
  const [integerPart = "", fraction] = body.split(".");
  const integer = Number(integerPart.replaceAll(",", ""));
  let words: string;
  if (
    fraction === undefined &&
    !integerPart.includes(",") &&
    integerPart.length === 4 &&
    integer >= 2010 &&
    integer <= 2099
  ) {
    words = `twenty ${belowHundred(integer % 100)}`;
  } else {
    words = integerWords(integer);
  }
  if (fraction !== undefined) {
    words += ` point ${[...fraction].map((digit) => ONES[Number(digit)]).join(" ")}`;
  }
  return percent ? `${words} percent` : words;
}

/**
 * 英語の 1 文を VOICEVOX に読ませる文にする. 辞書の語は `{かな}` になる.
 * 括弧は読点にする (括弧の中を区切って読ませる)
 */
export function englishSpeech(sentence: string): string {
  return sentence
    .replaceAll(/\s*\(([^)]*)\)/g, ", $1")
    .replaceAll(/\b(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?%?/g, numberWords)
    .replaceAll(/[A-Za-z0-9]+(?:['’][A-Za-z]+)?/g, (word) => {
      const reading = READINGS[word.toLowerCase().replace("’", "'")];
      return reading === undefined ? word : `{${reading}}`;
    });
}

if (import.meta.main) {
  const ENGINE_URL = process.env["VOICEVOX_URL"] ?? "http://127.0.0.1:50021";
  for (const sentence of process.argv.slice(2)) {
    const speech = englishSpeech(sentence);
    console.log(speech);
    // generate_story_voice.ts と同じく, {} の中はかなとして, 外は普通の文として読ませる
    const readings: string[] = [];
    for (const [index, part] of speech.split(/\{([^}]*)\}/).entries()) {
      if (part.trim() === "") {
        continue;
      }
      const response = await fetch(
        `${ENGINE_URL}/accent_phrases?speaker=3&is_kana=${index % 2 === 1}&text=${encodeURIComponent(part)}`,
        { method: "POST" },
      );
      const phrases = (await response.json()) as Array<{
        moras: Array<{ text: string }>;
      }>;
      readings.push(
        ...phrases.map((phrase) => phrase.moras.map((m) => m.text).join("")),
      );
    }
    console.log(`  ${readings.join(" / ")}`);
  }
}
