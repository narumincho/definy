import * as g from "graphql";
import * as type from "./type";
import * as key from "./key";
import Maybe from "graphql/tsutils/Maybe";
import { URL, resolve } from "url";
import * as tool from "./tool";
import * as database from "./database";

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
type ReturnLoop<Type> = {
    0: { [k in keyof Type]: Return<Type[k]> };
    1: { id: string } & { [k in keyof Type]?: Return<Type[k]> };
}[Type extends { id: string } ? 1 : 0];

const makeQueryOrMutationField = <
    Args extends { [k in string]: unknown },
    Type
>(data: {
    type: g.GraphQLOutputType;
    args: {
        [a in keyof Args]: {
            type: g.GraphQLInputType;
            description: Maybe<string>;
        }
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
    source.leaderProjects = userData.leaderProjects;
    source.editingProjects = userData.editingProjects;
    return userData;
};

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
            leaderProjects: makeObjectField({
                type: g.GraphQLNonNull(
                    g.GraphQLList(g.GraphQLNonNull(projectGraphQLType))
                ),
                description: "リーダーになっているプロジェクト",
                args: {},
                resolve: async (source, args) => {
                    if (source.leaderProjects === undefined) {
                        return (await setUserData(source)).leaderProjects;
                    }
                    return source.leaderProjects;
                }
            }),
            editingProjects: makeObjectField({
                type: g.GraphQLNonNull(
                    g.GraphQLList(g.GraphQLNonNull(projectGraphQLType))
                ),
                description: "制作に参加しているプロジェクト",
                args: {},
                resolve: async (source, args) => {
                    if (source.editingProjects === undefined) {
                        return (await setUserData(source)).editingProjects;
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

const setProjectData = async (
    source: Return<type.Project>
): ReturnType<typeof database.getProject> => {
    const projectData = await database.getProject(source.id);
    source.name = projectData.name;
    source.leader = projectData.leader;
    source.editors = projectData.editors;
    source.createdAt = projectData.createdAt;
    source.updateAt = projectData.updateAt;
    source.modules = projectData.modules;
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
            name: makeObjectField({
                type: g.GraphQLNonNull(type.labelGraphQLType),
                description: "プロジェクト名",
                args: {},
                resolve: async (source, args) => {
                    if (source.name === undefined) {
                        return (await setProjectData(source)).name;
                    }
                    return source.name;
                }
            }),
            leader: makeObjectField({
                type: g.GraphQLNonNull(userGraphQLType),
                description: "管理者",
                args: {},
                resolve: async (source, args) => {
                    if (source.leader === undefined) {
                        return (await setProjectData(source)).leader;
                    }
                    return source.leader;
                }
            }),
            editors: makeObjectField({
                type: g.GraphQLNonNull(
                    g.GraphQLList(g.GraphQLNonNull(userGraphQLType))
                ),
                description: "編集に参加できる人",
                args: {},
                resolve: async (source, args) => {
                    if (source.editors === undefined) {
                        return (await setProjectData(source)).editors;
                    }
                    return source.editors;
                }
            }),
            createdAt: makeObjectField({
                type: g.GraphQLNonNull(type.dateTimeGraphQLType),
                description: "作成日時",
                args: {},
                resolve: async (source, args) => {
                    if (source.createdAt === undefined) {
                        return (await setProjectData(source)).createdAt;
                    }
                    return source.createdAt;
                }
            }),
            updateAt: makeObjectField({
                type: g.GraphQLNonNull(type.dateTimeGraphQLType),
                description: "更新日時",
                args: {},
                resolve: async (source, args) => {
                    if (source.updateAt === undefined) {
                        return (await setProjectData(source)).updateAt;
                    }
                    return source.updateAt;
                }
            }),
            modules: makeObjectField({
                type: g.GraphQLNonNull(
                    g.GraphQLList(g.GraphQLList(moduleGraphQLType))
                ),
                description: "コードが書かれたモジュール",
                args: {},
                resolve: async (source, args) => {
                    if (source.modules === undefined) {
                        return (await setProjectData(source)).modules;
                    }
                    return source.modules;
                }
            })
        }),
    description: "プロジェクト。ゲームやツール1つに対応する"
});

const setModule = async (
    source: Return<type.Module>
): ReturnType<typeof database.getModule> => {
    const moduleData = await database.getModule(source.id);
    source.name = moduleData.name;
    source.project = moduleData.project;
    source.editors = moduleData.editors;
    source.createdAt = moduleData.createdAt;
    source.updateAt = moduleData.updateAt;
    source.typeDefinitions = moduleData.typeDefinitions;
    source.partDefinitions = moduleData.partDefinitions;
    return moduleData;
};

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
                type: g.GraphQLNonNull(
                    g.GraphQLList(g.GraphQLNonNull(type.labelGraphQLType))
                ),
                description:
                    "モジュールの名前 リストをパスとして階層構造となす。",
                args: {},
                resolve: async (source, args) => {
                    if (source.name === undefined) {
                        return (await setModule(source)).name;
                    }
                    return source.name;
                }
            }),
            editors: makeObjectField({
                type: g.GraphQLNonNull(
                    g.GraphQLList(g.GraphQLNonNull(userGraphQLType))
                ),
                description: "編集した人",
                args: {},
                resolve: async (source, args) => {
                    if (source.editors === undefined) {
                        return (await setModule(source)).editors;
                    }
                    return source.editors;
                }
            }),
            project: makeObjectField({
                type: g.GraphQLNonNull(projectGraphQLType),
                description: "所属しているプロジェクト",
                args: {},
                resolve: async (source, args) => {
                    if (source.project === undefined) {
                        return (await setModule(source)).project;
                    }
                    return source.project;
                }
            }),
            createdAt: makeObjectField({
                type: g.GraphQLNonNull(type.dateTimeGraphQLType),
                description: "作成日時",
                args: {},
                resolve: async (source, args) => {
                    if (source.createdAt === undefined) {
                        return (await setModule(source)).createdAt;
                    }
                    return source.createdAt;
                }
            }),
            updateAt: makeObjectField({
                type: g.GraphQLNonNull(type.dateTimeGraphQLType),
                description: "更新日時",
                args: {},
                resolve: async (source, args) => {
                    if (source.updateAt === undefined) {
                        return (await setModule(source)).updateAt;
                    }
                    return source.updateAt;
                }
            }),
            typeDefinitions: makeObjectField({
                type: g.GraphQLNonNull(
                    g.GraphQLList(g.GraphQLNonNull(typeDefinitionGraphQLType))
                ),
                description: "このモジュールにある型の定義",
                args: {},
                resolve: async (source, args) => {
                    if (source.typeDefinitions === undefined) {
                        return (await setModule(source)).typeDefinitions;
                    }
                    return source.typeDefinitions;
                }
            }),
            partDefinitions: makeObjectField({
                type: g.GraphQLNonNull(
                    g.GraphQLList(g.GraphQLNonNull(partDefinitionGraphQLType))
                ),
                description: "このモジュールにあるパーツ定義",
                args: {},
                resolve: async (source, args) => {
                    if (source.partDefinitions === undefined) {
                        return (await setModule(source)).partDefinitions;
                    }
                    return source.partDefinitions;
                }
            })
        }),
    description: "モジュール。複数の定義をまとめたもの。"
});

const typeDefinitionGraphQLType = new g.GraphQLObjectType<
    type.TypeDefinition,
    void,
    any
>({
    name: "TypeDefinition",
    fields: () =>
        makeObjectFieldMap<type.TypeDefinition>({
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

const partDefinitionGraphQLType = new g.GraphQLObjectType<
    type.PartDefinition,
    void,
    any
>({
    name: "PartDefinition",
    fields: () =>
        makeObjectFieldMap<type.PartDefinition>({
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
                            g.GraphQLList(g.GraphQLNonNull(userGraphQLType))
                        ),
                        description: "編集可能にしたい人"
                    }
                },
                type: g.GraphQLNonNull(projectGraphQLType),
                resolve: async args => {
                    return database.addProject({
                        name: args.name,
                        editors: args.editors,
                        leaderId: await database.verifyAccessToken(
                            args.accessToken
                        )
                    });
                },
                description: "プロジェクトを作成する"
            })
        }
    })
});
