import type { LocalizedText } from "./event_content.ts";
import type { LanguageCode } from "./types.ts";

export function label(
  lang: LanguageCode,
  en: string,
  ja: string,
  eo: string,
): string {
  switch (lang) {
    case "ja":
      return ja;
    case "eo":
      return eo;
    default:
      return en;
  }
}

export function languageNativeName(lang: LanguageCode): string {
  switch (lang) {
    case "en":
      return "English";
    case "ja":
      return "日本語";
    case "eo":
      return "Esperanto";
  }
}

/** 指定言語のテキストを返す。無ければ英語、それも無ければ最初のテキスト */
export function localizedText(
  texts: LocalizedText,
  lang: LanguageCode,
): string {
  return (
    texts.find((t) => t.language === lang)?.text ??
    texts.find((t) => t.language === "en")?.text ??
    texts[0]?.text ??
    ""
  );
}

/** 指定言語のテキストだけを置き換えた (無ければ追加した) LocalizedText を返す。空文字なら削除する */
export function withLocalizedText(
  texts: LocalizedText,
  lang: LanguageCode,
  text: string,
): LocalizedText {
  const others = texts.filter((t) => t.language !== lang);
  return text.length > 0 ? [...others, { language: lang, text }] : others;
}

export function parseLanguageCode(
  value: string | null | undefined,
): LanguageCode | null {
  return value === "en" || value === "ja" || value === "eo" ? value : null;
}

/**
 * Accept-Language ヘッダーから definy が対応する言語を選ぶ. q 値の大きい順に見て,
 * `ja-JP` などの地域付きは先頭の言語部分で比べる. 対応する言語が無ければ en
 */
export function languageFromAcceptLanguage(
  header: string | null | undefined,
): LanguageCode {
  const ranges = (header ?? "")
    .split(",")
    .map((part, index) => {
      const [tag = "", ...params] = part.trim().split(";");
      const qParam = params
        .map((p) => p.trim())
        .find((p) => p.startsWith("q="));
      const q = qParam === undefined ? 1 : Number(qParam.slice(2));
      return {
        language: tag.trim().toLowerCase().split("-")[0] ?? "",
        q: Number.isFinite(q) ? q : 0,
        index,
      };
    })
    .filter((r) => r.q > 0)
    .sort((a, b) => b.q - a.q || a.index - b.index);
  for (const range of ranges) {
    const lang = parseLanguageCode(range.language);
    if (lang !== null) return lang;
  }
  return "en";
}

/**
 * サイト内のパス (`/parts`, `/part/x?y=1#z` など) に `?lang=` を付ける (あれば置き換える).
 * 表示言語は URL だけで決めるので, サイト内のリンクはすべてこれを通す. 外部 URL はそのまま返す
 */
export function withLanguage(href: string, lang: LanguageCode): string {
  if (!href.startsWith("/") || href.startsWith("//")) return href;
  const url = new URL(href, "http://localhost");
  url.searchParams.set("lang", lang);
  return url.pathname + url.search + url.hash;
}
