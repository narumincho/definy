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
