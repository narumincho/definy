import { main } from "./mod.ts";

const expectString = (key: string): string => {
  const value = Deno.env.get(key);
  if (value === undefined) {
    throw new Error("環境変数 " + key + " が指定されていない!");
  }
  return value;
};

main({ isDev: false, faunaSecret: expectString("FAUNA_KEY") });
