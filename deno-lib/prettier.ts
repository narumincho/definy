import prettier from "https://esm.sh/prettier@2.7.1?pin=v102";
import parserTypeScript from "https://esm.sh/prettier@2.7.1/parser-typescript?pin=v102";

/**
 * Prettier を使って コードを整形する
 */
export const formatCode = (code: string): string => {
  return prettier.format(code, {
    parser: "typescript",
    plugins: [parserTypeScript],
  });
};
