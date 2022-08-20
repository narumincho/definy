import * as i from "../../../functions/faunadb-interface";
import * as trpc from "@trpc/server";
import * as trpcNext from "@trpc/server/adapters/next";
import { Language, Location } from "../../../common/zodType";
import {
  VERCEL_GIT_COMMIT_SHA,
  isProduction,
} from "../../../functions/environmentVariables";
import { z } from "zod";

export const appRouter = trpc
  .router()
  .query("gitCommitSha", {
    input: z.void(),
    output: z.string().nullable(),
    resolve: () => {
      if (VERCEL_GIT_COMMIT_SHA === "") {
        return null;
      }
      return VERCEL_GIT_COMMIT_SHA;
    },
  })
  .mutation("requestLogInUrl", {
    input: z.object({ location: Location, language: Language }),
    output: z.string(),
    resolve: async ({ input }) => {
      const state = await i.openConnectStateCreate({
        location: input.location,
        language: input.language,
      });
      return logInUrlFromOpenIdConnectProviderAndState(state).toString();
    },
  });

const googleClientId =
  "8347840964-l3796imv2d11d0qi8cnb6r48n5jabk9t.apps.googleusercontent.com";

const logInUrlFromOpenIdConnectProviderAndState = (state: string): URL => {
  return createUrl(
    "https://accounts.google.com/o/oauth2/v2/auth",
    new Map([
      ["response_type", "code"],
      ["client_id", googleClientId],
      [
        "redirect_uri",
        isProduction
          ? "https://definy.vercel.app/logInCallback/google"
          : "http://localhost:3000/logInCallback/google",
      ],
      ["scope", "profile openid"],
      ["state", state],
    ])
  );
};

const createUrl = (
  originAndPath: string,
  query: ReadonlyMap<string, string>
): URL => {
  const url = new URL(originAndPath);
  for (const [key, value] of query) {
    url.searchParams.append(key, value);
  }
  return url;
};

export type AppRouter = typeof appRouter;

export default trpcNext.createNextApiHandler({
  router: appRouter,
  createContext: () => null,
});
