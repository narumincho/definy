import prettier from "https://esm.sh/prettier@2.8.7?pin=v117";
import parserTypeScript from "https://esm.sh/prettier@2.8.7/parser-typescript?pin=v117";

/**
 * Prettier を使って コードを整形する
 */
export const formatCode = (code: string): string => {
  return prettier.format(code, {
    parser: "typescript",
    plugins: [parserTypeScript],
  });
};
