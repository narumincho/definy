import * as crypto from "crypto";
import * as OAuth from "oauth-1.0a";
import axios from "axios";
import { URLSearchParams } from "url";

const TW_REQ_TOKEN_URL = "https://api.twitter.com/oauth/request_token";
const TW_AUTH_URL = "https://api.twitter.com/oauth/authenticate";
const TW_ACCESS_TOKEN_URL = "https://api.twitter.com/oauth/access_token";

const initOAuth = (consumerKey: string, consumerSecret: string) =>
    new OAuth({
        consumer: {
            key: consumerKey,
            secret: consumerSecret
        },
        signature_method: "HMAC-SHA1",
        hash_function: (baseString, key) =>
            crypto
                .createHmac("sha1", key)
                .update(baseString)
                .digest("base64")
    });

/** ログイン処理 */
export const login = async (
    consumerKey: string,
    consumerSecret: string,
    callbackUrl: string
): Promise<{
    tokenSecret: string;
    url: string;
}> => {
    const requestData = {
        url: TW_REQ_TOKEN_URL,
        method: "POST",
        data: {
            oauth_callback: callbackUrl
        }
    };

    // Get a "request token"
    const oauth = initOAuth(consumerKey, consumerSecret);
    const reqponse = await axios.post(requestData.url, requestData.data, {
        headers: oauth.toHeader(oauth.authorize(requestData))
    });
    const query = new URLSearchParams(reqponse.data.toString());

    // Must validate that this param exists, according to Twitter docs
    if (query.get("oauth_callback_confirmed") !== "true") {
        throw new Error(
            "Missing `oauth_callback_confirmed` parameter in response"
        );
    }

    // Redirect visitor to this URL to authorize the app
    return {
        tokenSecret: query.get("oauth_token_secret") as string,
        url: `${TW_AUTH_URL}?${new URLSearchParams({
            oauth_token: query.get("oauth_token") as string
        }).toString()}`
    };
};

/** 多分これはTwitterから送られてきたトークンを解釈するところなんだろう */
export const callback = async (
    consumerKey: string,
    consumerSecret: string,
    oauthToken: string,
    oauthVerifier: string,
    tokenSecret: string
): Promise<{
    userName: string;
    userId: string;
}> => {
    const requestData = {
        url: TW_ACCESS_TOKEN_URL,
        method: "POST",
        data: {
            oauth_token: oauthToken,
            oauth_token_secret: tokenSecret,
            oauth_verifier: oauthVerifier
        }
    };

    // Get a user "access token" and "access token secret"
    const oauth = initOAuth(consumerKey, consumerSecret);
    const response = await axios.post(requestData.url, requestData.data, {
        headers: oauth.toHeader(oauth.authorize(requestData))
    });
    // Ready to make signed requests on behalf of the user
    const query = new URLSearchParams(response.data.toString());

    /** Twitterの隠れたID */
    const userId = query.get("user_id") as string;
    await getUserDisplayNameAndPicture(
        oauth,
        query.get("oauth_token") as string,
        query.get("oauth_token_secret") as string,
        oauthVerifier,
        userId
    );

    return {
        userName: query.get("screen_name") as string,
        userId: query.get("user_id") as string
    };
};

const getUserDisplayNameAndPicture = async (
    oauth: OAuth,
    oauthToken: string,
    tokenSecret: string,
    oauth_verifier: string,
    userId: string
) => {
    const requestData = {
        url: "https://api.twitter.com/1.1/users/show.json",
        method: "GET",
        data: {
            oauth_token: oauthToken,
            oauth_token_secret: tokenSecret,
            oauth_verifier: oauth_verifier
        }
    };
    const response = await axios.get(
        "https://api.twitter.com/1.1/users/show.json?" +
            new URLSearchParams({ user_id: userId }),
        {
            headers: oauth.toHeader(oauth.authorize(requestData))
        }
    );
    console.log("twitter show.json = ", response.data);
};
