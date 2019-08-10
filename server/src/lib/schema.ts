import * as g from "graphql";
import * as type from "./type";
import Maybe from "graphql/tsutils/Maybe";
import { initializedAdmin } from "./initializedAdmin";

const makeObjectFieldMap = <Type extends { [k in string]: unknown }>(
    args: Type extends { id: string }
        ? ({
              [Key in keyof Type]: Key extends "id"
                  ? {
                        type: g.GraphQLOutputType;
                        description: string;
                    }
                  : GraphQLFieldConfigWithArgs<Type, Key>
          })
        : {
              [Key in keyof Type]: {
                  type: g.GraphQLOutputType;
                  description: string;
              }
          }
): g.GraphQLFieldConfigMap<Type, void, any> => args;

type GraphQLFieldConfigWithArgs<
    Type extends { [k in string]: unknown },
    Key extends keyof Type // この型変数は型推論に使われる
> = {
    type: g.GraphQLOutputType;
    args: any;
    resolve: g.GraphQLFieldResolver<Type, void, any>;
    description: string;
    __byMakeObjectFieldFunctionBrand: never;
};

const makeObjectField = <
    Type extends { [k in string]: unknown } & { id: string },
    Key extends keyof Type,
    T extends { [k in string]: unknown } // for allがあればなぁ
>(args: {
    type: g.GraphQLOutputType;
    args: { [k in keyof T]: { type: g.GraphQLInputType } };
    resolve: (
        source: Return<Type>,
        args: T,
        context: void,
        info: g.GraphQLResolveInfo
    ) => Promise<Return<Type[Key]>>;
    description: string;
}): GraphQLFieldConfigWithArgs<Type, Key> =>
    ({
        type: args.type,
        args: args.args,
        resolve: args.resolve as any,
        description: args.description
    } as GraphQLFieldConfigWithArgs<Type, Key>);

/** resolveで返すべき部分型を生成する */
type Return<Type> = Type extends Array<infer E>
    ? Array<ReturnLoop<E>>
    : ReturnLoop<Type>;

/** resolveで返すべき部分型を生成する型関数のループ */
type ReturnLoop<Type> = {
    0: { [k in keyof Type]: Return<Type[k]> };
    1: { id: string } & { [k in keyof Type]?: Return<Type[k]> };
}[Type extends { id: string } ? 1 : 0];

const makeQueryOrMutationField = <
    Args extends { [k in string]: unknown },
    Type
>(args: {
    type: g.GraphQLOutputType;
    args: {
        [a in keyof Args]: {
            type: g.GraphQLInputType;
            description: Maybe<string>;
        }
    };
    resolve: (
        source: void,
        args: Args,
        context: void,
        info: g.GraphQLResolveInfo
    ) => Promise<Return<Type>>;
    description: string;
}): g.GraphQLFieldConfig<void, void, any> => args;

const getUser = makeQueryOrMutationField<{ userId: string }, type.User>({
    args: {
        userId: {
            type: g.GraphQLNonNull(type.idGraphQLType),
            description: "ユーザーを識別するためのID"
        }
    },
    type: g.GraphQLNonNull(g.GraphQLID),
    resolve: async (source, args, info, context) => {
        return {
            id: type.idFromString(args.userId)
        };
    },
    description: "ユーザーの情報を取得する"
});

const userGraphQLType: g.GraphQLObjectType<
    type.User,
    void,
    any
> = new g.GraphQLObjectType({
    name: "User",
    fields: () =>
        makeObjectFieldMap<type.User>({
            id: {
                type: g.GraphQLNonNull(type.idGraphQLType),
                description: "ユーザーを識別するためのID"
            },
            name: makeObjectField({
                type: g.GraphQLNonNull(g.GraphQLString),
                description: "名前",
                args: {},
                resolve: async (source, args, context, info) => {
                    if (source.name === undefined) {
                        return type.labelFromString("sampleUserName");
                    }
                    return source.name;
                }
            }),
            image: makeObjectField({
                type: g.GraphQLNonNull(imageGraphQLType),
                description: "丸くて小さいプロフィール画像",
                args: {},
                resolve: async (source, args, context, info) => {
                    if (source.image === undefined) {
                        return {
                            id: "id"
                        };
                    }
                    return source.image;
                }
            }),
            createdAt: makeObjectField({
                type: g.GraphQLNonNull(type.dateTimeGraphQLType),
                description: "作成された日時",
                args: {},
                resolve: async (source, args, context, info) => {
                    if (source.createdAt === undefined) {
                        return new Date();
                    }
                    return source.createdAt;
                }
            }),
            leaderProjectList: makeObjectField({
                type: g.GraphQLNonNull(
                    g.GraphQLList(g.GraphQLNonNull(projectGraphQLType))
                ),
                description: "リーダーになっているプロジェクト",
                args: {},
                resolve: async (source, args, context, info) => {
                    if (source.leaderProjectList === undefined) {
                        return [];
                    }
                    return source.leaderProjectList;
                }
            }),
            editingProjects: makeObjectField({
                type: g.GraphQLNonNull(
                    g.GraphQLList(g.GraphQLNonNull(projectGraphQLType))
                ),
                description: "制作に参加しているプロジェクト",
                args: {},
                resolve: async (source, args, context, info) => {
                    if (source.editingProjects === undefined) {
                        return [];
                    }
                    return source.editingProjects;
                }
            })
        })
});

const imageGraphQLType = new g.GraphQLObjectType({
    name: "Image",
    fields: () =>
        makeObjectFieldMap<type.Image>({
            id: makeObjectField({
                type: g.GraphQLNonNull(g.GraphQLString),
                description:
                    "画像ID。https://us-central1-definy-lang.cloudfunctions.net/{id} のURLから画像を得ることができる",
                args: {},
                resolve: async (source, args, context, info) => {
                    return "作成中";
                }
            }),
            base64EncodedPng: makeObjectField({
                type: g.GraphQLNonNull(type.base64EncodedPngGraphQLType),
                description: "Base64で表現されたPNG画像",
                args: {},
                resolve: async (source, args, context, info) => {
                    return type.base64EncodedPngFromString("base64imageDummy");
                }
            })
        })
});

const projectGraphQLType = new g.GraphQLObjectType({
    name: "Project",
    fields: () =>
        makeObjectFieldMap<type.Project>({
            id: {
                type: g.GraphQLNonNull(type.idGraphQLType),
                description: "プロジェクトを識別するためのID"
            },
            name: makeObjectField({
                type: g.GraphQLNonNull(type.labelGraphQLType),
                description: "プロジェクト名",
                args: {},
                resolve: async (source, args, context, info) => {
                    return type.labelFromString("sorena");
                }
            }),
            leader: makeObjectField({
                type: g.GraphQLNonNull(userGraphQLType),
                description: "管理者",
                args: {},
                resolve: async (source, args, context, info) => {
                    return { id: type.idFromString("a") };
                }
            }),
            editor: makeObjectField({
                type: g.GraphQLNonNull(
                    g.GraphQLList(g.GraphQLNonNull(userGraphQLType))
                ),
                description: "編集に参加した人",
                args: {},
                resolve: async (source, args, context, info) => {
                    return [];
                }
            }),
            createdAt: makeObjectField({
                type: g.GraphQLNonNull(type.dateTimeGraphQLType),
                description: "作成日時",
                args: {},
                resolve: async (source, args, context, info) => {
                    return new Date();
                }
            }),
            rootModule: makeObjectField({
                type: g.GraphQLNonNull(moduleGraphQLType),
                description: "コードが書かれたモジュール",
                args: {},
                resolve: async (source, args, context, info) => {
                    return { id: type.idFromString("moduleId") };
                }
            })
        })
});

const moduleGraphQLType: g.GraphQLObjectType<
    type.Module,
    void,
    any
> = new g.GraphQLObjectType({
    name: "Module",
    fields: () =>
        makeObjectFieldMap<type.Module>({
            id: {
                type: g.GraphQLNonNull(type.idGraphQLType),
                description: "モジュールを識別するためのID"
            },
            name: makeObjectField({
                type: g.GraphQLNonNull(type.labelGraphQLType),
                description: "",
                args: {},
                resolve: async (source, args, context, info) => {
                    return type.labelFromString("dummyName");
                }
            }),
            editor: makeObjectField({
                type: g.GraphQLNonNull(
                    g.GraphQLList(g.GraphQLNonNull(userGraphQLType))
                ),
                description: "編集した人",
                args: {},
                resolve: async (source, args, context, info) => {
                    return [];
                }
            }),
            childModules: makeObjectField({
                type: g.GraphQLNonNull(
                    g.GraphQLList(g.GraphQLNonNull(moduleGraphQLType))
                ),
                description: "サブモジュール",
                args: {},
                resolve: async (source, args, context, info) => {
                    return [];
                }
            }),
            createdAt: makeObjectField({
                type: g.GraphQLNonNull(type.dateTimeGraphQLType),
                description: "作成日時",
                args: {},
                resolve: async (source, args, context, info) => {
                    return new Date();
                }
            }),
            updateAt: makeObjectField({
                type: g.GraphQLNonNull(type.dateTimeGraphQLType),
                description: "更新日時",
                args: {},
                resolve: async (source, args, context, info) => {
                    return new Date();
                }
            })
        })
});

const firestore = initializedAdmin.firestore();
const userCollection = firestore.collection("user");
const dataCollection = firestore.collection("data");

const writeSample = makeQueryOrMutationField<{}, string>({
    type: g.GraphQLNonNull(g.GraphQLString),
    args: {},
    description: "書き込みサンプル",
    resolve: async (source, args, context, info) => {
        for (let i = 0; i < 1000; i) {
            const name = createRandomName();

            await dataCollection.add({
                userId: (await userCollection.add({
                    name: name
                })).id,
                userName: name
            });
        }
        return "ok";
    }
});

const readOptSample = makeQueryOrMutationField<{}, Array<string>>({
    type: g.GraphQLNonNull(g.GraphQLList(g.GraphQLNonNull(g.GraphQLString))),
    args: {},
    description: "読み込みサンプル",
    resolve: async (source, args, context, info) => {
        const docs = (await dataCollection.get()).docs;
        const result: Array<string> = [];
        for (const d of docs) {
            result.push(d.data().userName);
        }
        return result;
    }
});

const readNoOptSample = makeQueryOrMutationField<{}, Array<string>>({
    type: g.GraphQLNonNull(g.GraphQLList(g.GraphQLNonNull(g.GraphQLString))),
    args: {},
    description: "読み込みサンプル",
    resolve: async (source, args, context, info) => {
        const docs = (await dataCollection.get()).docs;
        const result: Array<string> = [];
        for (const d of docs) {
            const userId = d.data().userId;
            const userData = (await userCollection.doc(userId).get()).data();
            if (userData === undefined) {
                return ["存在しないユーザ"];
            }
            result.push(userData.name);
        }
        return result;
    }
});

const getData = makeQueryOrMutationField<{}, Array<string>>({
    type: g.GraphQLNonNull(g.GraphQLList(g.GraphQLNonNull(g.GraphQLString))),
    args: {},
    description: "読み込みサンプル",
    resolve: async (source, args, context, info) => {
        const docs = (await dataCollection.get()).docs;
        const result: Array<string> = [];
        for (const d of docs) {
            result.push(JSON.stringify(d.data()));
        }
        return result;
    }
});

const deleteSample = makeQueryOrMutationField<{}, string>({
    type: g.GraphQLNonNull(g.GraphQLString),
    args: {},
    description: "リセットして消す",
    resolve: async (source, args, context, info) => {
        const docs = (await userCollection.get()).docs;
        for (const d of docs) {
            await d.ref.delete();
        }
        console.log("user ok. run data");
        const dataDocs = (await dataCollection.get()).docs;
        await Promise.all(dataDocs.map(e => e.ref.delete()));
        return "ok!";
    }
});

const createRandomName = (): string => {
    let result = "";
    const charTable = "abcdefghijklmnopqrstuvwxyz";
    for (let i = 0; i < 30; i++) {
        result += charTable[Math.floor(charTable.length * Math.random())];
    }
    return result;
};
/*  =============================================================
                            Schema
    =============================================================
*/
export const schema = new g.GraphQLSchema({
    query: new g.GraphQLObjectType({
        name: "Query",
        description:
            "データを取得できる。データを取得したときに影響は他に及ばさない",
        fields: {
            getUser,
            getData
        }
    }),
    mutation: new g.GraphQLObjectType({
        name: "Mutation",
        description: "データを作成、更新ができる",
        fields: {
            writeSample,
            readNoOptSample,
            readOptSample,
            deleteSample
        }
    })
});
