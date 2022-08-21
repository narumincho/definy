import * as i from "../../../functions/faunadb-interface";
import * as trpc from "@trpc/server";
import * as trpcNext from "@trpc/server/adapters/next";
import * as zodType from "../../../common/zodType";
import {
  VERCEL_GIT_COMMIT_SHA,
  isProduction,
} from "../../../functions/environmentVariables";
import {
  getAccountDataInGoogleFromCode,
  googleLogInClientId,
} from "../../../functions/login";
import { z } from "zod";

export const appRouter = trpc
  .router()
  .query("gitCommitSha", {
    input: z.void(),
    output: z.string().length(40).nullable(),
    resolve: () => {
      if (VERCEL_GIT_COMMIT_SHA === "") {
        return null;
      }
      return VERCEL_GIT_COMMIT_SHA;
    },
  })
  .mutation("requestLogInUrl", {
    input: z.object({ location: zodType.Location, language: zodType.Language }),
    output: z.string().url(),
    resolve: async ({ input }) => {
      const state = await i.openConnectStateCreate({
        location: input.location,
        language: input.language,
      });
      return logInUrlFromOpenIdConnectProviderAndState(state).toString();
    },
  })
  .mutation("logInByCodeAndState", {
    input: z.object({ code: z.string().min(1), state: z.string().min(1) }),
    output: zodType.LogInByCodeAndStatePayload,
    resolve: async ({ input }): Promise<zodType.LogInByCodeAndStatePayload> => {
      const result = await i.getOpenConnectStateByState(input.state);
      if (result === undefined) {
        return {
          type: "notGeneratedState",
        };
      }
      const accountInGoogle = await getAccountDataInGoogleFromCode(input.code);
      return {
        type: "notExistsAccountInDefiny",
        nameInProvider: accountInGoogle.name,
        imageUrl: accountInGoogle.imageUrl.toString(),
      };
    },
  });

const logInUrlFromOpenIdConnectProviderAndState = (state: string): URL => {
  return createUrl(
    "https://accounts.google.com/o/oauth2/v2/auth",
    new Map([
      ["response_type", "code"],
      ["client_id", googleLogInClientId],
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
