import { defineHead } from "void";
import { label } from "../../src/language.ts";
import { requestLanguage } from "../../src/page_head.ts";
import { pageTitle } from "../../src/page_title.ts";

export const head = defineHead((c) => {
  const eventHash = c.req.param("id") ?? "";
  return {
    title: pageTitle(
      `${label(requestLanguage(c), "Event", "イベント", "Evento")} ${eventHash.slice(0, 16)}`,
    ),
  };
});
