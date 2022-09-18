import { TsIdentifier } from "../identifier.ts";

export const documentToString = (document: string): string => {
  const documentTrimmed = document.trim();
  return documentTrimmed === ""
    ? ""
    : "\n/**\n" +
        documentTrimmed
          .split("\n")
          .map((line) =>
            line === "" ? " *" : " * " + line.replace(/\*\//gu, "* /")
          )
          .join("\n") +
        "\n */\n";
};

/**
 * 文字列を`"`で囲んでエスケープする
 */
export const stringLiteralValueToString = (value: string): string =>
  '"' +
  value
    .replace(/\\/gu, "\\\\")
    .replace(/"/gu, '\\"')
    .replace(/\r\n|\n/gu, "\\n") +
  '"';

/**
 * 型パラメーターを文字列にする `<T extends unknown>` `<ok extends unknown, error extends unknown>`
 * extends unknown をつけた理由はJSXでも解釈できるようにするため
 */
export const typeParameterListToString = (
  typeParameterList: ReadonlyArray<TsIdentifier>
): string => {
  if (typeParameterList.length === 0) {
    return "";
  }
  return (
    "<" +
    typeParameterList
      .map((typeParameter) => typeParameter + " extends unknown")
      .join(", ") +
    ">"
  );
};

export const indentNumberToString = (indent: number): string =>
  "  ".repeat(indent);
