import type { LocalizedText } from "./cbor.ts";
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
