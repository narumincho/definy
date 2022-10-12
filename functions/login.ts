import * as jsonWebToken from "jsonwebtoken";
import {
  GOOGLE_LOGIN_CLIENT_SECRET,
  isProduction,
} from "./environmentVariables";
import axios, { AxiosResponse } from "axios";
import { createRandomToken } from "./uuid";
import { webcrypto } from "node:crypto";
import type { zodType } from "../deno-lib/npm";

export type AccountDataInProvider = {
  readonly id: string;
  readonly name: string;
  readonly imageUrl: URL;
};

export const cratePreAccountToken = (): zodType.PreAccountToken => {
  return createRandomToken() as zodType.PreAccountToken;
};

export const crateAccountTokenAndHash = async (): Promise<{
  accountToken: zodType.AccountToken;
  accountTokenHash: Uint8Array;
}> => {
  const accountToken = createRandomToken() as zodType.AccountToken;
  return {
    accountToken,
    accountTokenHash: await hashAccountToken(accountToken),
  };
};

export const hashAccountToken = async (
  accountToken: zodType.AccountToken
): Promise<Uint8Array> => {
  return new Uint8Array(
    await webcrypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(accountToken)
    )
  );
};

export const googleLogInClientId =
  "8347840964-l3796imv2d11d0qi8cnb6r48n5jabk9t.apps.googleusercontent.com";

const googleLogInRedirectUri = isProduction
  ? "https://definy.vercel.app/logInCallback/google"
  : "http://localhost:3000/logInCallback/google";

export const googleLogInUrl = (state: string): URL => {
  return createUrl(
    "https://accounts.google.com/o/oauth2/v2/auth",
    new Map([
      ["response_type", "code"],
      ["client_id", googleLogInClientId],
      ["redirect_uri", googleLogInRedirectUri],
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

export const getAccountDataInGoogleFromCode = async (
  code: string
): Promise<AccountDataInProvider | undefined> => {
  try {
    const response = await axios.post<
      URLSearchParams,
      AxiosResponse<{ id_token: unknown }>
    >(
      "https://www.googleapis.com/oauth2/v4/token",
      new URLSearchParams([
        ["grant_type", "authorization_code"],
        ["code", code],
        ["redirect_uri", googleLogInRedirectUri],
        ["client_id", googleLogInClientId],
        ["client_secret", GOOGLE_LOGIN_CLIENT_SECRET],
      ]),
      {
        headers: {
          "content-type": "application/x-www-form-urlencoded",
        },
      }
    );
    const idToken = response.data.id_token;
    if (typeof idToken !== "string") {
      console.error("Google idToken not include in response");
      return undefined;
    }
    const decoded = jsonWebToken.decode(idToken);
    if (typeof decoded === "string" || decoded === null) {
      console.error("Google idToken not include object");
      return undefined;
    }
    const markedDecoded = decoded as {
      iss: unknown;
      sub: unknown;
      name: unknown;
      picture: unknown;
    };
    if (
      markedDecoded.iss !== "https://accounts.google.com" ||
      typeof markedDecoded.name !== "string" ||
      typeof markedDecoded.sub !== "string" ||
      typeof markedDecoded.picture !== "string"
    ) {
      console.error(
        "Googleから送られてきたIDトークンがおかしい" + markedDecoded.toString()
      );
      throw new Error("Google idToken is invalid");
    }

    return {
      id: markedDecoded.sub,
      name: markedDecoded.name,
      imageUrl: new URL(markedDecoded.picture),
    };
  } catch {
    return undefined;
  }
};
