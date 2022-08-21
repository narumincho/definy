import * as jsonWebToken from "jsonwebtoken";
import axios, { AxiosResponse } from "axios";
import { GOOGLE_LOGIN_CLIENT_SECRET } from "./environmentVariables";
import { logInRedirectUri } from "../common/url";

export type AccountDataInProvider = {
  readonly id: string;
  readonly name: string;
  readonly imageUrl: URL;
};

export const googleLogInClientId =
  "8347840964-l3796imv2d11d0qi8cnb6r48n5jabk9t.apps.googleusercontent.com";

export const getAccountDataInGoogleFromCode = async (
  code: string
): Promise<AccountDataInProvider> => {
  const response = await axios.post<
    URLSearchParams,
    AxiosResponse<{ id_token: unknown }>
  >(
    "https://www.googleapis.com/oauth2/v4/token",
    new URLSearchParams([
      ["grant_type", "authorization_code"],
      ["code", code],
      ["redirect_uri", logInRedirectUri("Google")],
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
    throw new Error("Google idToken not include in response");
  }
  const decoded = jsonWebToken.decode(idToken);
  if (typeof decoded === "string" || decoded === null) {
    throw new Error("Google idToken not include object");
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
};
