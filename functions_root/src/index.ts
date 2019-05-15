import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import * as firebase from "firebase";
import * as graphql from "graphql";
import * as graphalExpress from "express-graphql";
import * as googleAuthLibrary from "google-auth-library";
import axios from "axios";

admin.initializeApp();
firebase.initializeApp({
    apiKey: functions.config().api.key,
    projectId: "definy-lang"
});

const dataBase = admin.firestore();
const dataBaseUserCollection: FirebaseFirestore.CollectionReference = dataBase.collection(
    "user"
);
const dataBaseLineStateCollection: FirebaseFirestore.CollectionReference = dataBase.collection(
    "lineState"
);
const googleAuth2Client = new googleAuthLibrary.OAuth2Client(
    "8347840964-gaqmes8h53is7pbon1jel1qfbjm7jt9g.apps.googleusercontent.com"
);
const lineSignUpRedirectUri = "https://definy-lang.firebaseapp.com/social_login/line_code_receiver" as const;
const lineSignUpClientId = "1574443672" as const;
const lineSingUpSecret: string = functions.config().line_sign_up.secret;

console.log("サーバーのプログラムが読み込まれた");

const userType = new graphql.GraphQLObjectType({
    name: "User",
    fields: {
        id: {
            type: graphql.GraphQLID,
            description: "ランダムに生成されるユーザーのID"
        },
        displayName: {
            type: graphql.GraphQLString,
            description: "表示名"
        },
        imageUrl: {
            type: graphql.GraphQLString,
            description: "ユーザーの画像のURL(ソーシャルログイン元)"
        },
        createdAt: {
            type: graphql.GraphQLFloat,
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
                type: graphql.GraphQLNonNull(graphql.GraphQLString),
                resolve: () => "hello world!",
                description: "世界に挨拶する"
            }
        }
    }),
    mutation: new graphql.GraphQLObjectType({
        name: "Mutations",
        description: "データを作成、更新ができる",
        fields: {
            singInWithGoogle: {
                type: userType,
                resolve: async (source, args, context, info) => {
                    const idToken: string = args.idToken;
                    console.log("トークンの正当性チェックをする", idToken);
                    const ticket = await googleAuth2Client.verifyIdToken({
                        idToken: idToken,
                        audience: [
                            "8347840964-gaqmes8h53is7pbon1jel1qfbjm7jt9g.apps.googleusercontent.com"
                        ]
                    });
                    const payload = ticket.getPayload() as {
                        sub: string;
                        name: string;
                        picture: string;
                    };
                    const googleAccountId = payload.sub;
                    const googleAccountName = payload.name;
                    const googleAccountImageUrl = payload.picture;
                    console.log("googleアカウントの情報を取得!", {
                        id: googleAccountId,
                        displayName: googleAccountName,
                        imageUrl: googleAccountImageUrl
                    });
                    const exsitsData: FirebaseFirestore.QuerySnapshot = await dataBaseUserCollection
                        .where("googleAccountId", "==", googleAccountId)
                        .get();
                    if (!exsitsData.empty) {
                        console.log("ユーザーが存在した");
                        const doc: FirebaseFirestore.QueryDocumentSnapshot =
                            exsitsData.docs[0];
                        const docData = doc.data();
                        // TODO アカウントの表示名の更新をここでやる?
                        return {
                            id: doc.id,
                            displayName: docData.googleAccountName,
                            imageUrl: docData.googleAccountImageUrl,
                            createdAt: doc.createTime.toMillis()
                        };
                    }
                    const documentReference = await dataBaseUserCollection.add({
                        googleAccountId: googleAccountId,
                        googleAccountName: googleAccountName,
                        googleAccountImageUrl: googleAccountImageUrl
                    });
                    const docRef = await documentReference.get();
                    const doc = docRef.data() as {
                        googleAccountId: string;
                        googleAccountName: string;
                        googleAccountImageUrl: string;
                    };

                    return {
                        id: documentReference.id,
                        displayName: doc.googleAccountName,
                        imageUrl: doc.googleAccountImageUrl,
                        createdAt: (docRef.createTime as FirebaseFirestore.Timestamp).toMillis()
                    };
                },
                args: {
                    idToken: {
                        type: graphql.GraphQLNonNull(graphql.GraphQLString),
                        description:
                            "Google Sign-In for Websites (https://developers.google.com/identity/sign-in/web/backend-auth)で手に入れられるidToken"
                    }
                }
            }
        }
    })
});

export const api = functions.https.onRequest(
    graphalExpress({ schema: schema, graphiql: true })
);

const queryToString = (queryMap: Map<string, string>): string => {
    const result = [];
    for (const [key, value] of queryMap.entries()) {
        result.push(key + "=" + encodeURIComponent(value));
    }
    return result.join("&");
};

/*
 *  LINE
 */
export const lineLogIn = functions.https.onRequest(
    async (request, response) => {
        const ref = await dataBaseLineStateCollection.add({});
        response.redirect(
            "https://access.line.me/oauth2/v2.1/authorize?" +
                queryToString(
                    new Map([
                        ["response_type", "code"],
                        ["client_id", lineSignUpClientId],
                        ["redirect_uri", lineSignUpRedirectUri],
                        ["scope", "profile openid"],
                        ["state", ref.id]
                    ])
                )
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
            response.send("LINE Server Error");
            return;
        }
        const doc = await dataBaseLineStateCollection.doc(state).get();
        if (!doc.exists) {
            console.log("lineのログインで生成していないstateを指定された");
            response.send(
                `LINE LogIn Error: definy do not generate state =${state}`
            );
            return;
        }

        // ここでhttps://api.line.me/oauth2/v2.1/tokenにqueryのcodeをつけて送信。idトークンを取得する
        const lineTokenResponse = await axios.post(
            "https://api.line.me/oauth2/v2.1/token",
            queryToString(
                new Map([
                    ["grant_type", "authorization_code"],
                    ["code", code],
                    ["redirect_uri", lineSignUpRedirectUri],
                    ["client_id", lineSignUpClientId],
                    ["client_secret", lineSingUpSecret]
                ])
            ),
            {
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded"
                }
            }
        );
        console.log("lineTokenResponse.data", lineTokenResponse.data);
        // 取得したidトークンが正しいものか確認して、そこからプロフィール画像と名前とLINEのIDを取得する
        // そのあと、Definyにユーザーが存在するなら、そのユーザーのリフレッシュトークンを返す
        // ユーザーが存在しないなら作成する。リフレッシュトークンを返す
        // でもここで返すのはDefinyの初期表示データ(HTML)だから、リフレッシュトークンだけ返すっていうのはできない
        // じゃあその前段階のidTokenを返すのはどうだろう。idTokenにはユーザーIDとその署名が入っているがこれも漏れたらというかアクセストークンと同じくらいの権限だなこれ
        response.redirect("/?refreshToken=refreshToken");
    }
);
/*

            setData: {
                type: new graphql.GraphQLObjectType({
                    name: "stringDataBase",
                    fields: {
                        id: {
                            type: graphql.GraphQLID,
                            description: "ランダムに生成されるID"
                        },
                        text: {
                            type: graphql.GraphQLString,
                            description: "前後の空白が取り除かれたテキスト"
                        },
                        createdAt: {
                            type: graphql.GraphQLFloat,
                            description: "投稿された日時。JSのnew Date().getTime()で取得できるようなUNIX timeにミリ秒の情報を加えた(x1000した)もの"
                        }
                    }
                }),
                resolve: async (source, args, context, info) => {
                    const text: string = args.text
                    const documentReference = await dataBaseCollection.add({
                        text: text.trim(),
                        createdAt: admin.firestore.FieldValue.serverTimestamp()
                    })
                    const documentData = (await documentReference.get()).data() as { text: string, createdAt: FirebaseFirestore.Timestamp }
                    return {
                        id: documentReference.id,
                        text: documentData.text,
                        createdAt: documentData.createdAt.toMillis()
                    }
                },
                args: {
                    text: {
                        type: graphql.GraphQLNonNull(graphql.GraphQLString),
                        description: "設定する文字列"
                    }
                },
                description: "データベースに文字列をアップロードする"
            },

*/
