/**
 * 紹介スライドのずんだもんの解説 (日本語だけ).
 * スライドの id ごとに, ステップの順に 1 つずつ台詞を書く (無いステップは undefined).
 * 要素が現れていくステップは短く (REVEAL_SECONDS) 済ませ, 全て表示したステップで話す.
 * `speech` は VOICEVOX に読ませる文 (英単語などはかなにする. 区切って読まれてしまう名前は
 * `{デファイ'ニイワ}` のように {} の中にアクセント付きのかなで書く. scripts/generate_story_voice.ts),
 * `subtitle` は画面に出す字幕 (省略すると `speech`).
 * `en` / `eo` は英語・エスペラントの字幕 (音声は日本語のまま). 字幕は 1 文ずつ出すので, 日本語の字幕と同じ数の文に分けて書く.
 * 変えたら `node scripts/generate_story_voice.ts` で音声を作り直す (docs/story.md)
 */

import type { LanguageCode } from "../types.ts";

export type Face = "normal" | "happy" | "surprised" | "troubled";

export type NarrationLine = {
  readonly speech: string;
  readonly subtitle?: string;
  readonly face?: Face;
  /** 英語の字幕. 日本語の字幕の文と 1 つずつ対応させる */
  readonly en: readonly string[];
  /** エスペラントの字幕. 日本語の字幕の文と 1 つずつ対応させる */
  readonly eo: readonly string[];
};

export const NARRATION: Readonly<
  Record<string, ReadonlyArray<NarrationLine | undefined>>
> = {
  title: [
    {
      speech:
        "こんにちは、ずんだもんなのだ。今日は、{デファイ'ニイッテ}いうプログラミング言語を紹介するのだ。シンプルな純粋関数型の、ビジュアルプログラミング言語なのだ！",
      subtitle:
        "こんにちは、ずんだもんなのだ。今日は definy (デファイニー) っていうプログラミング言語を紹介するのだ。シンプルな純粋関数型の、ビジュアルプログラミング言語なのだ!",
      face: "happy",
      en: [
        "Hi, I'm Zundamon!",
        "Today I'll introduce a programming language called definy.",
        "It's a simple, purely functional, visual programming language!",
      ],
      eo: [
        "Saluton, mi estas Zundamon!",
        "Hodiaŭ mi prezentos programlingvon nomatan definy.",
        "Ĝi estas simpla, pure funkcia, vida programlingvo!",
      ],
    },
  ],
  history: [
    undefined,
    undefined,
    undefined,
    {
      speech:
        "{デファイ'ニイワ}、2019年1月31日に、大学の研究から始まった個人プロジェクトなのだ。エルム、タイプスクリプトとピュアスクリプト、ディーノやフラッターと、何度も言語を変えて作り直してきたのだ。2023年からの3年間はほとんど手が止まっていたけど、2026年は1年で1100コミットを超えたのだ！",
      subtitle:
        "definy は 2019 年 1 月 31 日に、大学の研究から始まった個人プロジェクトなのだ。Elm、TypeScript と PureScript、Deno や Flutter と、何度も言語を変えて作り直してきたのだ。2023 年からの 3 年間はほとんど手が止まっていたけど、2026 年は 1 年で 1,100 コミットを超えたのだ!",
      en: [
        "definy began on January 31, 2019, as a personal project that grew out of university research.",
        "It has been rebuilt again and again in different languages: Elm, TypeScript and PureScript, Deno and Flutter.",
        "For three years from 2023 it barely moved, but 2026 alone passed 1,100 commits!",
      ],
      eo: [
        "definy komenciĝis la 31-an de januaro 2019 kiel persona projekto el universitata esplorado.",
        "Ĝi estis refarita multfoje en diversaj lingvoj: Elm, TypeScript kaj PureScript, Deno kaj Flutter.",
        "Dum la tri jaroj ekde 2023 ĝi preskaŭ ne moviĝis, sed nur en 2026 ĝi superis 1 100 enmetojn!",
      ],
    },
  ],
  "vibe-coding": [
    undefined,
    undefined,
    {
      speech:
        "ひとりで作るには大きすぎて、モチベーションが続かなかったのだ。でも、AIに実装を任せるバイブコーディングで、2026年10月だけで481コミットも進んだのだ。ラスト製のコンパイラとサーバーは捨てて、タイプスクリプトと、{デファイ'ニイ}自身で書いたコンパイラに置き換えたのだ。",
      subtitle:
        "ひとりで作るには大きすぎて、モチベーションが続かなかったのだ。でも AI に実装を任せるバイブコーディングで、2026 年 10 月だけで 481 コミットも進んだのだ。Rust 製のコンパイラとサーバーは捨てて、TypeScript と definy 自身で書いたコンパイラに置き換えたのだ。",
      face: "surprised",
      en: [
        "It was too big to build alone, and the motivation didn't last.",
        "But with vibe coding, letting AI do the implementation, October 2026 alone saw 481 commits.",
        "The Rust compiler and server were thrown away and replaced with TypeScript and a compiler written in definy itself.",
      ],
      eo: [
        "Ĝi estis tro granda por konstrui sola, kaj la motivo ne daŭris.",
        "Sed per vibe coding, lasante la realigon al AI, nur en oktobro 2026 estis 481 enmetoj.",
        "La Rust-kompililo kaj -servilo estis forĵetitaj kaj anstataŭigitaj per TypeScript kaj kompililo verkita en definy mem.",
      ],
    },
  ],
  "structured-editing": [
    undefined,
    undefined,
    undefined,
    {
      speech:
        "テキストのコードは、書きかけだとすぐ構文エラーになるのだ。{デファイ'ニイワ}コードを文字ではなく構文木のまま持つから、構文エラーがそもそも存在しないのだ。空いている穴は、入るべき型を知っているのだ。それに予約語もないから、レットやイフという名前もそのまま使えるのだ。",
      subtitle:
        "テキストのコードは、書きかけだとすぐ構文エラーになるのだ。definy はコードを文字ではなく構文木のまま持つから、構文エラーがそもそも存在しないのだ。空いている穴は、入るべき型を知っているのだ。それに予約語もないから、let や if という名前もそのまま使えるのだ。",
      en: [
        "Text code turns into a syntax error as soon as it's half-written.",
        "definy keeps code as a syntax tree, not characters, so syntax errors simply don't exist.",
        "An empty hole knows what type belongs in it.",
        "And there are no reserved words, so you can use names like let and if as they are.",
      ],
      eo: [
        "Teksta kodo tuj fariĝas sintaksa eraro, kiam ĝi estas duone skribita.",
        "definy tenas kodon kiel sintaksan arbon, ne kiel signojn, do sintaksaj eraroj tute ne ekzistas.",
        "Malplena truo scias, kiu tipo devas eniri.",
        "Kaj ne estas rezervitaj vortoj, do vi povas uzi nomojn kiel let kaj if senŝanĝe.",
      ],
    },
  ],
  scratch: [
    undefined,
    undefined,
    undefined,
    {
      speech:
        "スクラッチのようにブロックで組み立てるけど、{デファイ'ニイワ}純粋なのだ。同じ入力なら必ず同じ結果になって、副作用は外から能力として渡すのだ。レコードや{チョクワ'ガタ}みたいな代数的データ型もあって、パターンマッチの漏れも検査してくれるのだ。",
      subtitle:
        "Scratch のようにブロックで組み立てるけど、definy は純粋なのだ。同じ入力なら必ず同じ結果になって、副作用は外から能力として渡すのだ。レコードや直和型みたいな代数的データ型もあって、パターンマッチの漏れも検査してくれるのだ。",
      en: [
        "You build with blocks like in Scratch, but definy is pure.",
        "The same input always gives the same result, and side effects are passed in from outside as capabilities.",
        "It has algebraic data types like records and unions, and it checks that pattern matches cover every case.",
      ],
      eo: [
        "Oni konstruas per blokoj kiel en Scratch, sed definy estas pura.",
        "Sama enigo ĉiam donas saman rezulton, kaj kromefikoj estas transdonataj de ekstere kiel kapabloj.",
        "Ĝi havas algebrajn datumtipojn kiel registrojn kaj sumtipojn, kaj kontrolas, ke ŝablonkongruoj kovras ĉiujn kazojn.",
      ],
    },
  ],
  events: [
    {
      speech:
        "ユーザーIDは公開鍵そのものなのだ。ライトユーザーのアリスは、ブラウザから{ナルミ'ンチョノ}サーバーに直接つなぐのだ。データを自分で持ちたいボブは、自分で建てたサーバー経由でつなぐのだ。",
      subtitle:
        "ユーザー ID は公開鍵そのものなのだ。ライトユーザーの Alice は、ブラウザからナルミンチョのサーバーに直接つなぐのだ。データを自分で持ちたい Bob は、自分で建てたサーバー経由でつなぐのだ。",
      en: [
        "Your user ID is your public key itself.",
        "Alice, a light user, connects from the browser straight to narumincho's server.",
        "Bob, who wants to own the data, connects through a self-hosted server.",
      ],
      eo: [
        "La uzanto-identigilo estas la publika ŝlosilo mem.",
        "Alice, malpeza uzanto, konektiĝas el la retumilo rekte al la servilo de narumincho.",
        "Bob, kiu volas mem posedi la datumojn, konektiĝas tra memgastigita servilo.",
      ],
    },
    {
      speech:
        "署名したイベントは、サーバーからサーバーへ広がっていくのだ。どのサーバーでも署名を確かめられるのだ。",
      en: [
        "Signed events spread from server to server.",
        "Any server can check the signature.",
      ],
      eo: [
        "Subskribitaj eventoj disvastiĝas de servilo al servilo.",
        "Ĉiu servilo povas kontroli la subskribon.",
      ],
    },
    {
      speech:
        "悪いサーバーがアリスのふりをしても、秘密鍵がないから署名が合わなくて、すぐにばれるのだ。",
      subtitle:
        "悪いサーバーが Alice のふりをしても、秘密鍵がないから署名が合わなくて、すぐにばれるのだ。",
      face: "troubled",
      en: [
        "Even if a bad server pretends to be Alice, it has no private key, so the signature won't match and it's caught right away.",
      ],
      eo: [
        "Eĉ se malbona servilo ŝajnigas esti Alice, ĝi ne havas la privatan ŝlosilon, do la subskribo ne kongruas kaj ĝi tuj malkaŝiĝas.",
      ],
    },
    {
      speech:
        "サーバーにできるのは、載せないこと、つまり削除だけなのだ。著作権侵害みたいなものには、ちゃんと対応できるのだ。",
      en: [
        "All a server can do is not carry something; in other words, delete it.",
        "So things like copyright violations can be handled properly.",
      ],
      eo: [
        "Servilo povas nur ne porti ion, alivorte, forigi ĝin.",
        "Do ekzemple kopirajtajn malobservojn oni povas ĝuste trakti.",
      ],
    },
    {
      speech:
        "でも、ボブのサーバーには残っているし、アリスも手元の控えから、別のサーバーへ出し直せるのだ。",
      subtitle:
        "でも Bob のサーバーには残っているし、Alice も手元の控えから、別のサーバーへ出し直せるのだ。",
      face: "happy",
      en: [
        "But it's still on Bob's server, and Alice can republish it to another server from a local copy.",
      ],
      eo: [
        "Sed ĝi ankoraŭ estas en la servilo de Bob, kaj Alice povas republikigi ĝin al alia servilo el loka kopio.",
      ],
    },
  ],
  comparison: [
    undefined,
    undefined,
    undefined,
    {
      speech:
        "ブロックチェーンは全体で合意を取るから、消せないし、電力もたくさん使うのだ。ノスターは{デファイ'ニイニ}近いけど、目的はエスエヌエスなのだ。{デファイ'ニイワ}合意を取らずに検証するだけだから省エネで、運営が問題のある内容を消すこともできるのだ。",
      subtitle:
        "ブロックチェーンは全体で合意を取るから、消せないし、電力もたくさん使うのだ。nostr は definy に近いけど、目的は SNS なのだ。definy は合意を取らずに検証するだけだから省エネで、運営が問題のある内容を消すこともできるのだ。",
      en: [
        "Blockchains reach agreement across the whole network, so nothing can be deleted, and they use a lot of power.",
        "nostr is close to definy, but its purpose is social media.",
        "definy only verifies without reaching agreement, so it saves energy, and operators can still remove problematic content.",
      ],
      eo: [
        "Blokĉenoj atingas konsenton tra la tuta reto, do nenio estas forigebla, kaj ili uzas multe da energio.",
        "nostr similas al definy, sed ĝia celo estas sociaj retoj.",
        "definy nur kontrolas sen konsento, do ĝi ŝparas energion, kaj operaciantoj tamen povas forigi problemajn enhavojn.",
      ],
    },
  ],
  "version-control": [
    undefined,
    undefined,
    undefined,
    {
      speech:
        "{デファイ'ニイワ}、バージョン管理の仕組みも自分で持っているのだ。コミットは親をたどってつながって、ブランチを取り込むこともできるのだ。ギットはテキストファイルのぎょうの差分を扱うけど、{デファイ'ニイワ}構文木のまま、パーツ単位で扱うのだ。参照はアイディーだから名前を変えても壊れないし、コミットは全部署名されているのだ。通信は、ジーアールピーシー互換のコネクトアールピーシーなのだ。",
      subtitle:
        "definy は、バージョン管理の仕組みも自分で持っているのだ。コミットは親をたどってつながって、ブランチを取り込むこともできるのだ。Git はテキストファイルの行の差分を扱うけど、definy は構文木のまま、パーツ単位で扱うのだ。参照は ID だから名前を変えても壊れないし、コミットは全部署名されているのだ。通信は gRPC 互換の Connect-RPC なのだ。",
      en: [
        "definy has its own version control, too.",
        "Commits link to their parents, and branches can be merged.",
        "Git handles line diffs of text files, but definy works part by part, right on the syntax tree.",
        "References are IDs, so renaming never breaks anything, and every commit is signed.",
        "It talks over Connect-RPC, which is compatible with gRPC.",
      ],
      eo: [
        "definy havas ankaŭ sian propran versikontrolon.",
        "Enmetoj ligiĝas al siaj gepatroj, kaj branĉoj estas kunfandeblaj.",
        "Git traktas liniajn diferencojn de tekstaj dosieroj, sed definy laboras po parto, rekte sur la sintaksa arbo.",
        "Referencoj estas identigiloj, do renomado neniam rompas ion, kaj ĉiu enmeto estas subskribita.",
        "Ĝi komunikas per Connect-RPC, kongrua kun gRPC.",
      ],
    },
  ],
  "self-hosting": [
    undefined,
    undefined,
    undefined,
    {
      speech:
        "目標は、{デファイ'ニイデ}{デファイ'ニイオ}表現することなのだ。型チェッカーや、ワズムのコンパイラ、イベントの規則やアールピーシーの処理は、もう{デファイ'ニイデ}書いてあるのだ。今はコードのおよそ3割、ユーアイを除くと6割近くが{デファイ'ニイセエ}なのだ。2027年中には、ユーアイまでいけるかもしれないのだ。",
      subtitle:
        "目標は、definy で definy を表現することなのだ。型チェッカーや Wasm のコンパイラ、イベントの規則や RPC の処理は、もう definy で書いてあるのだ。今はコードのおよそ 3 割、UI を除くと 6 割近くが definy 製なのだ。2027 年中には UI までいけるかもしれないのだ。",
      en: [
        "The goal is to express definy in definy.",
        "The type checker, the Wasm compiler, the event rules and the RPC handlers are already written in definy.",
        "Right now about 30% of the code, or nearly 60% excluding the UI, is made in definy.",
        "Maybe even the UI by the end of 2027.",
      ],
      eo: [
        "La celo estas esprimi definy en definy.",
        "La tipkontrolilo, la Wasm-kompililo, la eventaj reguloj kaj la RPC-traktiloj jam estas verkitaj en definy.",
        "Nun ĉirkaŭ 30 % de la kodo, aŭ preskaŭ 60 % sen la fasado, estas farita en definy.",
        "Eble eĉ la fasado ĝis la fino de 2027.",
      ],
    },
  ],
  deploy: [
    undefined,
    undefined,
    undefined,
    {
      speech:
        "クラウドフレアワーカーズへのデプロイも、{デファイ'ニイデ}書いた普通のパーツなのだ。{デファイ'ニイ}製のコンパイラでワズムにして、ワジのプレビュースリーに倣った入出力で、レストエーピーアイに送るのだ。{デファイ'ニイデ}書いた{デファイ'ニイノ}サーバーも、3秒くらいでデプロイできるのだ！",
      subtitle:
        "Cloudflare Workers へのデプロイも、definy で書いた普通のパーツなのだ。definy 製のコンパイラで Wasm にして、WASI 0.3 (Preview 3) に倣った入出力で、REST API に送るのだ。definy で書いた definy のサーバーも、3 秒くらいでデプロイできるのだ!",
      face: "happy",
      en: [
        "Deploying to Cloudflare Workers is also just an ordinary part written in definy.",
        "The definy compiler turns it into Wasm and sends it to the REST API, with I/O modeled on WASI 0.3 (Preview 3).",
        "Even the definy server written in definy deploys in about 3 seconds!",
      ],
      eo: [
        "Ankaŭ disponigo al Cloudflare Workers estas nur ordinara parto verkita en definy.",
        "La definy-kompililo faras el ĝi Wasm kaj sendas ĝin al la REST API, kun enigo kaj eligo modelitaj laŭ WASI 0.3 (Preview 3).",
        "Eĉ la definy-servilo verkita en definy estas disponigata en ĉirkaŭ 3 sekundoj!",
      ],
    },
  ],
  proof: [
    undefined,
    undefined,
    undefined,
    {
      speech:
        "エーアイが書くコードが増えるほど、正しいことを機械で確かめられるのが大事になるのだ。最近はエーアイが数学の証明にリーンを使っていて、イドリスツーやニクシス、エイチファイブアイ、キュードスみたいなプロジェクトもあるのだ。{デファイ'ニイモ}構文をシンプルに絞って、いつか証明に取り組みたいのだ。",
      subtitle:
        "AI が書くコードが増えるほど、正しいことを機械で確かめられるのが大事になるのだ。最近は AI が数学の証明に Lean を使っていて、Idris 2 や nyxis、h5i、qedos みたいなプロジェクトもあるのだ。definy も構文をシンプルに絞って、いつか証明に取り組みたいのだ。",
      en: [
        "The more code AI writes, the more it matters that machines can check it's correct.",
        "Lately AI uses Lean for math proofs, and there are projects like Idris 2, nyxis, h5i and qedos.",
        "definy keeps its syntax simple too, and someday wants to take on proofs.",
      ],
      eo: [
        "Ju pli da kodo AI skribas, des pli gravas, ke maŝinoj povu kontroli ĝian ĝustecon.",
        "Lastatempe AI uzas Lean por matematikaj pruvoj, kaj ekzistas projektoj kiel Idris 2, nyxis, h5i kaj qedos.",
        "Ankaŭ definy tenas sian sintakson simpla kaj iam volas alfronti pruvojn.",
      ],
    },
  ],
  closing: [
    undefined,
    {
      speech:
        "{デファイ'ニイワ}、理想の仕様を目指して開発中なのだ。気になったら、キューアールコードから触ってみてほしいのだ。聞いてくれて、ありがとうなのだ！",
      subtitle:
        "definy は理想の仕様を目指して開発中なのだ。気になったら QR コードから触ってみてほしいのだ。聞いてくれて、ありがとうなのだ!",
      face: "happy",
      en: [
        "definy is in development, aiming for the ideal specification.",
        "If you're curious, try it from the QR code.",
        "Thanks for listening!",
      ],
      eo: [
        "definy estas evoluigata, celante la idealan specifon.",
        "Se vi scivolas, provu ĝin per la QR-kodo.",
        "Dankon pro la aŭskultado!",
      ],
    },
  ],
};

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
