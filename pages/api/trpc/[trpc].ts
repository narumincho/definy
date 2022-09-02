import * as i from "../../../functions/faunadb-interface";

import * as trpc from "@trpc/server";
import * as trpcNext from "@trpc/server/adapters/next";
import * as zodType from "../../../common/zodType";
import {
  FAUNA_SERVER_KEY,
  VERCEL_GIT_COMMIT_SHA,
} from "../../../functions/environmentVariables";
import {
  crateAccountTokenAndHash,
  cratePreAccountToken,
  getAccountDataInGoogleFromCode,
  googleLogInUrl,
  hashAccountToken,
} from "../../../functions/login";
import type { TypedFaunaClient } from "../../../functions/typedFauna";
import { z } from "zod";

export const appRouter = trpc
  .router<TypedFaunaClient>()
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
      const openConnectState = await i.getAndDeleteOpenConnectStateByState(
        ctx,
        input.state
      );
      if (openConnectState === undefined) {
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
        const accountTokenAndHash = await crateAccountTokenAndHash();
        i.updateAccountTokenHash(ctx, {
          id: accountInDefiny.id,
          accountTokenHash: accountTokenAndHash.accountTokenHash,
        });
        return {
          type: "logInOk",
          accountToken: accountTokenAndHash.accountToken,
          language: openConnectState.language,
          location: openConnectState.location,
        };
      }
      const preAccountToken = cratePreAccountToken();
      await i.createPreAccount(ctx, {
        idIssueByGoogle: accountInGoogle.id,
        imageUrlInProvider: accountInGoogle.imageUrl,
        preAccountToken,
        location: openConnectState.location,
        language: openConnectState.language,
      });
      return {
        type: "notExistsAccountInDefiny",
        nameInProvider: accountInGoogle.name,
        imageUrl: accountInGoogle.imageUrl.toString(),
        language: openConnectState.language,
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
      const accountTokenAndHash = await crateAccountTokenAndHash();
      await i.createAccount(ctx, {
        name: input.name,
        idIssueByGoogle: preAccount.idIssueByGoogle,
        accountTokenHash: accountTokenAndHash.accountTokenHash,
      });
      return {
        type: "ok",
        accountToken: accountTokenAndHash.accountToken,
        language: preAccount.language,
        location: preAccount.location,
      };
    },
  });

export type AppRouter = typeof appRouter;

export default trpcNext.createNextApiHandler({
  router: appRouter,
  createContext: () => i.getFaunaClient(FAUNA_SERVER_KEY),
});
