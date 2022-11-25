import { startDefinyApiServer } from "../definyApp/apiServer/main.ts";

const readEnv = (key: string): string => {
  const value = Deno.env.get(key);
  if (value === undefined) {
    throw new Error("環境変数 " + key + " が指定されていない!");
  }
  return value;
};

startDefinyApiServer({
  mode: { type: "denoDeploy" },
  faunaSecret: readEnv("FAUNA_KEY"),
  googleLogInClientSecret: readEnv("GOOGLE_LOGIN_CLIENT_SECRET"),
});
