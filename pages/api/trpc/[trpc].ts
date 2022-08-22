import * as i from "../../../functions/faunadb-interface";

import * as trpc from "@trpc/server";
import * as trpcNext from "@trpc/server/adapters/next";
import * as zodType from "../../../common/zodType";
import {
  cratePreAccountToken,
  getAccountDataInGoogleFromCode,
  googleLogInUrl,
} from "../../../functions/login";
import type { Client } from "faunadb";
import { VERCEL_GIT_COMMIT_SHA } from "../../../functions/environmentVariables";
import { z } from "zod";

export const appRouter = trpc
  .router<Client>()
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
    resolve: async ({ ctx, input }) => {
      const state = await i.openConnectStateCreate(ctx, {
        location: input.location,
        language: input.language,
      });
      return googleLogInUrl(state).toString();
    },
  })
  .mutation("logInByCodeAndState", {
    input: z.object({ code: z.string().min(1), state: z.string().min(1) }),
    output: zodType.LogInByCodeAndStatePayload,
    resolve: async ({
      ctx,
      input,
    }): Promise<zodType.LogInByCodeAndStatePayload> => {
      const result = await i.getAndDeleteOpenConnectStateByState(
        ctx,
        input.state
      );
      if (result === undefined) {
        return {
          type: "notGeneratedState",
        };
      }
      const accountInGoogle = await getAccountDataInGoogleFromCode(input.code);
      if (accountInGoogle === undefined) {
        return {
          type: "invalidCodeOrProviderResponseError",
        };
      }
      const preAccountToken = cratePreAccountToken();
      console.log("preAccountToken", preAccountToken);
      return {
        type: "notExistsAccountInDefiny",
        nameInProvider: accountInGoogle.name,
        imageUrl: accountInGoogle.imageUrl.toString(),
      };
    },
  });

export type AppRouter = typeof appRouter;

export default trpcNext.createNextApiHandler({
  router: appRouter,
  createContext: () => i.getFaunaClient(),
});
