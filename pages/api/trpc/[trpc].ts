import * as trpc from "@trpc/server";
import * as trpcNext from "@trpc/server/adapters/next";
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
import {
  faunaInterface as i,
  typedFauna,
  zodType,
} from "../../../deno-lib/npm";
import { createProjectIconAndImage } from "../../../functions/image";
import { savePngFile } from "../../../functions/object-storage-interface";
import superjson from "superjson";
import { z } from "zod";

const getProjectByIdOutput = z.union([
  z.object({
    name: zodType.ProjectName,
    createdBy: zodType.AccountId,
    createdAt: z.date(),
    iconHash: zodType.ImageHash,
    imageHash: zodType.ImageHash,
  }),
  z.undefined(),
]);

type GetProjectByIdOutput = z.TypeOf<typeof getProjectByIdOutput>;

const getAccountByIdOutput = z.union([
  z.object({
    name: zodType.AccountName,
    createdAt: z.date(),
    imageUrl: z.string().url(),
  }),
  z.undefined(),
]);

type GetAccountByIdOutput = z.TypeOf<typeof getAccountByIdOutput>;

export const appRouter = trpc
  .router<typedFauna.TypedFaunaClient>()
  .transformer(superjson)
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
  .query("getAccountFromAccountToken", {
    input: zodType.AccountToken,
    output: z.nullable(
      z.object({
        name: z.string(),
        imageUrl: z.string(),
      })
    ),
    resolve: async ({ ctx, input }) => {
      const accountTokenHash = await hashAccountToken(input);
      const account = await i.getAccountByAccountToken(ctx, accountTokenHash);
      if (account === undefined) {
        return null;
      }
      return {
        name: account.name,
        imageUrl: account.imageUrl,
      };
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
      name: zodType.AccountName,
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
        imageUrl: preAccount.imageUrlInProvider.toString(),
      });
      return {
        type: "ok",
        accountToken: accountTokenAndHash.accountToken,
        language: preAccount.language,
        location: preAccount.location,
      };
    },
  })
  .mutation("createProject", {
    input: z.object({
      accountToken: zodType.AccountToken,
      projectName: zodType.ProjectName,
    }),
    output: z.object({ id: zodType.ProjectId, name: zodType.ProjectName }),
    resolve: async ({ ctx, input }) => {
      const account = await i.getAccountByAccountToken(
        ctx,
        await hashAccountToken(input.accountToken)
      );
      if (account === undefined) {
        throw new Error("不明なアカウントトークンです");
      }
      const iconAndImage = await createProjectIconAndImage();
      const [iconHash, imageHash] = await Promise.all([
        savePngFile(iconAndImage.icon),
        savePngFile(iconAndImage.image),
      ]);
      const projectId = await i.createProject(ctx, {
        name: input.projectName,
        createdBy: account.id,
        iconHash,
        imageHash,
      });
      return {
        id: projectId,
        name: input.projectName,
      };
    },
  })
  .query("getAllProjectIds", {
    input: z.undefined(),
    output: z.array(zodType.ProjectId),
    resolve: async ({ ctx }) => {
      const allProjectIds = await i.getAllProjectIds(ctx);
      return [...allProjectIds];
    },
  })
  .query("getProjectById", {
    input: zodType.ProjectId,
    output: getProjectByIdOutput,
    resolve: async ({ ctx, input }): Promise<GetProjectByIdOutput> => {
      const result = await i.getProject(ctx, input);
      if (result === undefined) {
        return undefined;
      }
      return result;
    },
  })
  .query("getAccountById", {
    input: zodType.AccountId,
    output: getAccountByIdOutput,
    resolve: async ({ ctx, input }): Promise<GetAccountByIdOutput> => {
      const result = await i.getAccount(ctx, input);
      if (result === undefined) {
        return undefined;
      }
      return {
        name: result.name,
        imageUrl: result.imageUrl,
        createdAt: result.createdAt,
      };
    },
  });

export type AppRouter = typeof appRouter;

export default trpcNext.createNextApiHandler({
  router: appRouter,
  createContext: () => i.getFaunaClient(FAUNA_SERVER_KEY),
});
