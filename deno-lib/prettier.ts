import prettier from "https://esm.sh/prettier@2.8.7?pin=v118";
import parserTypeScript from "https://esm.sh/prettier@2.8.7/parser-typescript?pin=v118";

/**
 * Prettier を使って コードを整形する
 */
export const formatCode = (code: string): string => {
  return prettier.format(code, {
    parser: "typescript",
    plugins: [parserTypeScript],
  });
};
