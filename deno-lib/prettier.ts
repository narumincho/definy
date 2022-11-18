import { parserTypeScript, prettier } from "./deps.ts";

/**
 * Prettier を使って コードを整形する
 */
export const formatCode = (code: string): string => {
  return prettier.format(code, {
    parser: "typescript",
    plugins: [parserTypeScript],
  });
};
