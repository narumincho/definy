import { coreMain } from "../deno-lib/npm";

const mapChar = (char: string): string => {
  switch (char) {
    case "ァ":
      return "ぁ";
    case "ア":
      return "あ";
    case "ィ":
      return "ぃ";
    case "イ":
      return "い";
  }
  return char;
};

/**
 * 検索をしやすくするように正規化する
 */
export const normalizeSearchText = (searchQueryText: string): string => {
  return [...coreMain.normalizeOneLineString(searchQueryText).toLowerCase()]
    .map(mapChar)
    .join("");
};
