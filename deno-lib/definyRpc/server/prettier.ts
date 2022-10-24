// @deno-types="https://cdn.skypack.dev/prettier@2.7.1?dts"
import prettier from "https://unpkg.com/prettier@2.7.1/esm/standalone.mjs";
import parserTypeScript from "https://unpkg.com/prettier@2.7.1/esm/parser-typescript.mjs";

/**
 * Prettier を使って コードを整形する
 */
export const formatCode = (code: string): string => {
  return prettier.format(code, {
    parser: "typescript",
    plugins: [parserTypeScript],
  });
};
