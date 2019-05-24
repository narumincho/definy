import * as crypto from "crypto";
import { URL, URLSearchParams } from "url";

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
export const getAuthorizationHeaderValue = (
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
