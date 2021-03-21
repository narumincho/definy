import { Identifer } from "./data";

/**
 * 識別子を文字列から無理矢理でも生成する.
 * 空文字だった場合は $00
 * 識別子に使えない文字が含まれていた場合, 末尾に_がつくか, $マークでエンコードされる
 * @param text
 */
export const fromString = (word: string): Identifer => {
  const [firstChar] = word;
  if (firstChar === undefined) {
    return Identifer.Identifer("$00");
  }
  let result = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ$_".includes(
    firstChar
  )
    ? firstChar
    : escapeChar(firstChar);
  const slicedWord = word.slice(1);
  for (const char of slicedWord) {
    result += "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ$_0123456789".includes(
      char
    )
      ? char
      : escapeChar(char);
  }
  if (reservedByLanguageWordSet.has(word)) {
    return Identifer.Identifer(result + "_");
  }
  return Identifer.Identifer(result);
};

const escapeChar = (char: string): string =>
  "$" + char.charCodeAt(0).toString(16);

/**
 * JavaScriptやTypeScriptによって決められた予約語と、できるだけ使いたくない語
 */
const reservedByLanguageWordSet: ReadonlySet<string> = new Set([
  "await",
  "break",
  "case",
  "catch",
  "class",
  "const",
  "continue",
  "debugger",
  "default",
  "delete",
  "do",
  "else",
  "export",
  "extends",
  "finally",
  "for",
  "function",
  "if",
  "import",
  "in",
  "instanceof",
  "new",
  "return",
  "super",
  "switch",
  "this",
  "throw",
  "try",
  "typeof",
  "var",
  "void",
  "while",
  "with",
  "yield",
  "let",
  "static",
  "enum",
  "implements",
  "package",
  "protected",
  "interface",
  "private",
  "public",
  "null",
  "true",
  "false",
  "any",
  "boolean",
  "constructor",
  "declare",
  "get",
  "module",
  "require",
  "number",
  "set",
  "string",
  "symbol",
  "type",
  "from",
  "of",
  "as",
  "unknown",
  "Infinity",
  "NaN",
  "undefined",
  "top",
  "closed",
  "self",
]);

/**
 * 識別子のID
 */
export type IdentiferIndex = number & { _identiferIndex: never };

/** 初期インデックス */
export const initialIdentiferIndex = 0 as IdentiferIndex;

/**
 * 識別子を生成する
 * @param identiferIndex 識別子を生成するインデックス
 * @param reserved 言語の予約語と別に使わない識別子
 */
export const createIdentifer = (
  identiferIndex: IdentiferIndex,
  reserved: ReadonlySet<string>
): { identifer: Identifer; nextIdentiferIndex: IdentiferIndex } => {
  let index: number = identiferIndex;
  while (true) {
    const result = createIdentiferByIndex(index);
    if (!reserved.has(result) && !reservedByLanguageWordSet.has(result)) {
      return {
        identifer: Identifer.Identifer(result),
        nextIdentiferIndex: (index + 1) as IdentiferIndex,
      };
    }
    index += 1;
  }
};

/**
 * indexから識別子を生成する (予約語を考慮しない)
 * @param index
 */
const createIdentiferByIndex = (index: number): string => {
  const headIdentiferCharTable =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const noHeadIdentiferCharTable = headIdentiferCharTable + "0123456789";
  const char = headIdentiferCharTable[index];
  if (typeof char === "string") {
    return char;
  }
  let result = "";
  let offsetIndex = index - headIdentiferCharTable.length;
  while (true) {
    const quotient = Math.floor(offsetIndex / noHeadIdentiferCharTable.length);
    const first =
      headIdentiferCharTable[
        Math.floor(offsetIndex / noHeadIdentiferCharTable.length)
      ];
    const second = noHeadIdentiferCharTable[
      offsetIndex % noHeadIdentiferCharTable.length
    ] as string;
    if (typeof first === "string") {
      return first + second + result;
    }
    result = second + result;
    offsetIndex = quotient;
  }
};

/**
 *識別子として使える文字かどうか調べる。日本語の識別子は使えないものとする
 * @param word 識別子として使えるかどうか調べるワード
 */
export const isIdentifer = (word: string): boolean => {
  if (!isSafePropertyName(word)) {
    return false;
  }
  return !reservedByLanguageWordSet.has(word);
};

/**
 * ```ts
 * ({ await: 32 }.await)
 * ({ "": "empty"}[""])
 *
 * プロパティ名として直接コードで指定できるかどうか
 * `isIdentifer`とは予約語を指定できるかの面で違う
 * ```
 */
export const isSafePropertyName = (word: string): boolean => {
  const [firstChar] = word;
  if (firstChar === undefined) {
    return false;
  }
  if (
    !"abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ$_".includes(
      firstChar
    )
  ) {
    return false;
  }
  const slicedWord = word.slice(1);
  for (const char of slicedWord) {
    if (
      !"abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ$_0123456789".includes(
        char
      )
    ) {
      return false;
    }
  }
  return true;
};
