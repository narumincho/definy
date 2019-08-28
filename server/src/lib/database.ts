import * as databaseLow from "./databaseLow";
import * as type from "./type";
import axios, { AxiosResponse } from "axios";
import { URL } from "url";
import * as tool from "./tool";
import * as jwt from "jsonwebtoken";
import * as key from "./key";

/* ==========================================
                    User
   ==========================================
*/

/**
 * OpenId ConnectのStateを生成して保存する
 * リプレイアタックを防いだり、他のサーバーがつくマートのクライアントIDを使って発行しても自分が発行したものと見比べて識別できるようにする
 */
export const generateAndWriteLogInState = async (
    logInService: type.LogInService
): Promise<string> => {
    const state = tool.createRandomString();
    await databaseLow.writeGoogleLogInState(logInService, state);
    return state;
};

/**
 * 指定したサービスのtateがDefinyによって発行したものかどうか調べ、あったらそのstateを削除する
 */
export const checkExistsAndDeleteState = async (
    logInService: type.LogInService,
    state: string
): Promise<boolean> =>
    await databaseLow.existsGoogleStateAndDeleteAndGetUserId(
        logInService,
        state
    );

/**
 * ユーザーの画像をURLから保存する
 * @param userId ユーザーID
 * @param url 画像を配信しているURL
 */
export const saveUserImageFromUrl = async (url: URL): Promise<string> => {
    const response: AxiosResponse<Buffer> = await axios.get(url.toString(), {
        responseType: "arraybuffer"
    });
    const mimeType: string = response.headers["content-type"];
    const fileName = type.createRandomId();
    await databaseLow.saveUserImage(fileName, response.data, mimeType);
    return fileName;
};

/**
 * ソーシャルログインのアカウントからユーザーを取得する
 * @param logInServiceAndId
 */
export const getUserFromLogInService = async (
    logInServiceAndId: type.LogInServiceAndId
): Promise<(UserLowCost & { lastAccessTokenJti: string }) | null> => {
    const userDataAndId = (await databaseLow.searchUsers(
        "logInServiceAndId",
        "==",
        logInServiceAndId
    ))[0];
    if (userDataAndId === undefined) {
        return null;
    }
    return {
        ...databaseLowUserToLowCost(userDataAndId),
        lastAccessTokenJti: userDataAndId.data.lastAccessTokenJti
    };
};

type UserLowCost = {
    id: type.UserId;
    name: type.UserName;
    image: {
        id: type.ImageId;
    };
    introduction: string;
    createdAt: Date;
    branches: Array<{
        id: type.BranchId;
    }>;
};

/**
 * ユーザーを追加する
 */
export const addUser = async (data: {
    name: type.UserName;
    imageId: type.ImageId;
    logInServiceAndId: type.LogInServiceAndId;
    lastAccessTokenJti: string;
}): Promise<string> => {
    const userId = await databaseLow.addUser({
        name: data.name,
        imageId: data.imageId,
        introduction: "",
        createdAt: databaseLow.getNowTimestamp(),
        branchIds: [],
        lastAccessTokenJti: data.lastAccessTokenJti,
        logInServiceAndId: data.logInServiceAndId
    });
    return userId;
};

/**
 * ユーザーの情報を取得する
 * @param userId
 */
export const getUser = async (userId: type.UserId): Promise<UserLowCost> =>
    databaseLowUserToLowCost({
        id: userId,
        data: await databaseLow.getUser(userId)
    });

/**
 *
 */
export const getAllUser = async (): Promise<Array<UserLowCost>> =>
    (await databaseLow.getAllUser()).map(databaseLowUserToLowCost);

const databaseLowUserToLowCost = ({
    id,
    data
}: {
    id: type.UserId;
    data: databaseLow.UserData;
}): UserLowCost => {
    return {
        id: id,
        name: data.name,
        image: {
            id: data.imageId
        },
        introduction: data.introduction,
        createdAt: data.createdAt.toDate(),
        branches: data.branchIds.map(id => ({ id: id }))
    };
};

/* ==========================================
                Project
   ==========================================
*/

type ProjectLowCost = {
    id: type.ProjectId;
    masterBranch: {
        id: type.BranchId;
    };
    branches: Array<{
        id: type.BranchId;
    }>;
    taggedCommits: Array<{
        hash: type.CommitHash;
    }>;
};

/**
 * プロジェクトを追加する
 */
export const addProject = async (data: {
    name: string;
    userId: type.UserId;
    editors: Array<type.UserId>;
}): Promise<ProjectLowCost> => {
    const initialCommitHash = (await addCommit({
        authorId: data.userId,
        commitDescription: "",
        commitSummary: "initial commit",
        dependencies: [],
        parentCommitHashes: [],
        projectDescription: "",
        projectName: data.name,
        tag: null,
        children: [],
        partDefs: [],
        typeDefs: []
    })).hash;
    const masterBranchId = type.createRandomId() as type.BranchId;
    const projectId = await databaseLow.addProject({
        branches: [],
        masterBranch: masterBranchId,
        taggedCommitHashes: []
    });
    await databaseLow.addBranch(masterBranchId, {
        description: "",
        headHash: initialCommitHash,
        name: type.labelFromString("master"),
        projectId: projectId
    });

    return {
        id: projectId,
        branches: [],
        masterBranch: {
            id: masterBranchId
        },
        taggedCommits: []
    };
};

/**
 * プロジェクトの情報を取得する
 */
export const getProject = async (
    projectId: type.ProjectId
): Promise<ProjectLowCost> => {
    return databaseLowProjectToLowCost({
        id: projectId,
        data: await databaseLow.getProject(projectId)
    });
};

/**
 * 全てのプロジェクトのデータを取得する
 */
export const getAllProject = async (): Promise<Array<ProjectLowCost>> =>
    (await databaseLow.getAllProject()).map(databaseLowProjectToLowCost);

const databaseLowProjectToLowCost = ({
    id,
    data
}: {
    id: type.ProjectId;
    data: databaseLow.ProjectData;
}): ProjectLowCost => ({
    id: id,
    branches: data.branches.map(id => ({ id: id })),
    masterBranch: { id: data.masterBranch },
    taggedCommits: data.taggedCommitHashes.map(hash => ({ hash: hash }))
});

/* ==========================================
                Branch
   ==========================================
*/
type BranchLowCost = {
    id: type.BranchId;
    name: type.Label;
    project: {
        id: type.ProjectId;
    };
    description: string;
    head: {
        hash: type.CommitHash;
    };
};

export const addBranch = async (
    name: type.Label,
    description: string,
    projectId: type.ProjectId,
    userId: type.UserId,
    commitSummary: string,
    commitDescription: string,
    dependencies: Array<{
        projectId: type.ProjectId;
        version: type.DependencyVersion;
    }>,
    parentCommitHashes: Array<type.CommitHash>,
    projectName: string,
    projectDescription: string,
    tag: string | type.Version | null,
    children: Array<{
        id: type.ModuleId;
        hash: type.ModuleSnapshotHash;
    }>,
    typeDefs: Array<{
        id: type.TypeId;
        hash: type.TypeDefSnapshotHash;
    }>,
    partDefs: Array<{
        id: type.PartId;
        hash: type.PartDefSnapshotHash;
    }>
): Promise<BranchLowCost> => {
    const branchHeadCommitHash = (await addCommit({
        authorId: userId,
        commitSummary: commitSummary,
        commitDescription: commitDescription,
        dependencies: dependencies,
        parentCommitHashes: parentCommitHashes,
        projectName: projectName,
        projectDescription: projectDescription,
        partDefs: partDefs,
        typeDefs: typeDefs,
        tag: tag,
        children: children
    })).hash;

    const branchId = type.createRandomId() as type.BranchId;
    await databaseLow.addBranch(branchId, {
        name: name,
        description: description,
        projectId: projectId,
        headHash: branchHeadCommitHash
    });
    return {
        id: branchId,
        name: name,
        description: description,
        project: { id: projectId },
        head: { hash: branchHeadCommitHash }
    };
};

export const getBranch = async (id: type.BranchId): Promise<BranchLowCost> =>
    databaseLowBranchToLowCost({
        id: id,
        data: await databaseLow.getBranch(id)
    });

const databaseLowBranchToLowCost = ({
    id,
    data
}: {
    id: type.BranchId;
    data: databaseLow.BranchData;
}): BranchLowCost => ({
    id: id,
    name: data.name,
    project: {
        id: data.projectId
    },
    description: data.description,
    head: { hash: data.headHash }
});

/* ==========================================
                   Commit
   ==========================================
*/
type CommitLowCost = {
    hash: type.CommitHash;
    parentCommits: Array<{
        hash: type.CommitHash;
    }>;
    tag: null | type.CommitTagName | type.Version;
    commitSummary: string;
    commitDescription: string;
    author: {
        id: type.UserId;
    };
    date: Date;
    projectName: string;
    projectDescription: string;
    children: Array<{
        id: type.ModuleId;
        snapshot: {
            hash: type.ModuleSnapshotHash;
        };
    }>;
    typeDefs: Array<{
        id: type.TypeId;
        snapshot: {
            hash: type.TypeDefSnapshotHash;
        };
    }>;
    partDefs: Array<{
        id: type.PartId;
        snapshot: {
            hash: type.PartDefSnapshotHash;
        };
    }>;
    dependencies: Array<{
        project: {
            id: type.ProjectId;
        };
        version: type.DependencyVersion;
    }>;
};

export const addCommit = async (data: {
    parentCommitHashes: Array<type.CommitHash>;
    tag: null | string | type.Version;
    authorId: type.UserId;
    commitSummary: string;
    commitDescription: string;
    projectName: string;
    projectDescription: string;
    children: Array<{
        id: type.ModuleId;
        hash: type.ModuleSnapshotHash;
    }>;
    typeDefs: Array<{
        id: type.TypeId;
        hash: type.TypeDefSnapshotHash;
    }>;
    partDefs: Array<{
        id: type.PartId;
        hash: type.PartDefSnapshotHash;
    }>;
    dependencies: Array<{
        projectId: type.ProjectId;
        version: type.DependencyVersion;
    }>;
}): Promise<CommitLowCost> => {
    const now = databaseLow.getNowTimestamp();
    const commitHash = await databaseLow.addCommit({
        date: now,
        ...data
    });
    return databaseLowCommitToLowCost({
        hash: commitHash,
        data: { date: now, ...data }
    });
};

export const getCommit = async (
    hash: type.CommitHash
): Promise<CommitLowCost> =>
    databaseLowCommitToLowCost({
        hash: hash,
        data: await databaseLow.getCommit(hash)
    });

const databaseLowCommitToLowCost = ({
    hash,
    data
}: {
    hash: type.CommitHash;
    data: databaseLow.CommitData;
}): CommitLowCost => ({
    hash: hash,
    parentCommits: data.parentCommitHashes.map(hash => ({ hash: hash })),
    tag: typeof data.tag === "string" ? { text: data.tag } : data.tag,
    author: {
        id: data.authorId
    },
    date: data.date.toDate(),
    commitSummary: data.commitSummary,
    commitDescription: data.commitDescription,
    projectName: data.projectName,
    projectDescription: data.projectDescription,
    children: data.children.map(child => ({
        id: child.id,
        snapshot: { hash: child.hash }
    })),
    typeDefs: data.typeDefs.map(t => ({
        id: t.id,
        snapshot: { hash: t.hash }
    })),
    partDefs: data.partDefs.map(p => ({
        id: p.id,
        snapshot: { hash: p.hash }
    })),
    dependencies: data.dependencies.map(dependency => ({
        project: {
            id: dependency.projectId
        },
        version: dependency.version
    }))
});

/* ==========================================
               Module Snapshot
   ==========================================
*/
type ModuleSnapshotLowCost = {
    hash: type.ModuleSnapshotHash;
    name: type.Label;
    children: Array<{
        id: type.ModuleId;
        snapshot: {
            hash: type.ModuleSnapshotHash;
        };
    }>;
    typeDefs: Array<{
        id: type.TypeId;
        snapshot: {
            hash: type.TypeDefSnapshotHash;
        };
    }>;
    partDefs: Array<{
        id: type.PartId;
        snapshot: {
            hash: type.PartDefSnapshotHash;
        };
    }>;
    description: string;
    exposing: boolean;
};

export const addModuleSnapshot = async (
    data: databaseLow.ModuleSnapshotData
): Promise<ModuleSnapshotLowCost> => {
    const hash = await databaseLow.addModuleSnapshot(data);
    return databaseLowModuleSnapshotToLowCost({
        hash: hash,
        data: data
    });
};

/**
 * 指定したモジュールのスナップショットを取得する
 */
export const getModuleSnapshot = async (
    hash: type.ModuleSnapshotHash
): Promise<ModuleSnapshotLowCost> =>
    databaseLowModuleSnapshotToLowCost({
        hash: hash,
        data: await databaseLow.getModuleSnapshot(hash)
    });

const databaseLowModuleSnapshotToLowCost = ({
    hash,
    data
}: {
    hash: type.ModuleSnapshotHash;
    data: databaseLow.ModuleSnapshotData;
}): ModuleSnapshotLowCost => ({
    hash: hash,
    name: data.name,
    children: data.children.map(m => ({
        id: m.id,
        snapshot: { hash: m.hash }
    })),
    typeDefs: data.typeDefs.map(t => ({
        id: t.id,
        snapshot: { hash: t.hash }
    })),
    partDefs: data.partDefs.map(p => ({
        id: p.id,
        snapshot: { hash: p.hash }
    })),
    description: data.description,
    exposing: data.exposing
});

/* ==========================================
               Type Def Snapshot
   ==========================================
*/
type TypeDefSnapshotLowCost = {
    hash: type.TypeDefSnapshotHash;
    name: type.Label;
    description: string;
    body: type.TypeBody;
};

export const addTypeDefSnapshot = async (
    name: type.Label,
    description: string,
    body: type.TypeBody
): Promise<TypeDefSnapshotLowCost> => {
    const hash = await databaseLow.addTypeDefSnapshot({
        name: name,
        description: description,
        body: body
    });
    return {
        hash: hash,
        name: name,
        description: description,
        body: body
    };
};

export const getTypeDefSnapshot = async (
    hash: type.TypeDefSnapshotHash
): Promise<TypeDefSnapshotLowCost> =>
    databaseLowTypeDefSnapshotToLowCost({
        hash: hash,
        data: await databaseLow.getTypeDefSnapshot(hash)
    });

const databaseLowTypeDefSnapshotToLowCost = ({
    hash,
    data
}: {
    hash: type.TypeDefSnapshotHash;
    data: databaseLow.TypeDefSnapshot;
}): TypeDefSnapshotLowCost => ({
    hash: hash,
    name: data.name,
    description: data.description,
    body: data.body
});

/* ==========================================
               Part Def Snapshot
   ==========================================
*/
type PartDefSnapshotLowCost = {
    hash: type.PartDefSnapshotHash;
    name: type.Label;
    description: string;
    type: Array<type.TypeTermOrParenthesis>;
    expr: {
        hash: type.ExprSnapshotHash;
    };
};

export const addPartDefSnapshot = async (
    name: type.Label,
    description: string,
    type: Array<type.TypeTermOrParenthesis>,
    expr: type.ExprSnapshotHash
): Promise<PartDefSnapshotLowCost> => {
    const hash = await databaseLow.addPartDefSnapshot({
        name: name,
        description: description,
        type: type,
        exprHash: expr
    });
    return {
        hash: hash,
        name: name,
        description: description,
        type: type,
        expr: {
            hash: expr
        }
    };
};

export const getPartDefSnapshot = async (
    hash: type.PartDefSnapshotHash
): Promise<PartDefSnapshotLowCost> =>
    databaseLowPartDefSnapshotToLowCost({
        hash: hash,
        data: await databaseLow.getPartDefSnapShot(hash)
    });

const databaseLowPartDefSnapshotToLowCost = ({
    hash,
    data
}: {
    hash: type.PartDefSnapshotHash;
    data: databaseLow.PartDefSnapshot;
}): PartDefSnapshotLowCost => ({
    hash: hash,
    name: data.name,
    description: data.description,
    type: data.type,
    expr: {
        hash: data.exprHash
    }
});

/* ==========================================
               Expr Def Snapshot
   ==========================================
*/
type ExprSnapshotLowCost = {
    hash: type.ExprSnapshotHash;
    value: Array<type.TermOrParenthesis>;
};

export const addExprDefSnapshot = async (
    value: Array<type.TermOrParenthesis>
): Promise<ExprSnapshotLowCost> => {
    const hash = await databaseLow.addExprSnapshot({ value: value });
    return {
        hash: hash,
        value: value
    };
};

export const getExprDefSnapshot = async (
    hash: type.ExprSnapshotHash
): Promise<ExprSnapshotLowCost> =>
    databaseLowExprDefSnapshotToLowCost({
        hash: hash,
        data: await databaseLow.getExprSnapshot(hash)
    });

const databaseLowExprDefSnapshotToLowCost = ({
    hash,
    data
}: {
    hash: type.ExprSnapshotHash;
    data: databaseLow.ExprSnapshot;
}): ExprSnapshotLowCost => ({
    hash: hash,
    value: data.value
});
/* ==========================================
               verifyAccessToken
   ==========================================
*/

/**
 * アクセストークンの正当性チェックとidの取得
 * @param accessToken
 */
export const verifyAccessToken = async (
    accessToken: string
): Promise<type.UserId> => {
    const decoded = jwt.verify(accessToken, key.accessTokenSecretKey, {
        algorithms: ["HS256"]
    }) as { sub: unknown; jti: unknown };
    if (typeof decoded.sub !== "string" || typeof decoded.jti !== "string") {
        throw new Error("invalid access token");
    }
    const userData = await databaseLow.getUser(decoded.sub as type.UserId);
    if (userData.lastAccessTokenJti !== decoded.jti) {
        throw new Error("アクセストークンが無効になりました");
    }
    return decoded.sub as type.UserId;
};
