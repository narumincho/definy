const expectString = (message: string, value: unknown) => {
  if (typeof value !== "string") {
    throw new Error(message + " が指定されていない!");
  }
  return value;
};

export const FAUNA_SERVER_KEY = expectString(
  "FAUNA_SERVER_KEY",
  process.env.FAUNA_SERVER_KEY
);

export const VERCEL_GIT_COMMIT_SHA = expectString(
  "VERCEL_GIT_COMMIT_SHA",
  process.env.VERCEL_GIT_COMMIT_SHA
);

export const GOOGLE_LOGIN_CLIENT_SECRET = expectString(
  "GOOGLE_LOGIN_CLIENT_SECRET",
  process.env.GOOGLE_LOGIN_CLIENT_SECRET
);

export const CLOUDFLARE_R2_SECRET_KEY = expectString(
  "CLOUDFLARE_R2_SECRET_KEY",
  process.env.CLOUDFLARE_R2_SECRET_KEY
);

export const isProduction: boolean = process.env.NODE_ENV === "production";
