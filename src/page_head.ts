import { defineHead } from "void";
import { label, parseLanguageCode } from "./language.ts";
import { pageTitle } from "./page_title.ts";
import type { LanguageCode } from "./types.ts";

type PageHeadContext = Parameters<Parameters<typeof defineHead>[0]>[0];

/** ページの要求の URL (?lang=) から表示言語を決める. ミドルウェアが ?lang= を付けるので普通は必ずある */
export function requestLanguage(c: PageHeadContext): LanguageCode {
  return parseLanguageCode(c.req.query("lang")) ?? "en";
}

/**
 * ページの `.server.ts` から `export const head = titleHead(...)` として使う, 表示言語に合わせたタイトルの head().
 * Void がサーバーの HTML とクライアント側の遷移の両方でタイトルを入れる
 */
export function titleHead(
  en: string,
  ja: string,
  eo: string,
): ReturnType<typeof defineHead> {
  return defineHead((c) => ({
    title: pageTitle(label(requestLanguage(c), en, ja, eo)),
  }));
}
