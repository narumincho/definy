import * as crypto from "crypto";
import * as OAuth from "oauth-1.0a";
import axios from "axios";
import { URLSearchParams } from "url";

const TW_REQ_TOKEN_URL = "https://api.twitter.com/oauth/request_token";
const TW_AUTH_URL = "https://api.twitter.com/oauth/authenticate";
const TW_ACCESS_TOKEN_URL = "https://api.twitter.com/oauth/access_token";

export default class LoginWithTwitter {
    private consumerKey: string;
    private consumerSecret: string;
    private callbackUrl: string;
    private _oauth: OAuth;
    constructor(
        consumerKey: string,
        consumerSecret: string,
        callbackUrl: string
    ) {
        this.consumerKey = consumerKey;
        this.consumerSecret = consumerSecret;
        this.callbackUrl = callbackUrl;

        this._oauth = new OAuth({
            consumer: {
                key: this.consumerKey,
                secret: this.consumerSecret
            },
            signature_method: "HMAC-SHA1",
            hash_function: (baseString, key) =>
                crypto
                    .createHmac("sha1", key)
                    .update(baseString)
                    .digest("base64")
        });
    }

    /** ログイン処理 */
    login = async (): Promise<{
        tokenSecret: string;
        url: string;
    }> => {
        const requestData = {
            url: TW_REQ_TOKEN_URL,
            method: "POST",
            data: {
                oauth_callback: this.callbackUrl
            }
        };

        // Get a "request token"
        const reqponse = await axios.post(requestData.url, requestData.data, {
            headers: this._oauth.toHeader(this._oauth.authorize(requestData))
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
    callback = async (
        oauth_token: string,
        oauth_verifier: string,
        tokenSecret: string
    ): Promise<{
        userName: string | null;
        userId: string | null;
        userToken: string | null;
        userTokenSecret: string | null;
    }> => {
        // Check that required params exist
        if (oauth_token.length === 0) {
            throw new Error(
                "Invalid or missing `oauth_token` parameter for login callback"
            );
        }
        if (oauth_verifier.length === 0) {
            throw new Error(
                "Invalid or missing `oauth_verifier` parameter for login callback"
            );
        }
        if (tokenSecret.length === 0) {
            throw new Error(
                "Invalid or missing `tokenSecret` argument for login callback"
            );
        }

        const requestData = {
            url: TW_ACCESS_TOKEN_URL,
            method: "POST",
            data: {
                oauth_token: oauth_token,
                oauth_token_secret: tokenSecret,
                oauth_verifier: oauth_verifier
            }
        };

        // Get a user "access token" and "access token secret"
        const response = await axios.post(requestData.url, requestData.data, {
            headers: this._oauth.toHeader(this._oauth.authorize(requestData))
        });
        // Ready to make signed requests on behalf of the user
        const query = new URLSearchParams(response.data.toString());

        console.log("call back twitter data=");

        return {
            userName: query.get("screen_name"),
            userId: query.get("user_id"),
            userToken: query.get("oauth_token"),
            userTokenSecret: query.get("oauth_token_secret")
        };
    };
}
