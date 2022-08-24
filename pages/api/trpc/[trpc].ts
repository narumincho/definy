import * as i from "../../../functions/faunadb-interface";

import * as trpc from "@trpc/server";
import * as trpcNext from "@trpc/server/adapters/next";
import * as zodType from "../../../common/zodType";
import {
  crateAccountTokenAndHash,
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
      const accountInDefiny = await i.findAccountFromIdIssueByGoogle(
        ctx,
        accountInGoogle.id
      );
      if (accountInDefiny !== undefined) {
        return {
          type: "logInOk",
        };
      }
      const preAccountToken = cratePreAccountToken();
      await i.createPreAccount(ctx, {
        idIssueByGoogle: accountInGoogle.id,
        imageUrlInProvider: accountInGoogle.imageUrl,
        preAccountToken,
      });
      return {
        type: "notExistsAccountInDefiny",
        nameInProvider: accountInGoogle.name,
        imageUrl: accountInGoogle.imageUrl.toString(),
        language: result.language,
        preAccountToken,
      };
    },
  })
  .mutation("createAccount", {
    input: z.object({
      name: z.string().min(1).max(100),
      preAccountToken: zodType.PreAccountToken,
    }),
    output: zodType.CreateAccountPayload,
    resolve: async ({ ctx, input }): Promise<zodType.CreateAccountPayload> => {
      const preAccount = await i.findAndDeletePreAccount(
        ctx,
        input.preAccountToken
      );
      if (preAccount === undefined) {
        return { type: "notGeneratedPreAccountToken" };
      }
      const accountTokenAndHash = crateAccountTokenAndHash();
      await i.createAccount(ctx, {
        name: input.name,
        idIssueByGoogle: preAccount.idIssueByGoogle,
        accountTokenHash: accountTokenAndHash.accountTokenHash,
      });
      return { type: "ok", accountToken: accountTokenAndHash.accountToken };
    },
  });

export type AppRouter = typeof appRouter;

export default trpcNext.createNextApiHandler({
  router: appRouter,
  createContext: () => i.getFaunaClient(),
});
