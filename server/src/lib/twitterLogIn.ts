import axios from "axios";
import { URLSearchParams, URL } from "url";
import * as crypto from "crypto";

const requestTokenUrl = new URL("https://api.twitter.com/oauth/request_token");
const authUrl = new URL("https://api.twitter.com/oauth/authenticate");
const accessTokenUrl: URL = new URL(
    "https://api.twitter.com/oauth/access_token"
);
const bearerTokenUrl = new URL("https://api.twitter.com/oauth2/token");

/** ログインするためのURLを取得 */
export const getLoginUrl = async (
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
                Authorization: getAuthorizationHeaderValue(
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

export const authn = async (
    consumerKey: string,
    consumerSecret: string,
    oauthToken: string,
    oauthVerifier: string,
    tokenSecret: string
): Promise<AuthReturn> => {
    const response = await axios.post(
        accessTokenUrl.toString(),
        {
            oauth_token: oauthToken,
            oauth_token_secret: tokenSecret,
            oauth_verifier: oauthVerifier
        },
        {
            headers: {
                Authorization: getAuthorizationHeaderValue(
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
            c: AuthReturnC.NormalAccount,
            name: await getUserName(consumerKey, consumerSecret, screenName),
            imageUrl: new URL(
                `https://twitter.com/${screenName}/profile_image?size=original`
            ),
            twitterUserId: userId
        };
    } catch (error) {
        return { c: AuthReturnC.SecretAccount, twitterUserId: userId };
    }
};

type AuthReturn = NormalAccount | SecretAccount;

export const enum AuthReturnC {
    NormalAccount,
    SecretAccount
}

interface NormalAccount {
    c: AuthReturnC.NormalAccount;
    twitterUserId: string;
    imageUrl: URL;
    name: string;
}

interface SecretAccount {
    c: AuthReturnC.SecretAccount;
    twitterUserId: string;
}

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

/**
 * TwitterのためにつくったOAuth認証。OAuth 1.0 Revision A
 * 仕様書 https://oauth.net/core/1.0a/
 * 仕様書の日本語翻訳 https://openid-foundation-japan.github.io/rfc5849.ja.html
 */

const signatureMethod = "HMAC-SHA1";
const hashFunction = (data: string, key: string) =>
    crypto
        .createHmac("sha1", key)
        .update(data)
        .digest("base64");

/**
 * OAuth request authorize
 */
const getAuthorizationHeaderValue = (
    consumerApiKey: Consumer,
    tokenSecret: string | null,
    requestUrl: URL,
    requestMethod: "POST" | "GET",
    requestData: Map<string, string>
): string => {
    const data: Map<string, string> = new Map([
        ["oauth_consumer_key", consumerApiKey.key],
        ["oauth_nonce", createNonce()],
        ["oauth_signature_method", signatureMethod],
        ["oauth_timestamp", getTimeStampString()],
        ["oauth_version", "1.0"]
    ]);
    const headerString = toHeaderString(
        new Map([
            ...data,
            ...requestData, // urlからのパラメーターは不要なのか? headerにつけるのはoauth_のキーから始まるもののみ
            [
                "oauth_signature",
                getSignature(
                    requestUrl,
                    requestMethod,
                    requestData,
                    consumerApiKey,
                    tokenSecret,
                    data
                )
            ]
        ])
    );
    return headerString;
};

/**
 * Get OAuth data as Header
 */
const toHeaderString = (data: Map<string, string>): string =>
    "OAuth " +
    mapToSortedArray(data)
        .map(
            ([key, value]) => `${percentEncode(key)}="${percentEncode(value)}"`
        )
        .join(", ");

/**
 * Create a OAuth Signature
 */
const getSignature = (
    requestUrl: URL,
    requestMethod: "POST" | "GET",
    requestData: Map<string, string>,
    consumerApiKey: Consumer,
    tokenSecret: string | null,
    oauthData: Map<string, string>
): string =>
    hashFunction(
        getBaseString(requestUrl, requestMethod, requestData, oauthData),
        getSigningKey(consumerApiKey, tokenSecret)
    );

/**
 * Base String = Method + Base Url + ParameterString
 */
const getBaseString = (
    requestUrl: URL,
    requestMethod: "POST" | "GET",
    requestData: Map<string, string>,
    oauth_data: Map<string, string>
): string =>
    requestMethod +
    "&" +
    percentEncode(requestUrl.origin + requestUrl.pathname) +
    "&" +
    percentEncode(
        getParameterString(requestUrl.searchParams, requestData, oauth_data)
    );
/**
 * Get data from url
 * -> merge with oauth data
 * -> percent encode key & value
 * -> sort
 */
const getParameterString = (
    requestUrlSerchParms: URLSearchParams,
    requestData: Map<string, string>,
    oauthData: Map<string, string>
): string =>
    [...oauthData, ...requestData, ...requestUrlSerchParms.entries()]
        .sort()
        .map(([key, value]) => percentEncode(key) + "=" + percentEncode(value))
        .join("&");

/**
 * Create a Signing Key
 */
const getSigningKey = (
    consumerApiKey: Consumer,
    tokenSecret: string | null
): string => {
    return (
        percentEncode(consumerApiKey.secret) +
        "&" +
        (tokenSecret === null ? "" : percentEncode(tokenSecret))
    );
};

/**
 * Form data encoding.
 */
const percentEncode = (str: string): string =>
    encodeURIComponent(str)
        .replace(/\!/g, "%21")
        .replace(/\*/g, "%2A")
        .replace(/\'/g, "%27")
        .replace(/\(/g, "%28")
        .replace(/\)/g, "%29");

/**
 * Get Current Unix TimeStamp
 */
const getTimeStampString = (): string =>
    Math.floor(new Date().getTime() / 1000).toString();

interface Consumer {
    key: string;
    secret: string;
}

interface Param {
    [key: string]: string | Array<String>;
}

/**
 * ランダムなNonceをつくる
 */
const createNonce = (): string => {
    const word_characters =
        "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let result = "";

    for (var i = 0; i < 32; i++) {
        result += word_characters.charAt(
            Math.random() * word_characters.length
        );
    }

    return result;
};

/**
 * マップをキーでソートしたArray<[string, string]>を返す
 */
const mapToSortedArray = (map: Map<string, string>): Array<[string, string]> =>
    [...map.entries()].sort();
