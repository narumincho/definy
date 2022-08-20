export const FAUNA_SERVER_KEY = process.env.FAUNA_SERVER_KEY as string;

export const VERCEL_GIT_COMMIT_SHA = process.env
  .VERCEL_GIT_COMMIT_SHA as string;

export const isProduction: boolean = process.env.NODE_ENV === "production";
