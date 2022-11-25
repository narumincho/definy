import { decode } from "https://deno.land/x/djwt@v2.8/mod.ts";
import * as zodType from "../../zodType.ts";
import { Mode } from "./mode.ts";

export type AccountDataInProvider = {
  readonly id: string;
  readonly name: string;
  readonly imageUrl: URL;
};

/**
 * ランダムな文字列を生成する. かぶることはない
 * @example "d93f1010a9ac4718b52eac4ed64c31e46c12b607afcc4a81a2789161b8e73ba0"
 */
const createRandomToken = (): string => {
  return (crypto.randomUUID() + crypto.randomUUID()).replaceAll("-", "");
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
  accountToken: zodType.AccountToken,
): Promise<Uint8Array> => {
  return new Uint8Array(
    await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(accountToken),
    ),
  );
};

export const googleLogInClientId =
  "8347840964-l3796imv2d11d0qi8cnb6r48n5jabk9t.apps.googleusercontent.com";

const createRedirectUri = (mode: Mode): URL => {
  if (mode.type === "denoDeploy") {
    return new URL(`https://definy-api.deno.dev/definyApi/logInCallback`);
  }
  return new URL(`http://localhost:${mode.port}/definyApi/logInCallback`);
};

export const googleLogInUrl = (state: string, mode: Mode): URL => {
  return createUrl(
    "https://accounts.google.com/o/oauth2/v2/auth",
    new Map([
      ["response_type", "code"],
      ["client_id", googleLogInClientId],
      [
        "redirect_uri",
        createRedirectUri(mode).toString(),
      ],
      ["scope", "profile openid"],
      ["state", state],
    ]),
  );
};

const createUrl = (
  originAndPath: string,
  query: ReadonlyMap<string, string>,
): URL => {
  const url = new URL(originAndPath);
  for (const [key, value] of query) {
    url.searchParams.append(key, value);
  }
  return url;
};

export const getAccountDataInGoogleFromCode = async (
  code: string,
  mode: Mode,
  googleLogInClientSecret: string,
): Promise<AccountDataInProvider | undefined> => {
  try {
    const response = await fetch("https://www.googleapis.com/oauth2/v4/token", {
      method: "POST",
      body: new URLSearchParams([
        ["grant_type", "authorization_code"],
        ["code", code],
        ["redirect_uri", createRedirectUri(mode).toString()],
        ["client_id", googleLogInClientId],
        ["client_secret", googleLogInClientSecret],
      ]),
      headers: {
        "content-type": "application/x-www-form-urlencoded",
      },
    });
    const responseAsJson: { id_token: unknown } = await response.json();
    const idToken = responseAsJson.id_token;
    if (typeof idToken !== "string") {
      console.error("Google idToken not include in response");
      return undefined;
    }
    const decoded = decode(idToken)[1];
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
        "Googleから送られてきたIDトークンがおかしい" + markedDecoded.toString(),
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
