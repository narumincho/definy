import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import * as graphql from "graphql";
import * as graphalExpress from "express-graphql";
import axios, { AxiosResponse } from "axios";
import * as jwt from "jsonwebtoken";
import { URLSearchParams } from "url";
import * as secret from "./lib/secret";
import * as logInWithTwitter from "./lib/twitterLogIn";

admin.initializeApp();

const dataBase = admin.firestore();
const dataBaseUserCollection: FirebaseFirestore.CollectionReference = dataBase.collection(
    "user"
);
const dataBaseGoogleStateCollection: FirebaseFirestore.CollectionReference = dataBase.collection(
    "googleState"
);
const dataBaseGitHubStateCollection: FirebaseFirestore.CollectionReference = dataBase.collection(
    "gitHubState"
);
const dataBaseTwitterStateCollection: FirebaseFirestore.CollectionReference = dataBase.collection(
    "twitterState"
);
const dataBaseLineStateCollection: FirebaseFirestore.CollectionReference = dataBase.collection(
    "lineState"
);
const googleLogInRedirectUri = "https://definy-lang.firebaseapp.com/social_login/google_receiver" as const;
const googleLogInClientId = "8347840964-l3796imv2d11d0qi8cnb6r48n5jabk9t.apps.googleusercontent.com" as const;
const googleLogInSecret: string = secret.googleLogInSecret;
const gitHubLogInRedirectUri = "https://definy-lang.firebaseapp.com/social_login/github_receiver" as const;
const gitHubLogInClientId = "b35031a84487b285978e" as const;
const gitHubLogInSecret: string = secret.gitHubLogInSecret;
const twitterLogInRedirectUri = "https://definy-lang.firebaseapp.com/social_login/twitter_receiver" as const;
const twitterLogInClientId = "ubQixIjYdQTGhDQWVHm1BFFiD" as const;
const twitterLogInSecret: string = secret.twitterLogInSecret;
const lineLogInRedirectUri = "https://definy-lang.firebaseapp.com/social_login/line_code_receiver" as const;
const lineLogInClientId = "1574443672" as const;
const lineLogInSecret: string = secret.lineLogInSecret;
const refreshSecretKey: string = secret.refreshSecretKey;
const accessSecretKey: string = secret.accessSecretKey;

console.log("サーバーのプログラムが読み込まれた in lib folder");
/* =====================================================================
 *                          API (GraphQL)
 * =====================================================================
 */
const userType = new graphql.GraphQLObjectType({
    name: "User",
    fields: {
        id: {
            type: graphql.GraphQLNonNull(graphql.GraphQLID),
            description: "ランダムに生成されるユーザーのID"
        },
        displayName: {
            type: graphql.GraphQLNonNull(graphql.GraphQLString),
            description: "表示名"
        },
        imageUrl: {
            type: graphql.GraphQLNonNull(graphql.GraphQLString),
            description: "ユーザーの画像のURL(ソーシャルログイン元)"
        },
        createdAt: {
            type: graphql.GraphQLNonNull(graphql.GraphQLFloat),
            description:
                "ユーザーが作成された日時。UNIX timeにミリ秒の情報を加えた(x1000した)もの"
        }
    }
});

/** データベースで保存するデータの形式を決めるスキーマ */
const schema = new graphql.GraphQLSchema({
    query: new graphql.GraphQLObjectType({
        name: "Query",
        description: "データを取得できる",
        fields: {
            hello: {
                description: "世界に挨拶する",
                type: graphql.GraphQLNonNull(graphql.GraphQLString),
                resolve: () => "hello world!"
            },
            user: {
                description: "ユーザーの情報をユーザーIDから取得する",
                type: userType,
                args: {
                    id: {
                        description: "ユーザーID",
                        type: graphql.GraphQLNonNull(graphql.GraphQLString)
                    }
                },
                resolve: async (source, args, context, info) => {
                    const id: string = args.id;
                    const user: FirebaseFirestore.DocumentSnapshot = await dataBaseUserCollection
                        .doc(id)
                        .get();
                    if (!user.exists) {
                        throw new Error(`user id=${id} is not exists`);
                        return;
                    }
                    const userData = user.data() as FirebaseFirestore.DocumentData;
                    return {
                        id: id,
                        displayName: userData.displayName,
                        imageUrl: userData.imageUrl,
                        createdAt: userData.createdAt
                    };
                }
            },
            allUser: {
                description: "すべてのユーザーを取得する",
                type: graphql.GraphQLNonNull(graphql.GraphQLList(userType)),
                resolve: async (source, args, context, info) => {
                    return [];
                }
            }
        }
    }),
    mutation: new graphql.GraphQLObjectType({
        name: "Mutations",
        description: "データを作成、更新ができる",
        fields: {
            getAccessToken: {
                type: new graphql.GraphQLObjectType({
                    name: "AccessTokenAndRefreshToken",
                    description:
                        "各種データにアクセスするためのAccessTokenと、それを再発行してもらう新しいRefreshToken",
                    fields: {
                        accessToken: {
                            type: graphql.GraphQLNonNull(graphql.GraphQLString),
                            description:
                                "各種データにアクセスするために必要なトークン"
                        },
                        refeshToken: {
                            type: graphql.GraphQLNonNull(graphql.GraphQLString),
                            description:
                                "AccessTokenを再発行してもらうのに必要なトークン"
                        }
                    }
                }),
                args: {
                    refeshToken: {
                        type: graphql.GraphQLNonNull(graphql.GraphQLString),
                        description:
                            "初回時、ソーシャルログインでログインしたあとhttps://definy-lang.firebaseapp.comにリダイレクトしたときに、クエリに?refreshToken=がついてあるのでそれを使う。それ以降はここで得た新しいrefeshTokenを使う"
                    }
                },
                resolve: async (source, args, context, info) => {},
                description:
                    "RefreshTokenから、各種データにアクセスするためのAccessTokenと、それを再発行してもらう新しいRefreshTokenを得る"
            }
        }
    })
});

export const api = functions.https.onRequest(
    graphalExpress({ schema: schema, graphiql: true })
);

/* =====================================================================
 *                              Google
 * =====================================================================
 */
export const googleLogIn = functions.https.onRequest(
    async (request, response) => {
        const ref = await dataBaseGoogleStateCollection.add({});
        response.redirect(
            "https://accounts.google.com/o/oauth2/v2/auth?" +
                new URLSearchParams(
                    new Map([
                        ["response_type", "code"],
                        ["client_id", googleLogInClientId],
                        ["redirect_uri", googleLogInRedirectUri],
                        ["scope", "profile openid"],
                        ["state", ref.id]
                    ])
                ).toString()
        );
    }
);

/**
 * Googleでログインをしたあとのリダイレクト先
 */
export const googleLogInReceiver = functions.https.onRequest(
    async (request, response) => {
        console.log("Googleからのクエリだよー", request.query);
        const code: string | undefined = request.query.code;
        const state: string | undefined = request.query.state;
        if (code === undefined || state === undefined) {
            console.log("Googleからcodeかstateが送られて来なかった");
            response.send(
                "Google Server Error. need code and state query in redirect url"
            );
            return;
        }
        const docRef: FirebaseFirestore.DocumentReference = dataBaseGoogleStateCollection.doc(
            state
        );
        const doc: FirebaseFirestore.DocumentSnapshot = await docRef.get();
        if (!doc.exists) {
            console.log("Googleのログインで生成していないstateを指定された");
            response.send(
                `Google LogIn Error: definy do not generate state =${state}`
            );
            return;
        }
        docRef.delete();

        // ここでhttps://www.googleapis.com/oauth2/v4/tokenにqueryのcodeをつけて送信。IDトークンを取得する
        const googleData = googleTokenResponseToData(
            await axios.post(
                "https://www.googleapis.com/oauth2/v4/token",
                new URLSearchParams(
                    new Map([
                        ["grant_type", "authorization_code"],
                        ["code", code],
                        ["redirect_uri", googleLogInRedirectUri],
                        ["client_id", googleLogInClientId],
                        ["client_secret", googleLogInSecret]
                    ])
                ).toString(),
                {
                    headers: {
                        "Content-Type": "application/x-www-form-urlencoded"
                    }
                }
            )
        );
        console.log("googleData", googleData);
        // 取得したidトークンからプロフィール画像と名前とLINEのIDを取得する
        const exsitsData: FirebaseFirestore.QuerySnapshot = await dataBaseUserCollection
            .where("googleAccountId", "==", googleData.sub)
            .get();
        // そのあと、Definyにユーザーが存在するなら、そのユーザーのリフレッシュトークンを返す
        if (!exsitsData.empty) {
            console.log("LINEで登録したユーザーがいた");
            const doc: FirebaseFirestore.QueryDocumentSnapshot =
                exsitsData.docs[0];
            const docData = doc.data();
            // TODO アカウントの表示名の更新をここでやる?
            const refreshId = createRefreshId();
            doc.ref.update({
                newestRefreshId: refreshId
            });
            response.redirect(
                "/?" +
                    new URLSearchParams(
                        new Map([
                            [
                                "refreshToken",
                                createRefreshToken(doc.id, refreshId)
                            ],
                            ["accessToken", createAccessToken(doc.id, true)]
                        ])
                    ).toString
            );
            return;
        }
        // ユーザーが存在しないなら作成し、リフレッシュトークンを返す
        console.log("LINEで登録したユーザーがいなかった");
        const refreshId = createRefreshId();
        const newUserData = await dataBaseUserCollection.add({
            googleAccountId: googleData.sub,
            displayName: googleData.name,
            imageUrl: googleData.picture,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            newestRefreshId: refreshId
        });
        response.redirect(
            "/?" +
                new URLSearchParams(
                    new Map([
                        [
                            "refreshToken",
                            createRefreshToken(newUserData.id, refreshId)
                        ],
                        ["accessToken", createAccessToken(newUserData.id, true)]
                    ])
                ).toString()
        );
    }
);

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
export const gitHubLogIn = functions.https.onRequest(
    async (request, response) => {
        const ref = await dataBaseGitHubStateCollection.add({});
        response.redirect(
            "https://github.com/login/oauth/authorize?" +
                new URLSearchParams(
                    new Map([
                        ["response_type", "code"],
                        ["client_id", gitHubLogInClientId],
                        ["redirect_uri", gitHubLogInRedirectUri],
                        ["scope", "read:user"],
                        ["state", ref.id]
                    ])
                ).toString()
        );
    }
);
/** GitHubでログインをしたあとのリダイレクト先 */
export const gitHubLogInReceiver = functions.https.onRequest(
    async (request, response) => {
        const code: string | undefined = request.query.code;
        const state: string | undefined = request.query.state;
        if (code === undefined || state === undefined) {
            console.log("GitHubからcodeかstateが送られて来なかった");
            response.send(
                "GitHub Server Error. need code and state query in redirect url"
            );
            return;
        }
        const docRef: FirebaseFirestore.DocumentReference = dataBaseGitHubStateCollection.doc(
            state
        );
        const doc: FirebaseFirestore.DocumentSnapshot = await docRef.get();
        if (!doc.exists) {
            console.log("GitHubのログインで生成していないstateを指定された");
            response.send(
                `GitHub LogIn Error: definy do not generate state =${state}`
            );
            return;
        }
        docRef.delete();
        // ここでhttps://github.com/login/oauth/access_tokenにqueryのcodeをつけて送信。IDトークンを取得する
        const gitHubAccessToken = (await axios.post(
            "https://github.com/login/oauth/access_token?",
            new URLSearchParams(
                new Map([
                    ["grant_type", "authorization_code"],
                    ["code", code],
                    ["redirect_uri", gitHubLogInRedirectUri],
                    ["client_id", gitHubLogInClientId],
                    ["client_secret", gitHubLogInSecret]
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
        const exsitsData: FirebaseFirestore.QuerySnapshot = await dataBaseUserCollection
            .where("gitHubAccountId", "==", userData.id)
            .get();
        // そのあと、Definyにユーザーが存在するなら、そのユーザーのリフレッシュトークンを返す
        if (!exsitsData.empty) {
            console.log("LINEで登録したユーザーがいた");
            const doc: FirebaseFirestore.QueryDocumentSnapshot =
                exsitsData.docs[0];
            const docData = doc.data();
            // TODO アカウントの表示名の更新をここでやる?
            const refreshId = createRefreshId();
            doc.ref.update({
                newestRefreshId: refreshId
            });
            response.redirect(
                "/?" +
                    new URLSearchParams(
                        new Map([
                            [
                                "refreshToken",
                                createRefreshToken(doc.id, refreshId)
                            ],
                            ["accessToken", createAccessToken(doc.id, true)]
                        ])
                    ).toString()
            );
            return;
        }
        // ユーザーが存在しないなら作成し、リフレッシュトークンを返す
        console.log("LINEで登録したユーザーがいなかった");
        const refreshId = createRefreshId();
        const newUserData = await dataBaseUserCollection.add({
            gitHubAccountId: userData.id,
            displayName: userData.name,
            imageUrl: userData.avatarUrl,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            newestRefreshId: refreshId
        });
        response.redirect(
            "/?" +
                new URLSearchParams(
                    new Map([
                        [
                            "refreshToken",
                            createRefreshToken(newUserData.id, refreshId)
                        ],
                        ["accessToken", createAccessToken(newUserData.id, true)]
                    ])
                ).toString()
        );
    }
);
/* =====================================================================
 *                             Twitter
 * =====================================================================
 */
export const twitterLogIn = functions.https.onRequest(
    async (request, response) => {
        const { tokenSecret, url } = await logInWithTwitter.login(
            twitterLogInClientId,
            twitterLogInSecret,
            twitterLogInRedirectUri
        );
        await dataBaseTwitterStateCollection.doc("last").set({
            tokenSecret: tokenSecret
        });
        response.redirect(url);
    }
);

// https://definy-lang.firebaseapp.com/social_login/twitter_receiver?oauth_token=KF8BhAAAAAAA-elOAAABasnr89A&oauth_verifier=gjPOKoPD7ZG3wytwexrQmPWRQhCYNjLE
// こんなようなURLが帰ってきた
export const twitterLogInReceiver = functions.https.onRequest(
    async (request, response) => {
        const oauthToken: string | undefined = request.query.oauth_token;
        const oauthVerifier: string | undefined = request.query.oauth_verifier;
        if (oauthToken === undefined || oauthVerifier === undefined) {
            console.error(
                "Twitterからoauth_tokenかoauth_verifierが送られて来なかった"
            );
            response.send(
                "Twitter Server Error. need oauth_token and oauth_verifier query in redirect url"
            );
            return;
        }
        const lastData:
            | FirebaseFirestore.DocumentData
            | undefined = (await dataBaseTwitterStateCollection
            .doc("last")
            .get()).data();
        if (lastData === undefined) {
            console.error("Twitterの最後に保存したtokenSecretがない");
            response.send("Twitter LogIn Databese error: 最後のデータがない");
            return;
        }

        const twitterData = await logInWithTwitter.callback(
            twitterLogInClientId,
            twitterLogInSecret,
            oauthToken,
            oauthVerifier,
            lastData.tokenSecret
        );

        const exsitsData: FirebaseFirestore.QuerySnapshot = await dataBaseUserCollection
            .where("twitterAccountId", "==", twitterData.userId)
            .get();
        // そのあと、Definyにユーザーが存在するなら、そのユーザーのリフレッシュトークンを返す
        if (!exsitsData.empty) {
            console.log("Twitterで登録したユーザーがいた");
            const doc: FirebaseFirestore.QueryDocumentSnapshot =
                exsitsData.docs[0];
            const docData = doc.data();
            // TODO アカウントの表示名の更新をここでやる?
            const refreshId = createRefreshId();
            doc.ref.update({
                newestRefreshId: refreshId
            });
            response.redirect(
                "/?" +
                    new URLSearchParams(
                        new Map([
                            [
                                "refreshToken",
                                createRefreshToken(doc.id, refreshId)
                            ],
                            ["accessToken", createAccessToken(doc.id, true)]
                        ])
                    ).toString()
            );
            return;
        }
        // ユーザーが存在しないなら作成し、リフレッシュトークンを返す
        console.log("Twitterで登録したユーザーがいなかった");
        const refreshId = createRefreshId();
        const newUserData = await dataBaseUserCollection.add({
            twitterAccountId: twitterData.userId,
            displayName: twitterData.userName,
            imageUrl: "",
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            newestRefreshId: refreshId
        });
        response.redirect(
            "/?" +
                new URLSearchParams(
                    new Map([
                        [
                            "refreshToken",
                            createRefreshToken(newUserData.id, refreshId)
                        ],
                        ["accessToken", createAccessToken(newUserData.id, true)]
                    ])
                ).toString()
        );
    }
);
/* =====================================================================
 *                              LINE
 * =====================================================================
 */
export const lineLogIn = functions.https.onRequest(
    async (request, response) => {
        const ref = await dataBaseLineStateCollection.add({});
        response.redirect(
            "https://access.line.me/oauth2/v2.1/authorize?" +
                new URLSearchParams(
                    new Map([
                        ["response_type", "code"],
                        ["client_id", lineLogInClientId],
                        ["redirect_uri", lineLogInRedirectUri],
                        ["scope", "profile openid"],
                        ["state", ref.id]
                    ])
                ).toString()
        );
    }
);

/** LINEでログインをしたあとのリダイレクト先 */
export const lineLogInCodeReceiver = functions.https.onRequest(
    async (request, response) => {
        console.log("lineLogInCodeReceiver", request.query);
        const code: string | undefined = request.query.code;
        const state: string | undefined = request.query.state;
        if (code === undefined || state === undefined) {
            console.log("LINEからcodeかstateが送られて来なかった");
            response.send(
                "LINE Server Error. need code and state query in redirect url"
            );
            return;
        }
        const docRef: FirebaseFirestore.DocumentReference = dataBaseLineStateCollection.doc(
            state
        );
        const doc: FirebaseFirestore.DocumentSnapshot = await docRef.get();
        if (!doc.exists) {
            console.log("lineのログインで生成していないstateを指定された");
            response.send(
                `LINE LogIn Error: definy do not generate state =${state}`
            );
            return;
        }
        docRef.delete();

        // ここでhttps://api.line.me/oauth2/v2.1/tokenにqueryのcodeをつけて送信。IDトークンを取得する
        const lineData = await lineTokenResponseToData(
            await axios.post(
                "https://api.line.me/oauth2/v2.1/token",
                new URLSearchParams(
                    new Map([
                        ["grant_type", "authorization_code"],
                        ["code", code],
                        ["redirect_uri", lineLogInRedirectUri],
                        ["client_id", lineLogInClientId],
                        ["client_secret", lineLogInSecret]
                    ])
                ).toString(),
                {
                    headers: {
                        "Content-Type": "application/x-www-form-urlencoded"
                    }
                }
            )
        );

        const exsitsData: FirebaseFirestore.QuerySnapshot = await dataBaseUserCollection
            .where("lineAccountId", "==", lineData.sub)
            .get();
        // そのあと、Definyにユーザーが存在するなら、そのユーザーのリフレッシュトークンを返す
        if (!exsitsData.empty) {
            console.log("LINEで登録したユーザーがいた");
            const doc: FirebaseFirestore.QueryDocumentSnapshot =
                exsitsData.docs[0];
            const docData = doc.data();
            // TODO アカウントの表示名の更新をここでやる?
            const refreshId = createRefreshId();
            doc.ref.update({
                newestRefreshId: refreshId
            });
            response.redirect(
                "/?" +
                    new URLSearchParams(
                        new Map([
                            [
                                "refreshToken",
                                createRefreshToken(doc.id, refreshId)
                            ],
                            ["accessToken", createAccessToken(doc.id, true)]
                        ])
                    ).toString()
            );
            return;
        }
        // ユーザーが存在しないなら作成し、リフレッシュトークンを返す
        console.log("LINEで登録したユーザーがいなかった");
        const refreshId = createRefreshId();
        const newUserData = await dataBaseUserCollection.add({
            lineAccountId: lineData.sub,
            displayName: lineData.name,
            imageUrl: lineData.picture,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            newestRefreshId: refreshId
        });
        response.redirect(
            "/?" +
                new URLSearchParams(
                    new Map([
                        [
                            "refreshToken",
                            createRefreshToken(newUserData.id, refreshId)
                        ],
                        ["accessToken", createAccessToken(newUserData.id, true)]
                    ])
                ).toString()
        );
    }
);

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
            lineLogInSecret,
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

/**
 * ランダムなリフレッシュトークン用のIDを生成する
 */
const createRefreshId = (): string => {
    let id = "";
    const charTable: string =
        "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
    for (let i = 0; i < 15; i++) {
        id += charTable[(Math.random() * charTable.length) | 0];
    }
    return id;
};

/**
 * リフレッシュトークンを作成する 有効期限はなし
 * @param uid ユーザーID
 * @param refreshId リフレッシュトークンが最新のものか調べるためのもの
 */
const createRefreshToken = (uid: string, refreshId: string): string => {
    return jwt.sign(
        {
            sub: uid,
            jti: refreshId
        },
        refreshSecretKey,
        { algorithm: "HS256" }
    );
};

/**
 * アクセストークンを作成する。有効期限は作成時から15分後。
 * リフレッシュトークンで作成した場合はプロジェクト削除などの重要な操作はできないようにする。
 * @param uid ユーザーID
 * @param byRefreshToken リフレッシュトークンから作成したか
 */
const createAccessToken = (uid: string, byRefreshToken: boolean): string => {
    const time = new Date();
    time.setUTCMinutes(time.getUTCMinutes() + 15);
    return jwt.sign(
        {
            sub: uid,
            ref: byRefreshToken, //リフレッシュトークンでログインしたか
            exp: Math.round(time.getTime() / 1000) // 有効期限
        },
        accessSecretKey,
        { algorithm: "HS256" }
    );
};
