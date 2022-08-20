import * as trpc from "@trpc/server";
import * as trpcNext from "@trpc/server/adapters/next";
import { VERCEL_GIT_COMMIT_SHA } from "../../../functions/environmentVariables";
import { z } from "zod";

export const appRouter = trpc.router().query("gitCommitSha", {
  input: z.void(),
  output: z.string().nullable(),
  resolve() {
    if (VERCEL_GIT_COMMIT_SHA === "") {
      return null;
    }
    return VERCEL_GIT_COMMIT_SHA;
  },
});

export type AppRouter = typeof appRouter;

export default trpcNext.createNextApiHandler({
  router: appRouter,
  createContext: () => null,
});
