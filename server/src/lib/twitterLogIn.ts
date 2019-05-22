import * as oauthForTwitter from "./oauthForTwitter";
import axios, { AxiosError } from "axios";
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

/** 多分これはTwitterから送られてきたトークンを解釈するところ */
export const callback = async (
    consumerKey: string,
    consumerSecret: string,
    oauthToken: string,
    oauthVerifier: string,
    tokenSecret: string
): Promise<{
    name: string;
    picture: URL;
    userId: string;
}> => {
    // Get a user "access token" and "access token secret"
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
    // Ready to make signed requests on behalf of the user
    const query = new URLSearchParams(response.data.toString());

    /** Twitterの隠れたID */
    const userId = query.get("user_id") as string;
    /** @ で始まるID この文字列には@ が含まれていない */
    const screenName = query.get("screen_name") as string;

    const userDataUrl = new URL(
        "https://api.twitter.com/1.1/users/show.json?" +
            new URLSearchParams({ screen_name: screenName })
    );
    console.log("このscreen idのツイッターアカウントで登録!", screenName);

    const userDataResponse = await axios.get(userDataUrl.toString(), {
        headers: {
            Authorization: oauthForTwitter.getAuthorizationHeaderValue(
                { key: consumerKey, secret: consumerSecret },
                tokenSecret,
                userDataUrl,
                "GET",
                new Map([
                    ["oauth_token", query.get("oauth_token") as string],
                    [
                        "oauth_token_secret",
                        query.get("oauth_token_secret") as string
                    ]
                ])
            )
        }
    });

    return {
        name: userDataResponse.data.name,
        picture: new URL(
            `https://twitter.com/${screenName}/profile_image?size=original`
        ),
        userId: userId
    };
};
