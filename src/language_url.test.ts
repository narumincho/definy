import { describe, expect, it } from "vitest";
import {
  languageFromAcceptLanguage,
  parseLanguageCode,
  withLanguage,
} from "./language.ts";

describe("languageFromAcceptLanguage", () => {
  it("picks the first supported language by q value", () => {
    expect(languageFromAcceptLanguage("ja-JP,ja;q=0.9,en;q=0.8")).toBe("ja");
    expect(languageFromAcceptLanguage("fr-FR,fr;q=0.9,eo;q=0.5")).toBe("eo");
    expect(languageFromAcceptLanguage("en;q=0.5,ja;q=0.8")).toBe("ja");
  });

  it("falls back to en", () => {
    expect(languageFromAcceptLanguage(null)).toBe("en");
    expect(languageFromAcceptLanguage("")).toBe("en");
    expect(languageFromAcceptLanguage("fr,de;q=0.5")).toBe("en");
    expect(languageFromAcceptLanguage("*")).toBe("en");
    expect(languageFromAcceptLanguage("ja;q=0")).toBe("en");
  });
});

describe("parseLanguageCode", () => {
  it("accepts only supported codes", () => {
    expect(parseLanguageCode("ja")).toBe("ja");
    expect(parseLanguageCode("JA")).toBeNull();
    expect(parseLanguageCode(null)).toBeNull();
  });
});

describe("withLanguage", () => {
  it("adds or replaces ?lang= on site paths", () => {
    expect(withLanguage("/parts", "ja")).toBe("/parts?lang=ja");
    expect(withLanguage("/", "eo")).toBe("/?lang=eo");
    expect(withLanguage("/part/x?a=1#top", "ja")).toBe(
      "/part/x?a=1&lang=ja#top",
    );
    expect(withLanguage("/parts?lang=en", "ja")).toBe("/parts?lang=ja");
  });

  it("keeps external URLs", () => {
    expect(withLanguage("https://example.com/", "ja")).toBe(
      "https://example.com/",
    );
    expect(withLanguage("//example.com/", "ja")).toBe("//example.com/");
  });
});
