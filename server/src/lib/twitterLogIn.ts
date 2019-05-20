import * as crypto from "crypto";
import OAuth from "./oauthForTwitter";
import axios, { AxiosError } from "axios";
import { URLSearchParams } from "url";

const requestTokenUrl = "https://api.twitter.com/oauth/request_token";
const authUrl = "https://api.twitter.com/oauth/authenticate";
const AccessTokenUrl = "https://api.twitter.com/oauth/access_token";

const initOAuth = (consumerKey: string, consumerSecret: string) =>
    new OAuth({
        consumer: {
            key: consumerKey,
            secret: consumerSecret
        },
        signatureMethod: "HMAC-SHA1",
        hashFunction: (baseString, key) =>
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
        url: requestTokenUrl,
        method: "POST",
        data: {
            oauth_callback: callbackUrl
        }
    };

    // Get a "request token"
    const oauth = initOAuth(consumerKey, consumerSecret);
    const reqponse = await axios.post(requestData.url, requestData.data, {
        headers: {
            Authorization: oauth.toHeaderString(oauth.authorize(requestData))
        }
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
        url: `${authUrl}?${new URLSearchParams({
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
    screenName: string;
    userId: string;
}> => {
    const requestData = {
        url: AccessTokenUrl,
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
        headers: {
            Authorization: oauth.toHeaderString(oauth.authorize(requestData))
        }
    });
    // Ready to make signed requests on behalf of the user
    const query = new URLSearchParams(response.data.toString());

    /** Twitterの隠れたID */
    const userId = query.get("user_id") as string;
    /** @ で始まるID */
    const screenName = query.get("screen_name") as string;

    await getUserDisplayNameAndPicture(
        consumerKey,
        consumerSecret,
        query.get("oauth_token") as string,
        query.get("oauth_token_secret") as string,
        screenName
    );

    return {
        screenName: screenName,
        userId: userId
    };
};

const getUserDisplayNameAndPicture = async (
    consumerKey: string,
    consumerSecret: string,
    oauthToken: string,
    tokenSecret: string,
    screenName: string
) => {
    const requestData = {
        url:
            "https://api.twitter.com/1.1/users/show.json?" +
            new URLSearchParams({ screen_name: screenName }),
        method: "GET",
        data: {
            oauth_token: oauthToken,
            oauth_token_secret: tokenSecret
        }
    };
    const oauth = initOAuth(consumerKey, consumerSecret);
    console.log("screen_nameで再挑戦", screenName);
    try {
        const response = await axios.get(requestData.url, {
            headers: {
                Authorization:
                    oauth.toHeaderString(oauth.authorize(requestData)) +
                    `,screen_name=${encodeURIComponent("@" + screenName)}`
            }
        });
        console.log("twitter show.json = ", response.data);
    } catch (e) {
        console.error("response data", e.response.data);
        console.error("response status", e.response.status);
        console.error("response statusText", e.response.statusText);
        console.error("response headers", e.response.headers);
    }
};
