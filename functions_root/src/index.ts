import * as functions from "firebase-functions"
import * as admin from "firebase-admin"
import * as graphql from "graphql"
import * as graphalExpress from "express-graphql"

admin.initializeApp();
const dataBase = admin.firestore();
const dataBaseCollection = dataBase.collection("stringDataBase");

console.log("サーバーのプログラムが読み込まれた")

/** データベースで保存するデータの形式を決めるスキーマ */
const schema = new graphql.GraphQLSchema({
    query: new graphql.GraphQLObjectType({
        name: "RootQueryType",
        description: "RootQueryTypeの説明。たぶんルートのクエリの型なんだと思う",
        fields: {
            hello: {
                type: graphql.GraphQLNonNull(graphql.GraphQLString),
                resolve: () => "hello world!",
                description: "世界に挨拶する"
            },
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
            }
        }
    })
})

export const api = functions.https.onRequest(graphalExpress({ schema: schema, graphiql: true }));