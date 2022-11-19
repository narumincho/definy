import { startDefinyApiServer } from "../definyApp/apiServer/main.ts";

const expectString = (key: string): string => {
  const value = Deno.env.get(key);
  if (value === undefined) {
    throw new Error("環境変数 " + key + " が指定されていない!");
  }
  return value;
};

startDefinyApiServer({
  mode: { type: "denoDeploy" },
  faunaSecret: expectString("FAUNA_KEY"),
});
