import prettier from "https://esm.sh/prettier@2.7.1";
import parserTypeScript from "https://esm.sh/prettier@2.7.1/parser-typescript";

/**
 * Prettier を使って コードを整形する
 */
export const formatCode = (code: string): string => {
  return prettier.format(code, {
    parser: "typescript",
    plugins: [parserTypeScript],
  });
};
