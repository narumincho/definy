import * as oauthForTwitter from "./oauthForTwitter";
import axios from "axios";
import { URLSearchParams, URL } from "url";

const requestTokenUrl = new URL("https://api.twitter.com/oauth/request_token");
const authUrl = new URL("https://api.twitter.com/oauth/authenticate");
const accessTokenUrl: URL = new URL(
    "https://api.twitter.com/oauth/access_token"
);
const bearerTokenUrl = new URL("https://api.twitter.com/oauth2/token");

/** ログイン処理 */
export const login = async (
    consumerKey: string,
    consumerSecret: string,
    callbackUrl: string
): Promise<{
    tokenSecret: string;
    url: URL;
}> => {
    const reqponse = await axios.post(
        requestTokenUrl.toString(),
        { oauth_callback: callbackUrl },
        {
            headers: {
                Authorization: oauthForTwitter.getAuthorizationHeaderValue(
                    { key: consumerKey, secret: consumerSecret },
                    null,
                    requestTokenUrl,
                    "POST",
                    new Map([["oauth_callback", callbackUrl]])
                )
            }
        }
    );

    const query = new URLSearchParams(reqponse.data.toString());

    // Redirect visitor to this URL to authorize the app
    authUrl.searchParams.set("oauth_token", query.get("oauth_token") as string);

    return {
        tokenSecret: query.get("oauth_token_secret") as string,
        url: authUrl
    };
};

export const callback = async (
    consumerKey: string,
    consumerSecret: string,
    oauthToken: string,
    oauthVerifier: string,
    tokenSecret: string
): Promise<{
    name: string;
    picture: ArrayBuffer;
    userId: string;
} | null> => {
    const response = await axios.post(
        accessTokenUrl.toString(),
        {
            oauth_token: oauthToken,
            oauth_token_secret: tokenSecret,
            oauth_verifier: oauthVerifier
        },
        {
            headers: {
                Authorization: oauthForTwitter.getAuthorizationHeaderValue(
                    { key: consumerKey, secret: consumerSecret },
                    null,
                    accessTokenUrl,
                    "POST",
                    new Map([
                        ["oauth_token", oauthToken],
                        ["oauth_token_secret", tokenSecret],
                        ["oauth_verifier", oauthVerifier]
                    ])
                )
            }
        }
    );
    const query = new URLSearchParams(response.data.toString());
    /** Twitterの隠れたID */
    const userId = query.get("user_id") as string;
    /** @ で始まるID この文字列には@ が含まれていない */
    const screenName = query.get("screen_name") as string;

    try {
        return {
            name: await getUserName(consumerKey, consumerSecret, screenName),
            picture: await getUserImage(screenName),
            userId: userId
        };
    } catch (error) {
        return null;
    }
};

/** Twitterの表示名を取得する
 * @param screenName @から始まるID (@の文字は含まない)
 */
const getUserName = async (
    consumerApiKey: string,
    consumerApiSecret: string,
    screenName: string
): Promise<string> => {
    const bearerToken = await axios.post(
        bearerTokenUrl.toString(),
        new URLSearchParams({
            grant_type: "client_credentials"
        }).toString(),
        {
            auth: {
                username: consumerApiKey,
                password: consumerApiSecret
            },
            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            }
        }
    );

    const bearerAccessToken = bearerToken.data.access_token;

    const userDataUrl = new URL("https://api.twitter.com/1.1/users/show.json");
    userDataUrl.searchParams.set("screen_name", screenName);

    const userData = await axios.get(userDataUrl.toString(), {
        headers: { Authorization: "Bearer " + bearerAccessToken }
    });

    return userData.data.name;
};

const getUserImage = async (screenName: string): Promise<ArrayBuffer> => {
    const response = await axios.get(
        `https://twitter.com/${screenName}/profile_image?size=original`,
        { responseType: "arraybuffer" }
    );
    const imageArrayBuffer: ArrayBuffer = response.data;
    return imageArrayBuffer;
};
