import * as g from "graphql";
import * as type from "./type";
import * as key from "./key";
import Maybe from "graphql/tsutils/Maybe";
import { URL } from "url";
import * as tool from "./tool";
import * as database from "./database";

const makeObjectFieldMap = <Type extends { [k in string]: unknown }>(
    args: Type extends ({ id: string } | { hash: string })
        ? ({
              [Key in keyof Type]: Key extends ("id" | "hash")
                  ? {
                        type: g.GraphQLOutputType;
                        description: string;
                    }
                  : GraphQLFieldConfigWithArgs<Type, Key>;
          })
        : {
              [Key in keyof Type]: {
                  type: g.GraphQLOutputType;
                  description: string;
              };
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
    Type extends { [k in string]: unknown },
    Key extends keyof Type,
    T extends { [k in string]: unknown } // for allがあればなぁ
>(data: {
    type: g.GraphQLOutputType;
    args: { [k in keyof T]: { type: g.GraphQLInputType } };
    resolve: (source: Return<Type>, args: T) => Promise<Return<Type[Key]>>;
    description: string;
}): GraphQLFieldConfigWithArgs<Type, Key> =>
    ({
        type: data.type,
        args: data.args,
        resolve: (source, args, context, info) =>
            args.resolve(source, args) as any,
        description: data.description
    } as GraphQLFieldConfigWithArgs<Type, Key>);

/** resolveで返すべき部分型を生成する */
type Return<Type> = Type extends Array<infer E>
    ? Array<ReturnLoop<E>>
    : ReturnLoop<Type>;

/** resolveで返すべき部分型を生成する型関数のループ */
type ReturnLoop<Type> = Type extends { id: infer idType }
    ? { id: idType } & { [k in keyof Type]?: Return<Type[k]> }
    : Type extends { hash: infer hashType }
    ? { hash: hashType } & { [k in keyof Type]?: Return<Type[k]> }
    : { [k in keyof Type]?: Return<Type[k]> };

const makeQueryOrMutationField = <
    Args extends { [k in string]: unknown },
    Type
>(data: {
    type: g.GraphQLOutputType;
    args: {
        [a in keyof Args]: {
            type: g.GraphQLInputType;
            description: Maybe<string>;
        };
    };
    resolve: (args: Args) => Promise<Return<Type>>;
    description: string;
}): g.GraphQLFieldConfig<void, void, any> => {
    return {
        type: data.type,
        args: data.args,
        resolve: (source, args, context, info) => data.resolve(args),
        description: data.description
    };
};

const graphQLNonNullList = (type: g.GraphQLNullableType) =>
    g.GraphQLNonNull(g.GraphQLList(g.GraphQLNonNull(type)));

/**
 * 新規登録かログインするためのURLを得る。
 */
const getLogInUrl = makeQueryOrMutationField<
    { service: type.LogInService },
    URL
>({
    type: g.GraphQLNonNull(type.urlGraphQLType),
    args: {
        service: {
            type: g.GraphQLNonNull(type.logInServiceGraphQLType),
            description: type.logInServiceGraphQLType.description
        }
    },
    resolve: async args => {
        const accountService = args.service;
        switch (accountService) {
            case "google": {
                return tool.urlFromStringWithQuery(
                    "accounts.google.com/o/oauth2/v2/auth",
                    new Map([
                        ["response_type", "code"],
                        ["client_id", key.googleLogInClientId],
                        ["redirect_uri", key.googleLogInRedirectUri],
                        ["scope", "profile openid"],
                        [
                            "state",
                            await database.generateAndWriteLogInState("google")
                        ]
                    ])
                );
            }
            case "gitHub": {
                return tool.urlFromStringWithQuery(
                    "github.com/login/oauth/authorize",
                    new Map([
                        ["response_type", "code"],
                        ["client_id", key.gitHubLogInClientId],
                        ["redirect_uri", key.gitHubLogInRedirectUri],
                        ["scope", "read:user"],
                        [
                            "state",
                            await database.generateAndWriteLogInState("gitHub")
                        ]
                    ])
                );
            }
            case "line":
                return tool.urlFromStringWithQuery(
                    "access.line.me/oauth2/v2.1/authorize",
                    new Map([
                        ["response_type", "code"],
                        ["client_id", key.lineLogInClientId],
                        ["redirect_uri", key.lineLogInRedirectUri],
                        ["scope", "profile openid"],
                        [
                            "state",
                            await database.generateAndWriteLogInState("line")
                        ]
                    ])
                );
        }
    },
    description:
        "新規登録かログインするためのURLを得る。受け取ったURLをlocation.hrefに代入するとかして、各サービスの認証画面へ"
});

const setUserData = async (
    source: Return<type.User>
): ReturnType<typeof database.getUser> => {
    const userData = await database.getUser(source.id);
    source.name = userData.name;
    source.image = userData.image;
    source.introduction = userData.introduction;
    source.createdAt = userData.createdAt;
    source.branches = userData.branches;
    return userData;
};

/* ==========================================
                    User
   ==========================================
*/
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
                resolve: async (source, args) => {
                    if (source.name === undefined) {
                        return (await setUserData(source)).name;
                    }
                    return source.name;
                }
            }),
            image: makeObjectField({
                type: g.GraphQLNonNull(imageGraphQLType),
                description: "丸くて小さいプロフィール画像",
                args: {},
                resolve: async (source, args) => {
                    if (source.image === undefined) {
                        return (await setUserData(source)).image;
                    }
                    return source.image;
                }
            }),
            introduction: makeObjectField({
                type: g.GraphQLNonNull(g.GraphQLString),
                description: "紹介文",
                args: {},
                resolve: async (source, args) => {
                    if (source.introduction === undefined) {
                        return (await setUserData(source)).introduction;
                    }
                    return source.introduction;
                }
            }),
            createdAt: makeObjectField({
                type: g.GraphQLNonNull(type.dateTimeGraphQLType),
                description: "作成された日時",
                args: {},
                resolve: async (source, args) => {
                    if (source.createdAt === undefined) {
                        return (await setUserData(source)).createdAt;
                    }
                    return source.createdAt;
                }
            }),
            branches: makeObjectField({
                type: graphQLNonNullList(branchGraphQLType),
                description: "所有のしているプロジェクトのブランチ",
                args: {},
                resolve: async (source, args) => {
                    if (source.branches === undefined) {
                        return (await setUserData(source)).branches;
                    }
                    return source.branches;
                }
            })
        })
});

const imageGraphQLType = new g.GraphQLObjectType({
    name: "Image",
    fields: () =>
        makeObjectFieldMap<type.Image>({
            id: {
                type: g.GraphQLNonNull(g.GraphQLString),
                description:
                    "画像ID。https://us-central1-definy-lang.cloudfunctions.net/{id} のURLから画像を得ることができる"
            },
            base64EncodedPng: makeObjectField({
                type: g.GraphQLNonNull(type.base64EncodedPngGraphQLType),
                description: "Base64で表現されたPNG画像",
                args: {},
                resolve: async (source, args) => {
                    return type.base64EncodedPngFromString("base64imageDummy");
                }
            })
        })
});

/* ==========================================
                Project
   ==========================================
*/

const setProjectData = async (
    source: Return<type.Project>
): ReturnType<typeof database.getProject> => {
    const projectData = await database.getProject(source.id);
    source.branches = projectData.branches;
    source.masterBranch = projectData.masterBranch;
    return projectData;
};

const projectGraphQLType = new g.GraphQLObjectType({
    name: "Project",
    fields: () =>
        makeObjectFieldMap<type.Project>({
            id: {
                type: g.GraphQLNonNull(type.idGraphQLType),
                description: "プロジェクトを識別するためのID"
            },
            masterBranch: makeObjectField({
                type: g.GraphQLNonNull(branchGraphQLType),
                description: "正統で正式なブランチ",
                args: {},
                resolve: async (source, args) => {
                    if (source.masterBranch === undefined) {
                        return (await setProjectData(source)).masterBranch;
                    }
                    return source.masterBranch;
                }
            }),
            branches: makeObjectField({
                type: graphQLNonNullList(branchGraphQLType),
                description: "プロジェクトに存在する全てのブランチ",
                args: {},
                resolve: async (source, args) => {
                    if (source.branches === undefined) {
                        return (await setProjectData(source)).branches;
                    }
                    return source.branches;
                }
            }),
            taggedCommits: makeObjectField({
                type: graphQLNonNullList(commitGraphQLType),
                description: "タグ付きのコミット",
                args: {},
                resolve: async (source, args) => {
                    if (source.taggedCommits === undefined) {
                        return (await setProjectData(source)).taggedCommits;
                    }
                    return source.taggedCommits;
                }
            })
        }),
    description: "プロジェクト。ゲームやツールの1つに対応する"
});

/* ==========================================
                Branch
   ==========================================
*/
const branchGraphQLType = new g.GraphQLObjectType({
    name: "Branch",
    fields: () =>
        makeObjectFieldMap<type.Branch>({
            id: {
                type: g.GraphQLNonNull(type.idGraphQLType),
                description: "ブランチを識別するためのID"
            },
            name: makeObjectField({}),
            project: makeObjectField({}),
            description: makeObjectField({}),
            head: makeObjectField({})
        }),
    description: "複数のコミットを1列に並べて整理するもの"
});

const setBranch = async (
    source: Return<type.Branch>
): ReturnType<typeof database.getBranch> => {
    const data = await database.getBranch(source.id);
    source.name = data.name;
    source.project = data.project;
    source.description = data.description;
    source.head = data.head;
    return data;
};

/* ==========================================
                   Commit
   ==========================================
*/

const commitGraphQLType = new g.GraphQLObjectType({
    name: "Commit",
    fields: () =>
        makeObjectFieldMap<type.Commit>({
            hash: {
                type: g.GraphQLNonNull(type.hashGraphQLType),
                description: "コミットから導き出されるハッシュ値"
            },
            parentCommits: makeObjectField({}),
            tag: makeObjectField({}),
            commitSummary: makeObjectField({}),
            commitDescription: makeObjectField({}),
            author: makeObjectField({}),
            date: makeObjectField({}),
            projectName: makeObjectField({}),
            projectDescription: makeObjectField({}),
            children: makeObjectField({}),
            typeDefs: makeObjectField({}),
            partDefs: makeObjectField({}),
            dependencies: makeObjectField({})
        })
});

const setCommit = async (
    source: Return<type.Commit>
): ReturnType<typeof database.getCommit> => {
    const data = await database.getCommit(source.hash);
    source.parentCommits = data.parentCommits;
    source.tag = data.tag;
    source.projectName = data.projectName;
    source.projectDescription = data.projectDescription;
    source.children = data.children;
    source.typeDefs = data.typeDefs;
    source.partDefs = data.partDefs;
    source.dependencies = data.dependencies;
    return data;
};
/* ==========================================
               Module Snapshot
   ==========================================
*/
const setModuleSnapshot = async (
    source: Return<type.ModuleSnapshot>
): ReturnType<typeof database.getModuleSnapshot> => {
    const data = await database.getModuleSnapshot(source.hash);
    source.name = data.name;
    source.children = data.children;
    source.typeDefs = data.typeDefs;
    source.partDefs = data.partDefs;
    source.description = data.description;
    source.exposing = data.exposing;
    return data;
};

const moduleSnapshotGraphQLType: g.GraphQLObjectType<
    type.ModuleSnapshot,
    void,
    any
> = new g.GraphQLObjectType({
    name: "Module",
    fields: () =>
        makeObjectFieldMap<type.ModuleSnapshot>({
            hash: {
                type: g.GraphQLNonNull(type.idGraphQLType),
                description:
                    "モジュールのスナップショットから導き出されるハッシュ値"
            },
            name: makeObjectField({
                type: g.GraphQLNonNull(
                    g.GraphQLList(g.GraphQLNonNull(type.labelGraphQLType))
                ),
                description:
                    "モジュールの名前 リストをパスとして階層構造となす。",
                args: {},
                resolve: async (source, args) => {
                    if (source.name === undefined) {
                        return (await setModuleSnapshot(source)).name;
                    }
                    return source.name;
                }
            }),
            children: makeObjectField({
                type: graphQLNonNullList(moduleSnapshotGraphQLType),
                description: "子のモジュール",
                args: {},
                resolve: async (source, args) => {
                    if (source.children === undefined) {
                        return (await setModuleSnapshot(source)).children;
                    }
                    return source.children;
                }
            }),
            typeDefs: makeObjectField({
                type: g.GraphQLNonNull(
                    g.GraphQLList(g.GraphQLNonNull(typeDefinitionGraphQLType))
                ),
                description: "このモジュールにある型の定義",
                args: {},
                resolve: async (source, args) => {
                    if (source.typeDefs === undefined) {
                        return (await setModuleSnapshot(source)).typeDefs;
                    }
                    return source.typeDefs;
                }
            }),
            partDefs: makeObjectField({
                type: g.GraphQLNonNull(
                    g.GraphQLList(g.GraphQLNonNull(partDefinitionGraphQLType))
                ),
                description: "このモジュールにあるパーツ定義",
                args: {},
                resolve: async (source, args) => {
                    if (source.partDefs === undefined) {
                        return (await setModuleSnapshot(source)).partDefs;
                    }
                    return source.partDefs;
                }
            }),
            description: makeObjectField({
                type: g.GraphQLNonNull(g.GraphQLString),
                description: "モジュールの説明",
                args: {},
                resolve: async (source, args) => {
                    if (source.description === undefined) {
                        return (await setModuleSnapshot(source)).description;
                    }
                    return source.description;
                }
            }),
            exposing: makeObjectField({
                type: g.GraphQLNonNull(g.GraphQLBoolean),
                description: "モジュールをプロジェクトの外部に公開するかどうか",
                args: {},
                resolve: async (source, args) => {
                    if (source.exposing === undefined) {
                        return (await setModuleSnapshot(source)).exposing;
                    }
                    return source.exposing;
                }
            })
        }),
    description: "モジュール。複数の定義をまとめたもの。"
});

/* ==========================================
               Type Def Snapshot
   ==========================================
*/
const typeDefinitionGraphQLType = new g.GraphQLObjectType<
    type.TypeBody,
    void,
    any
>({
    name: "TypeDefinition",
    fields: () =>
        makeObjectFieldMap<type.TypeBody>({
            id: {
                type: g.GraphQLNonNull(type.idGraphQLType),
                description: "型を識別するためのもの"
            },
            name: makeObjectField({
                type: g.GraphQLNonNull(type.labelGraphQLType),
                description: "型の名前",
                args: {},
                resolve: async (source, args) => {
                    return type.labelFromString("typeDummyName");
                }
            })
        })
});

const setTypeDefSnapshot = () => {};
/* ==========================================
               Part Def Snapshot
   ==========================================
*/
const partDefinitionGraphQLType = new g.GraphQLObjectType<
    type.PartDefSnapshot,
    void,
    any
>({
    name: "PartDefinition",
    fields: () =>
        makeObjectFieldMap<type.PartDefSnapshot>({
            id: {
                type: g.GraphQLNonNull(type.idGraphQLType),
                description: "パーツを識別するためのもの"
            },
            name: makeObjectField({
                type: g.GraphQLNonNull(type.labelGraphQLType),
                description: "パーツの名前",
                args: {},
                resolve: async (source, args) => {
                    return type.labelFromString("partDummyName");
                }
            }),
            createdAt: makeObjectField({
                type: g.GraphQLNonNull(type.dateTimeGraphQLType),
                description: "作成日時",
                args: {},
                resolve: async (source, args) => {
                    return new Date();
                }
            })
        })
});

const setPartDefSnapshot = () => {};
/* ==========================================
               Expr Def Snapshot
   ==========================================
*/
const exprSnapshotGraphQLType = new g.GraphQLObjectType({});

const exprDefSnapshot = () => {};
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
            user: makeQueryOrMutationField<{ userId: type.UserId }, type.User>({
                args: {
                    userId: {
                        type: g.GraphQLNonNull(type.idGraphQLType),
                        description: "ユーザーを識別するためのID"
                    }
                },
                type: g.GraphQLNonNull(userGraphQLType),
                resolve: async args => {
                    return await database.getUser(args.userId);
                },
                description: "ユーザーの情報を取得する"
            }),
            allUser: makeQueryOrMutationField<{}, Array<type.User>>({
                args: {},
                type: g.GraphQLNonNull(
                    g.GraphQLList(g.GraphQLNonNull(userGraphQLType))
                ),
                resolve: async args => {
                    return await database.getAllUser();
                },
                description: "全てユーザーを取得する"
            }),
            getProject: makeQueryOrMutationField<
                { projectId: type.ProjectId },
                type.Project
            >({
                args: {
                    projectId: {
                        type: g.GraphQLNonNull(type.idGraphQLType),
                        description: "プロジェクトを識別するためのID"
                    }
                },
                type: g.GraphQLNonNull(projectGraphQLType),
                resolve: async args => {
                    return database.getProject(args.projectId);
                },
                description: "プロジェクトの情報を取得する"
            }),
            allProject: makeQueryOrMutationField<{}, Array<type.Project>>({
                args: {},
                type: g.GraphQLNonNull(
                    g.GraphQLList(g.GraphQLNonNull(projectGraphQLType))
                ),
                resolve: async args => {
                    return database.getAllProject();
                },
                description: "全てのプロジェクトを取得する"
            })
        }
    }),
    mutation: new g.GraphQLObjectType({
        name: "Mutation",
        description: "データを作成、更新ができる",
        fields: {
            getLogInUrl: makeQueryOrMutationField<
                { service: type.LogInService },
                URL
            >({
                type: g.GraphQLNonNull(type.urlGraphQLType),
                args: {
                    service: {
                        type: g.GraphQLNonNull(type.logInServiceGraphQLType),
                        description: type.logInServiceGraphQLType.description
                    }
                },
                resolve: async args => {
                    switch (args.service) {
                        case "google": {
                            return tool.urlFromStringWithQuery(
                                "accounts.google.com/o/oauth2/v2/auth",
                                new Map([
                                    ["response_type", "code"],
                                    ["client_id", key.googleLogInClientId],
                                    [
                                        "redirect_uri",
                                        key.googleLogInRedirectUri
                                    ],
                                    ["scope", "profile openid"],
                                    [
                                        "state",
                                        await database.generateAndWriteLogInState(
                                            "google"
                                        )
                                    ]
                                ])
                            );
                        }
                        case "gitHub": {
                            return tool.urlFromStringWithQuery(
                                "github.com/login/oauth/authorize",
                                new Map([
                                    ["response_type", "code"],
                                    ["client_id", key.gitHubLogInClientId],
                                    [
                                        "redirect_uri",
                                        key.gitHubLogInRedirectUri
                                    ],
                                    ["scope", "read:user"],
                                    [
                                        "state",
                                        await database.generateAndWriteLogInState(
                                            "gitHub"
                                        )
                                    ]
                                ])
                            );
                        }
                        case "line":
                            return tool.urlFromStringWithQuery(
                                "access.line.me/oauth2/v2.1/authorize",
                                new Map([
                                    ["response_type", "code"],
                                    ["client_id", key.lineLogInClientId],
                                    ["redirect_uri", key.lineLogInRedirectUri],
                                    ["scope", "profile openid"],
                                    [
                                        "state",
                                        await database.generateAndWriteLogInState(
                                            "line"
                                        )
                                    ]
                                ])
                            );
                    }
                },
                description:
                    "新規登録かログインするためのURLを得る。受け取ったURLをlocation.hrefに代入するとかして、各サービスの認証画面へ"
            }),
            addProject: makeQueryOrMutationField<
                {
                    accessToken: string;
                    name: type.Label;
                    editors: Array<type.UserId>;
                },
                type.Project
            >({
                args: {
                    accessToken: {
                        type: g.GraphQLNonNull(g.GraphQLString),
                        description: type.accessTokenDescription
                    },
                    name: {
                        type: g.GraphQLNonNull(type.labelGraphQLType),
                        description: "プロジェクトの名前"
                    },
                    editors: {
                        type: g.GraphQLNonNull(
                            g.GraphQLList(g.GraphQLNonNull(type.idGraphQLType))
                        ),
                        description: "編集可能にしたい人"
                    }
                },
                type: g.GraphQLNonNull(projectGraphQLType),
                resolve: async args => {
                    return database.addProject({
                        name: args.name,
                        editors: args.editors,
                        userId: await database.verifyAccessToken(
                            args.accessToken
                        )
                    });
                },
                description: "プロジェクトを作成する"
            }),
            pushProject: makeQueryOrMutationField<
                { accessToken: string },
                boolean
            >({
                args: {
                    accessToken: {
                        type: g.GraphQLNonNull(g.GraphQLString),
                        description: type.accessTokenDescription
                    },
                    commmits: {},
                    branchHead,
                    moduleSnapshot,
                    partDefSnapshot,
                    typeSnapshot
                },
                type: g.GraphQLNonNull(g.GraphQLBoolean),
                resolve: async args => {},
                description: "プロジェクトのCommitを保存する"
            })
        }
    })
});
