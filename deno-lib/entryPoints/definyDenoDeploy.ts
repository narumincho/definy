import { startDefinyServer } from "../definyApp/server/main.tsx";

const readEnv = (key: string): string => {
  const value = Deno.env.get(key);
  if (value === undefined) {
    throw new Error("環境変数 " + key + " が指定されていない!");
  }
  return value;
};

startDefinyServer({
  mode: { type: "denoDeploy" },
  faunaSecret: readEnv("FAUNA_KEY"),
  googleLogInClientSecret: readEnv("GOOGLE_LOGIN_CLIENT_SECRET"),
});
