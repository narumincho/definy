import axios, { AxiosResponse } from "axios";
import * as database from "./database";
import * as key from "./key";
import { URL, URLSearchParams } from "url";
import * as tool from "./tool";
import * as jwt from "jsonwebtoken";
import * as type from "./type";

const domain = "definy-lang.web.app";
const homeUrl = tool.urlFromString(domain);

const createAccessTokenUrl = (accessToken: string): URL => {
    return tool.urlFromStringWithFragment(
        domain,
        new Map([["accessToken", accessToken]])
    );
};

export type Result =
    | { type: "redirect"; url: URL }
    | { type: "error"; message: string };
/* =====================================================================
 *                              Google
 * =====================================================================
 */
/**
 * Googleでログインをしたあとのリダイレクト先
 */
export const googleLogInReceiver = async (
    query: { [key in string]: unknown }
): Promise<Result> => {
    const code: unknown = query.code;
    const state: unknown = query.state;
    if (typeof code !== "string" || typeof state !== "string") {
        console.log(
            "Googleからcodeかstateが送られて来なかった。ユーザーがキャンセルした?"
        );
        return {
            type: "redirect",
            url: homeUrl
        };
    }
    // TODO ユーザーがキャンセルした場合、stateを削除できるのでは?

    if (!(await database.checkExistsAndDeleteState("google", state))) {
        return {
            type: "error",
            message: `Google LogIn Error: Definy dose not generate state(=${state})`
        };
    }
    // ここでhttps://www.googleapis.com/oauth2/v4/tokenにqueryのcodeをつけて送信。IDトークンを取得する
    const googleData = googleTokenResponseToData(
        await axios.post(
            "https://www.googleapis.com/oauth2/v4/token",
            new URLSearchParams(
                new Map([
                    ["grant_type", "authorization_code"],
                    ["code", code],
                    ["redirect_uri", key.googleLogInRedirectUri],
                    ["client_id", key.googleLogInClientId],
                    ["client_secret", key.googleLogInSecret]
                ])
            ).toString(),
            {
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded"
                }
            }
        )
    );
    // 取得したidトークンからプロフィール画像と名前とLINEのIDを取得する
    const definyUserData = await database.getUserFromLogInService({
        service: "google",
        accountId: googleData.sub
    });
    // そのあと、Definyにユーザーが存在するなら、そのユーザーのリフレッシュトークンを返す
    if (definyUserData !== null) {
        const accessToken = await database.createAccessToken(definyUserData.id);
        await database.updateLastAccessToken(definyUserData.id, accessToken);
        return {
            type: "redirect",
            url: createAccessTokenUrl(accessToken)
        };
    }
    // ユーザーが存在しないならユーザーを作成する
    const userImageId = await database.saveUserImageFromUrl(
        new URL(googleData.picture)
    );
    const { accessToken } = await database.addUser({
        name: type.userNameFromString(googleData.name.trim()),
        imageId: userImageId as type.FileHash,
        logInServiceAndId: {
            service: "google",
            accountId: googleData.sub
        }
    });
    return {
        type: "redirect",
        url: await createAccessTokenUrl(accessToken)
    };
};

const googleTokenResponseToData = (
    response: AxiosResponse<{ id_token: string }>
): {
    iss: "https://accounts.google.com";
    sub: string;
    name: string;
    picture: string;
} => {
    const idToken = response.data.id_token;
    console.log("googleIdToken id_token=", idToken);
    return jwt.decode(idToken) as {
        iss: "https://accounts.google.com";
        sub: string;
        name: string;
        picture: string;
    };
};
/* =====================================================================
 *                              GitHub
 * =====================================================================
 */
/** GitHubでログインをしたあとのリダイレクト先 */
export const gitHubLogInReceiver = async (
    query: { [key in string]: unknown }
): Promise<Result> => {
    const code: unknown = query.code;
    const state: unknown = query.state;
    if (typeof code !== "string" || typeof state !== "string") {
        console.log(
            "GitHubからcodeかstateが送られて来なかった。ユーザーがキャンセルした?"
        );
        return {
            type: "redirect",
            url: homeUrl
        };
    }
    if (!(await database.checkExistsAndDeleteState("gitHub", state))) {
        return {
            type: "error",
            message: `GitHub LogIn Error: Definy dose not generate state(=${state})`
        };
    }
    // ここでhttps://github.com/login/oauth/access_tokenにqueryのcodeをつけて送信。IDトークンを取得する
    const gitHubAccessToken = (await axios.post(
        "https://github.com/login/oauth/access_token?",
        new URLSearchParams(
            new Map([
                ["grant_type", "authorization_code"],
                ["code", code],
                ["redirect_uri", key.gitHubLogInRedirectUri],
                ["client_id", key.gitHubLogInClientId],
                ["client_secret", key.gitHubLogInSecret]
            ])
        ).toString(),
        {
            headers: {
                Accept: "application/json",
                "Content-Type": "application/x-www-form-urlencoded"
            }
        }
    )).data.access_token;

    const userData: {
        id: string;
        name: string;
        avatarUrl: string;
    } = (await axios.post(
        "https://api.github.com/graphql",
        {
            query: `
query {
    viewer {
        id
        name
        avatarUrl
    }
}
`
        },
        {
            headers: {
                Authorization: "token " + gitHubAccessToken
            }
        }
    )).data.data.viewer;
    const definyUserData = await database.getUserFromLogInService({
        service: "gitHub",
        accountId: userData.id
    });
    if (definyUserData !== null) {
        const accessToken = await database.createAccessToken(definyUserData.id);
        await database.updateLastAccessToken(definyUserData.id, accessToken);
        return {
            type: "redirect",
            url: createAccessTokenUrl(accessToken)
        };
    }
    // ユーザーが存在しないなら作成し、リフレッシュトークンを返す
    console.log("GitHubで登録したユーザーがいなかった");
    const imageId = await database.saveUserImageFromUrl(
        new URL(userData.avatarUrl)
    );
    const { accessToken } = await database.addUser({
        name: type.userNameFromString(userData.name.trim()),
        imageId: imageId as type.FileHash,
        logInServiceAndId: {
            service: "gitHub",
            accountId: userData.id
        }
    });
    return {
        type: "redirect",
        url: await createAccessTokenUrl(accessToken)
    };
};
/* =====================================================================
 *                              LINE
 * =====================================================================
 */
/** LINEでログインをしたあとのリダイレクト先 */
export const lineLogInReceiver = async (
    query: { [key in string]: unknown }
): Promise<Result> => {
    const code: unknown = query.code;
    const state: unknown = query.state;
    if (typeof code !== "string" || typeof state !== "string") {
        return {
            type: "redirect",
            url: homeUrl
        };
    }
    if (!(await database.checkExistsAndDeleteState("line", state))) {
        return {
            type: "error",
            message: `LINE LogIn Error: Definy dose not generate state(=${state})`
        };
    }

    // ここでhttps://api.line.me/oauth2/v2.1/tokenにqueryのcodeをつけて送信。IDトークンを取得する
    const lineData = await lineTokenResponseToData(
        await axios.post(
            "https://api.line.me/oauth2/v2.1/token",
            new URLSearchParams(
                new Map([
                    ["grant_type", "authorization_code"],
                    ["code", code],
                    ["redirect_uri", key.lineLogInRedirectUri],
                    ["client_id", key.lineLogInClientId],
                    ["client_secret", key.lineLogInSecret]
                ])
            ).toString(),
            {
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded"
                }
            }
        )
    );

    const definyUserData = await database.getUserFromLogInService({
        service: "line",
        accountId: lineData.sub
    });

    // そのあと、Definyにユーザーが存在するなら、そのユーザーのリフレッシュトークンを返す
    if (definyUserData !== null) {
        const accessToken = await database.createAccessToken(definyUserData.id);
        await database.updateLastAccessToken(definyUserData.id, accessToken);
        return {
            type: "redirect",
            url: createAccessTokenUrl(accessToken)
        };
    }
    // ユーザーが存在しないなら作成し、リフレッシュトークンを返す
    console.log("LINEで登録したユーザーがいなかった");
    const imageId = await database.saveUserImageFromUrl(
        new URL(lineData.picture)
    );
    const { accessToken } = await database.addUser({
        name: type.userNameFromString(lineData.name.trim()),
        imageId: imageId as type.FileHash,
        logInServiceAndId: {
            service: "line",
            accountId: lineData.sub
        }
    });
    return {
        type: "redirect",
        url: await createAccessTokenUrl(accessToken)
    };
};

/**
 * 取得したidトークンからプロフィール画像と名前とLINEのIDを取得する
 */
const lineTokenResponseToData = (
    response: AxiosResponse<{ id_token: string }>
): Promise<{
    iss: "https://access.line.me";
    sub: string;
    name: string;
    picture: string;
}> =>
    new Promise((resolve, reject) => {
        const idToken = response.data.id_token;
        console.log("lineToken id_token=", idToken);
        jwt.verify(
            idToken,
            key.lineLogInSecret,
            { algorithms: ["HS256"] },
            (err, decoded) => {
                if (err) {
                    console.log(
                        "lineTokenの正当性チェックで正当でないと判断された!"
                    );
                    reject("token invalid!");
                    return;
                }
                resolve(decoded as {
                    iss: "https://access.line.me";
                    sub: string;
                    name: string;
                    picture: string;
                });
            }
        );
    });
