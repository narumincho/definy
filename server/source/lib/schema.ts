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
            data.resolve(source as any, args),
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
    { service: type.SocialLoginService },
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

/* ==========================================
                    User
   ==========================================
*/
const userGraphQLType: g.GraphQLObjectType<
    type.User,
    void,
    any
> = new g.GraphQLObjectType<type.User>({
    name: "User",
    fields: () =>
        makeObjectFieldMap<type.User>({
            id: {
                type: g.GraphQLNonNull(type.idGraphQLType),
                description: "ユーザーを識別するためのID"
            },
            name: makeObjectField({
                type: g.GraphQLNonNull(type.userNameGraphQLType),
                description: "名前",
                args: {},
                resolve: async (source, args) => {
                    if (source.name === undefined) {
                        return (await setUserData(source)).name;
                    }
                    return source.name;
                }
            }),
            imageFileHash: makeObjectField({
                type: g.GraphQLNonNull(type.hashGraphQLType),
                description:
                    "丸くて小さいプロフィール画像" + type.fileHashDescription,
                args: {},
                resolve: async (source, args) => {
                    if (source.imageFileHash === undefined) {
                        return (await setUserData(source)).imageFileHash;
                    }
                    return source.imageFileHash;
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

const setUserData = async (
    source: Return<type.User>
): ReturnType<typeof database.getUser> => {
    const userData = await database.getUser(source.id);
    source.name = userData.name;
    source.imageFileHash = userData.imageFileHash;
    source.introduction = userData.introduction;
    source.createdAt = userData.createdAt;
    source.branches = userData.branches;
    return userData;
};

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

const projectGraphQLType: g.GraphQLObjectType<
    type.Project,
    void,
    any
> = new g.GraphQLObjectType({
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
            name: makeObjectField({
                type: g.GraphQLNonNull(type.labelGraphQLType),
                description: "ブランチの名前",
                args: {},
                resolve: async (source, args) => {
                    if (source.name === undefined) {
                        return (await setBranch(source)).name;
                    }
                    return source.name;
                }
            }),
            project: makeObjectField({
                type: g.GraphQLNonNull(projectGraphQLType),
                description: "ブランチが所属するプロジェクト",
                args: {},
                resolve: async (source, args) => {
                    if (source.project === undefined) {
                        return (await setBranch(source)).project;
                    }
                    return source.project;
                }
            }),
            description: makeObjectField({
                type: g.GraphQLNonNull(g.GraphQLString),
                description: "ブランチの説明",
                args: {},
                resolve: async (source, args) => {
                    if (source.description === undefined) {
                        return (await setBranch(source)).description;
                    }
                    return source.description;
                }
            }),
            head: makeObjectField({
                type: g.GraphQLNonNull(commitGraphQLType),
                description: "ブランチの最新のコミット",
                args: {},
                resolve: async (source, args) => {
                    if (source.head === undefined) {
                        return (await setBranch(source)).head;
                    }
                    return source.head;
                }
            }),
            owner: makeObjectField({
                type: g.GraphQLNonNull(userGraphQLType),
                description: "ブランチの所有者",
                args: {},
                resolve: async (source, args) => {
                    if (source.owner === undefined) {
                        return (await setBranch(source)).owner;
                    }
                    return source.owner;
                }
            }),
            draftCommit: makeObjectField({
                type: g.GraphQLNonNull(draftCommitGraphQLType),
                description: "ドラフトコミット",
                args: {},
                resolve: async (source, args) => {
                    if (source.draftCommit === undefined) {
                        return await (await setBranch(source)).draftCommit;
                    }
                    return source.draftCommit;
                }
            })
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
    source.owner = data.owner;
    source.draftCommit = data.draftCommit;
    return data;
};

/* ==========================================
                   Commit
   ==========================================
*/

const commitGraphQLType: g.GraphQLObjectType<
    type.Commit,
    void,
    any
> = new g.GraphQLObjectType({
    name: "Commit",
    fields: () =>
        makeObjectFieldMap<type.Commit>({
            hash: {
                type: g.GraphQLNonNull(type.hashGraphQLType),
                description: "コミットから導き出されるハッシュ値"
            },
            parentCommits: makeObjectField({
                type: graphQLNonNullList(commitGraphQLType),
                description: "親(前回の)のコミット",
                args: {},
                resolve: async (source, args) => {
                    if (source.parentCommits === undefined) {
                        return (await setCommit(source)).parentCommits;
                    }
                    return source.parentCommits;
                }
            }),
            releaseId: makeObjectField({
                type: type.idGraphQLType,
                description: "リリースID",
                args: {},
                resolve: async (source, args) => {
                    if (source.releaseId === undefined) {
                        return await setCommit(source);
                    }
                    return source.releaseId;
                }
            }),
            author: makeObjectField({
                type: g.GraphQLNonNull(userGraphQLType),
                description: "作成したユーザー",
                args: {},
                resolve: async (source, args) => {
                    if (source.author === undefined) {
                        return (await setCommit(source)).author;
                    }
                    return source.author;
                }
            }),
            date: makeObjectField({
                type: g.GraphQLNonNull(type.dateTimeGraphQLType),
                description: "作成日時",
                args: {},
                resolve: async (source, args) => {
                    if (source.date === undefined) {
                        return (await setCommit(source)).date;
                    }
                    return source.date;
                }
            }),
            description: makeObjectField({
                type: g.GraphQLNonNull(g.GraphQLString),
                description: "どんな変更をしたかの説明",
                args: {},
                resolve: async (source, args) => {
                    if (source.description === undefined) {
                        return (await setCommit(source)).description;
                    }
                    return source.description;
                }
            }),
            projectName: makeObjectField({
                type: g.GraphQLNonNull(g.GraphQLString),
                description: "プロジェクト名",
                args: {},
                resolve: async (source, args) => {
                    if (source.projectName === undefined) {
                        return (await setCommit(source)).projectName;
                    }
                    return source.projectName;
                }
            }),
            projectIcon: makeObjectField({
                type: g.GraphQLNonNull(type.hashGraphQLType),
                description:
                    "プロジェクトのアイコン画像 " + type.fileHashDescription,
                args: {},
                resolve: async (source, args) => {
                    if (source.projectIcon === undefined) {
                        return (await setCommit(source)).projectIcon;
                    }
                    return source.projectIcon;
                }
            }),
            projectImage: makeObjectField({
                type: g.GraphQLNonNull(type.hashGraphQLType),
                description:
                    "プロジェクトのパッケージデザイン " +
                    type.fileHashDescription,
                args: {},
                resolve: async (source, args) => {
                    if (source.projectImage === undefined) {
                        return (await setCommit(source)).projectImage;
                    }
                    return source.projectImage;
                }
            }),
            projectSummary: makeObjectField({
                type: g.GraphQLNonNull(g.GraphQLString),
                description: "プロジェクトの簡潔な説明",
                args: {},
                resolve: async (source, args) => {
                    if (source.projectSummary === undefined) {
                        return (await setCommit(source)).projectSummary;
                    }
                    return source.projectSummary;
                }
            }),
            projectDescription: makeObjectField({
                type: g.GraphQLNonNull(g.GraphQLString),
                description: "プロジェクトの詳しい説明",
                args: {},
                resolve: async (source, args) => {
                    if (source.projectDescription === undefined) {
                        return (await setCommit(source)).projectDescription;
                    }
                    return source.projectDescription;
                }
            }),
            children: makeObjectField({
                type: graphQLNonNullList(moduleSnapshotGraphQLType),
                description: "子のモジュール",
                args: {},
                resolve: async (source, args) => {
                    if (source.children === undefined) {
                        return (await setCommit(source)).children;
                    }
                    return source.children;
                }
            }),
            typeDefs: makeObjectField({
                type: graphQLNonNullList(typeDefSnapshotGraphQLType),
                description: "型定義",
                args: {},
                resolve: async (source, args) => {
                    if (source.typeDefs === undefined) {
                        return (await setCommit(source)).typeDefs;
                    }
                    return source.typeDefs;
                }
            }),
            partDefs: makeObjectField({
                type: graphQLNonNullList(partDefinitionGraphQLType),
                description: "パーツ定義",
                args: {},
                resolve: async (source, args) => {
                    if (source.partDefs === undefined) {
                        return (await setCommit(source)).partDefs;
                    }
                    return source.partDefs;
                }
            }),
            dependencies: makeObjectField({
                type: graphQLNonNullList(dependencyGraphQLType),
                description: "使っている外部のプロジェクト",
                args: {},
                resolve: async (source, args) => {
                    if (source.dependencies === undefined) {
                        return (await setCommit(source)).dependencies;
                    }
                    return source.dependencies;
                }
            })
        })
});

const setCommit = async (
    source: Return<type.Commit>
): ReturnType<typeof database.getCommit> => {
    const data = await database.getCommit(source.hash);
    source.parentCommits = data.parentCommits;
    source.releaseId = data.releaseId;
    source.author = data.author;
    source.date = data.date;
    source.description = data.description;
    source.projectName = data.projectName;
    source.projectIcon = data.projectIcon;
    source.projectImage = data.projectImage;
    source.projectSummary = data.projectSummary;
    source.projectDescription = data.projectDescription;
    source.children = data.children;
    source.typeDefs = data.typeDefs;
    source.partDefs = data.partDefs;
    source.dependencies = data.dependencies;
    return data;
};

const dependencyGraphQLType = new g.GraphQLObjectType({
    name: "Dependency",
    description: "依存プロジェクト",
    fields: () =>
        makeObjectFieldMap<type.Dependency>({
            project: {
                type: g.GraphQLNonNull(projectGraphQLType),
                description: "プロジェクト"
            },
            releaseId: {
                type: g.GraphQLNonNull(type.idGraphQLType),
                description: "リリースID"
            }
        })
});

/* ==========================================
                Draft Commit
   ==========================================
*/
const draftCommitGraphQLType = new g.GraphQLObjectType({
    name: "DraftCommit",
    fields: () =>
        makeObjectFieldMap<type.DraftCommit>({
            hash: {
                type: type.hashGraphQLType,
                description: "ドラフトコミットから導き出されるハッシュ値"
            },
            date: makeObjectField({
                type: g.GraphQLNonNull(type.dateTimeGraphQLType),
                description: "作成日時",
                args: {},
                resolve: async (source, args) => {
                    if (source.date === undefined) {
                        return (await setDraftCommit(source)).date;
                    }
                    return source.date;
                }
            }),
            description: makeObjectField({
                type: g.GraphQLNonNull(g.GraphQLString),
                description: "どんな変更をした/するのか説明",
                args: {},
                resolve: async (source, args) => {
                    if (source.description === undefined) {
                        return (await setDraftCommit(source)).description;
                    }
                    return source.description;
                }
            }),
            isRelease: makeObjectField({
                type: g.GraphQLNonNull(g.GraphQLBoolean),
                description: "リリースとして公開する予定か",
                args: {},
                resolve: async (source, args) => {
                    if (source.isRelease === undefined) {
                        return (await setDraftCommit(source)).isRelease;
                    }
                    return source.isRelease;
                }
            }),
            projectName: makeObjectField({
                type: g.GraphQLNonNull(g.GraphQLString),
                description: "プロジェクト名",
                args: {},
                resolve: async (source, args) => {
                    if (source.projectName === undefined) {
                        return (await setDraftCommit(source)).projectName;
                    }
                    return source.projectName;
                }
            }),
            projectIcon: makeObjectField({
                type: g.GraphQLNonNull(type.hashGraphQLType),
                description:
                    "プロジェクトのアイコン画像 " + type.fileHashDescription,
                args: {},
                resolve: async (source, args) => {
                    if (source.projectIcon === undefined) {
                        return (await setDraftCommit(source)).projectIconHash;
                    }
                    return source.projectIcon;
                }
            }),
            projectImage: makeObjectField({
                type: g.GraphQLNonNull(type.hashGraphQLType),
                description:
                    "プロジェクトのパッケージデザイン " +
                    type.fileHashDescription,
                args: {},
                resolve: async (source, args) => {
                    if (source.projectImage === undefined) {
                        return (await setDraftCommit(source)).projectImageHash;
                    }
                    return source.projectImage;
                }
            }),
            projectSummary: makeObjectField({
                type: g.GraphQLNonNull(g.GraphQLString),
                description: "プロジェクトの簡潔な説明",
                args: {},
                resolve: async (source, args) => {
                    if (source.projectSummary === undefined) {
                        return (await setDraftCommit(source)).projectSummary;
                    }
                    return source.projectSummary;
                }
            }),
            projectDescription: makeObjectField({
                type: g.GraphQLNonNull(g.GraphQLString),
                description: "プロジェクトの詳しい説明",
                args: {},
                resolve: async (source, args) => {
                    if (source.projectDescription === undefined) {
                        return (await setDraftCommit(source))
                            .projectDescription;
                    }
                    return source.projectDescription;
                }
            }),
            children: makeObjectField({
                type: graphQLNonNullList(moduleSnapshotGraphQLType),
                description: "子のモジュール",
                args: {},
                resolve: async (source, args) => {
                    if (source.children === undefined) {
                        return (await setDraftCommit(source)).children;
                    }
                    return source.children;
                }
            }),
            typeDefs: makeObjectField({
                type: graphQLNonNullList(typeDefSnapshotGraphQLType),
                description: "型定義",
                args: {},
                resolve: async (source, args) => {
                    if (source.typeDefs === undefined) {
                        return (await setDraftCommit(source)).typeDefs;
                    }
                    return source.typeDefs;
                }
            }),
            partDefs: makeObjectField({
                type: graphQLNonNullList(partDefinitionGraphQLType),
                description: "パーツ定義",
                args: {},
                resolve: async (source, args) => {
                    if (source.partDefs === undefined) {
                        return (await setDraftCommit(source)).partDefs;
                    }
                    return source.partDefs;
                }
            }),
            dependencies: makeObjectField({
                type: graphQLNonNullList(dependencyGraphQLType),
                description: "使っている外部のプロジェクト",
                args: {},
                resolve: async (source, args) => {
                    if (source.dependencies === undefined) {
                        return (await setDraftCommit(source)).dependencies;
                    }
                    return source.dependencies;
                }
            })
        })
});

const setDraftCommit = async (
    source: Return<type.DraftCommit>
): ReturnType<typeof database.getDraftCommit> => {
    const data = await database.getDraftCommit(source.hash);
    source.date = data.date;
    source.description = data.description;
    source.isRelease = data.isRelease;
    source.projectName = data.projectName;
    source.projectIcon = data.projectIconHash;
    source.projectImage = data.projectImageHash;
    source.projectSummary = data.projectSummary;
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
                    g.GraphQLList(g.GraphQLNonNull(typeDefSnapshotGraphQLType))
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
const typeDefSnapshotGraphQLType = new g.GraphQLObjectType<
    type.TypeDefSnapshot,
    void,
    any
>({
    name: "TypeDefinition",
    fields: () =>
        makeObjectFieldMap<type.TypeDefSnapshot>({
            hash: {
                type: g.GraphQLNonNull(type.hashGraphQLType),
                description: "型のスナップショットから導き出されるハッシュ値"
            },
            name: makeObjectField({
                type: g.GraphQLNonNull(type.labelGraphQLType),
                description: "型の名前",
                args: {},
                resolve: async (source, args) => {
                    if (source.name === undefined) {
                        return (await setTypeDefSnapshot(source)).name;
                    }
                    return source.name;
                }
            }),
            description: makeObjectField({
                type: g.GraphQLNonNull(g.GraphQLString),
                description: "型の説明",
                args: {},
                resolve: async (source, args) => {
                    if (source.description === undefined) {
                        return (await setTypeDefSnapshot(source)).description;
                    }
                    return source.description;
                }
            }),
            body: makeObjectField({
                type: g.GraphQLNonNull(typeBodyGraphQLType),
                description: "",
                args: {},
                resolve: async (source, args) => {
                    if (source.body === undefined) {
                        return (await setTypeDefSnapshot(source)).body;
                    }
                    return source.body;
                }
            })
        })
});

const setTypeDefSnapshot = async (
    source: Return<type.TypeDefSnapshot>
): ReturnType<typeof database.getTypeDefSnapshot> => {
    const data = await database.getTypeDefSnapshot(source.hash);
    source.name = data.name;
    source.description = data.description;
    source.body = data.body;
    return data;
};

const typeBodyGraphQLType = new g.GraphQLUnionType({
    name: "TypeBody",
    description: "型がどんなものか表現する",
    types: () => [typeBodyTags, typeBodyKernel]
});

const typeBodyTags = new g.GraphQLObjectType({
    name: "TypeBodyTags",
    description: "型の本体をタグで構成する",
    fields: () =>
        makeObjectFieldMap<type.TypeBodyTags>({
            type: {
                type: g.GraphQLNonNull(g.GraphQLString),
                description: "常に tag"
            },
            tags: {
                type: graphQLNonNullList(typeBodyTag),
                description: "タグ"
            }
        })
});

const typeBodyTag = new g.GraphQLObjectType({
    name: "TypeBodyTag",
    description: "タグとパラメータ",
    fields: () =>
        makeObjectFieldMap<type.TypeBodyTag>({
            name: {
                type: g.GraphQLNonNull(type.labelGraphQLType),
                description: "タグの名前"
            },
            description: {
                type: g.GraphQLNonNull(g.GraphQLString),
                description: "タグの説明"
            },
            parameter: {
                type: graphQLNonNullList(typeTermOrParenthesisGraphQLType),
                description: "タグにつける型"
            }
        })
});

const typeTermOrParenthesisGraphQLType = new g.GraphQLUnionType({
    name: "TypeTermOrParenthesis",
    description: "",
    types: () => [typeTermParenthesisStart, typeTermParenthesisEnd, typeTermRef]
});

const typeTermParenthesisStart = new g.GraphQLObjectType({
    name: "TypeTermParenthesisStart",
    description: "カッコの始まり",
    fields: makeObjectFieldMap<type.TypeTermParenthesisStart>({
        type: {
            type: g.GraphQLNonNull(g.GraphQLString),
            description: "常に ("
        }
    })
});

const typeTermParenthesisEnd = new g.GraphQLObjectType({
    name: "TypeTermParenthesisEnd",
    description: "カッコの終わり",
    fields: makeObjectFieldMap<type.TypeTermParenthesisEnd>({
        type: {
            type: g.GraphQLNonNull(g.GraphQLString),
            description: "常に )"
        }
    })
});

const typeTermRef = new g.GraphQLObjectType({
    name: "TypeTermRef",
    description: "参照",
    fields: makeObjectFieldMap<type.TypeTermRef>({
        typeId: {
            type: g.GraphQLNonNull(type.idGraphQLType),
            description: "型を示すID"
        },
        type: {
            type: g.GraphQLNonNull(g.GraphQLString),
            description: "常にref"
        }
    })
});

const typeBodyKernel = new g.GraphQLObjectType({
    name: "TypeBodyKernel",
    description: "型を内部ものを使って表現する",
    fields: makeObjectFieldMap<type.TypeBodyKernel>({
        type: {
            type: g.GraphQLNonNull(g.GraphQLString),
            description: "常に kernel"
        },
        kernelType: {
            type: g.GraphQLNonNull(type.kernelTypeGraphQLType),
            description: "どの内部表現か"
        }
    })
});

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
            hash: {
                type: g.GraphQLNonNull(type.idGraphQLType),
                description:
                    "パーツののスナップショットから導き出されるハッシュ値"
            },
            name: makeObjectField({
                type: g.GraphQLNonNull(type.labelGraphQLType),
                description: "パーツの名前",
                args: {},
                resolve: async (source, args) => {
                    return type.labelFromString("partDummyName");
                }
            }),
            description: makeObjectField({
                type: g.GraphQLNonNull(g.GraphQLString),
                description: "パーツの説明",
                args: {},
                resolve: async (source, args) => {
                    if (source.description === undefined) {
                        return (await setPartDefSnapshot(source)).description;
                    }
                    return source.description;
                }
            }),
            type: makeObjectField({
                type: graphQLNonNullList(typeTermOrParenthesisGraphQLType),
                description: "パーツの型",
                args: {},
                resolve: async (source, args) => {
                    if (source.type === undefined) {
                        return (await setPartDefSnapshot(source)).type;
                    }
                    return source.type;
                }
            }),
            expr: makeObjectField({
                type: graphQLNonNullList(termOrParenthesisGraphQLType),
                description: "パーツの式",
                args: {},
                resolve: async (source, args) => {
                    if (source.expr === undefined) {
                        return (await setPartDefSnapshot(source)).expr;
                    }
                    return source.expr;
                }
            })
        })
});

const setPartDefSnapshot = async (
    source: Return<type.PartDefSnapshot>
): ReturnType<typeof database.getPartDefSnapshot> => {
    const data = await database.getPartDefSnapshot(source.hash);
    source.name = data.name;
    source.description = data.description;
    source.type = data.type;
    source.expr = data.expr;
    return data;
};

const termOrParenthesisGraphQLType = new g.GraphQLUnionType({
    name: "TermOrParenthesis",
    description: "式を表現する項かカッコ",
    types: () => [
        termParenthesisStart,
        termParenthesisEnd,
        termNumber,
        termPartRef,
        termKernel
    ]
});

const termParenthesisStart = new g.GraphQLObjectType({
    name: "TermParenthesisStart",
    description: "カッコの始まり",
    fields: makeObjectFieldMap<type.TermParenthesisStart>({
        type: {
            type: g.GraphQLNonNull(g.GraphQLString),
            description: "常に ("
        }
    })
});

const termParenthesisEnd = new g.GraphQLObjectType({
    name: "TermParenthesisEnd",
    description: "カッコの終わり",
    fields: makeObjectFieldMap<type.TermParenthesisEnd>({
        type: {
            type: g.GraphQLNonNull(g.GraphQLString),
            description: "常に )"
        }
    })
});

const termNumber = new g.GraphQLObjectType({
    name: "TermNumber",
    description: "Numberの項",
    fields: makeObjectFieldMap<type.TermNumber>({
        type: {
            type: g.GraphQLNonNull(g.GraphQLString),
            description: "常に number"
        },
        value: {
            type: g.GraphQLNonNull(g.GraphQLFloat),
            description: "数値"
        }
    })
});

const termPartRef = new g.GraphQLObjectType({
    name: "TermPartRef",
    description: "パーツから値を得る",
    fields: makeObjectFieldMap<type.TermPartRef>({
        type: {
            type: g.GraphQLNonNull(g.GraphQLString),
            description: "常に part"
        },
        partId: {
            type: g.GraphQLNonNull(type.idGraphQLType),
            description: "パーツのID"
        }
    })
});

const termKernel = new g.GraphQLObjectType({
    name: "TermKernel",
    description: "内部で表現された項",
    fields: makeObjectFieldMap<type.TermKernel>({
        type: {
            type: g.GraphQLNonNull(g.GraphQLString),
            description: "常に kernel"
        },
        value: {
            type: g.GraphQLNonNull(type.kernelTermGraphQLType),
            description: "種類"
        }
    })
});
/* ==========================================
               Expr Snapshot
   ==========================================
*/
const exprSnapshotGraphQLType = new g.GraphQLObjectType({
    name: "ExprDefSnapshot",
    description: "式",
    fields: makeObjectFieldMap<type.ExprSnapshot>({
        hash: {
            type: g.GraphQLNonNull(type.hashGraphQLType),
            description: "式のスナップショットから導き出されるハッシュ値"
        },
        value: makeObjectField({
            type: graphQLNonNullList(termOrParenthesisGraphQLType),
            description: "項の羅列",
            args: {},
            resolve: async (source, args) => {
                if (source.value === undefined) {
                    return (await setExprDefSnapshot(source)).value;
                }
                return source.value;
            }
        })
    })
});

const setExprDefSnapshot = async (
    source: Return<type.ExprSnapshot>
): ReturnType<typeof database.getExprSnapshot> => {
    const data = await database.getExprSnapshot(source.hash);
    source.value = data.value;
    return data;
};

/*  =============================================================
                            Query
    =============================================================
*/
const user = makeQueryOrMutationField<{ userId: type.UserId }, type.User>({
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
});

const userPrivate = makeQueryOrMutationField<
    {
        accessToken: type.AccessToken;
    },
    type.User
>({
    args: {
        accessToken: {
            type: g.GraphQLNonNull(type.accessTokenGraphQLType),
            description: type.accessTokenDescription
        }
    },
    type: g.GraphQLNonNull(userGraphQLType),
    resolve: async args => {
        return await database.getUser(
            await database.verifyAccessToken(args.accessToken)
        );
    },
    description: "個人的なユーザーの情報を取得する"
});

const allUser = makeQueryOrMutationField<{}, Array<type.User>>({
    args: {},
    type: graphQLNonNullList(userGraphQLType),
    resolve: async args => {
        return await database.getAllUser();
    },
    description: "全てユーザーを取得する"
});

const project = makeQueryOrMutationField<
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
});

const allProject = makeQueryOrMutationField<{}, Array<type.Project>>({
    args: {},
    type: g.GraphQLNonNull(g.GraphQLList(g.GraphQLNonNull(projectGraphQLType))),
    resolve: async args => {
        return database.getAllProject();
    },
    description: "全てのプロジェクトを取得する"
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
            user,
            userPrivate,
            allUser,
            project: project,
            allProject
        }
    }),
    mutation: new g.GraphQLObjectType({
        name: "Mutation",
        description: "データを作成、更新ができる",
        fields: {
            getLogInUrl: getLogInUrl,
            addProject: makeQueryOrMutationField<
                {
                    accessToken: type.AccessToken;
                },
                type.Project
            >({
                args: {
                    accessToken: {
                        type: g.GraphQLNonNull(type.accessTokenGraphQLType),
                        description: type.accessTokenDescription
                    }
                },
                type: g.GraphQLNonNull(projectGraphQLType),
                resolve: async args => {
                    return database.addProject(
                        await database.verifyAccessToken(args.accessToken)
                    );
                },
                description: "プロジェクトを作成する"
            })
        }
    })
});
