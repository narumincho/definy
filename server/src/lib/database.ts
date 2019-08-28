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
};

/**
 * プロジェクトを追加する
 */
export const addProject = async (data: {
    name: string;
    userId: type.UserId;
    editors: Array<type.UserId>;
}): Promise<ProjectLowCost> => {
    const initialCommitEmptyModule = await databaseLow.addModuleSnapshot({
        children: [],
        description: "",
        exposing: true,
        name: null,
        partDefs: [],
        typeDefs: []
    });
    const initialCommitHash = (await addCommit({
        authorId: data.userId,
        commitDescription: "",
        commitSummary: "initial commit",
        dependencies: [],
        parentCommitIds: [],
        projectDescription: "",
        projectName: data.name,
        tag: null,
        rootModuleSnapshot: initialCommitEmptyModule,
        rootModuleId: type.createRandomId() as type.ModuleId
    })).hash;
    const masterBranchId = type.createRandomId() as type.BranchId;
    const projectId = await databaseLow.addProject({
        branches: [],
        masterBranch: masterBranchId
    });
    await databaseLow.addBranch(masterBranchId, {
        description: "",
        head: initialCommitHash,
        name: type.labelFromString("master"),
        projectId: projectId
    });

    return {
        id: projectId,
        branches: [],
        masterBranch: {
            id: masterBranchId
        }
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
    masterBranch: { id: data.masterBranch }
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
    parentCommitIds: Array<type.CommitObjectHash>,
    projectName: string,
    projectDescription: string,
    tag: string | type.Version | null,
    rootModuleSnapshot: type.ModuleSnapshotHash,
    rootModuleId: type.ModuleId
): Promise<BranchLowCost> => {
    const branchHeadCommitHash = (await addCommit({
        authorId: userId,
        commitSummary: commitSummary,
        commitDescription: commitDescription,
        dependencies: dependencies,
        parentCommitIds: parentCommitIds,
        projectName: projectName,
        projectDescription: projectDescription,
        tag: tag,
        rootModuleSnapshot: rootModuleSnapshot,
        rootModuleId: rootModuleId
    })).hash;

    const branchId = type.createRandomId() as type.BranchId;
    await databaseLow.addBranch(branchId, {
        name: name,
        description: description,
        projectId: projectId,
        head: branchHeadCommitHash
    });
    return {
        id: branchId,
        name: name,
        description: description,
        project: { id: projectId }
    };
};
/* ==========================================
                   Commit
   ==========================================
*/
type CommitLowCost = {
    hash: type.CommitObjectHash;
    parentCommits: Array<{
        id: type.CommitObjectHash;
    }>;
    tag: null | string | type.Version;
    projectName: string;
    projectDescription: string;
    author: {
        id: type.UserId;
    };
    date: Date;
    commitSummary: string;
    commitDescription: string;
    rootModuleId: type.ModuleId;
    rootModuleSnapshot: type.ModuleSnapshotHash;
    dependencies: Array<{
        project: {
            id: type.ProjectId;
        };
        version: type.DependencyVersion;
    }>;
};

export const addCommit = async (data: {
    parentCommitIds: Array<type.CommitObjectHash>;
    tag: null | string | type.Version;
    authorId: type.UserId;
    commitSummary: string;
    commitDescription: string;
    projectName: string;
    projectDescription: string;
    rootModuleId: type.ModuleId;
    rootModuleSnapshot: type.ModuleSnapshotHash;
    dependencies: Array<{
        projectId: type.ProjectId;
        version: type.DependencyVersion;
    }>;
}): Promise<CommitLowCost> => {
    const now = databaseLow.getNowTimestamp();
    const commitHash = await databaseLow.addCommit({
        parentCommitIds: data.parentCommitIds,
        tag: data.tag,
        authorId: data.authorId,
        date: now,
        commitSummary: data.commitSummary,
        commitDescription: data.commitDescription,
        projectName: data.projectName,
        projectDescription: data.projectDescription,
        rootModuleSnapshot: data.rootModuleSnapshot,
        rootModuleId: data.rootModuleId,
        dependencies: data.dependencies
    });
    return {
        hash: commitHash,
        parentCommits: data.parentCommitIds.map(id => ({ id: id })),
        tag: data.tag,
        author: {
            id: data.authorId
        },
        date: now.toDate(),
        commitSummary: data.commitSummary,
        commitDescription: data.commitDescription,
        projectName: data.projectName,
        projectDescription: data.projectDescription,
        rootModuleId: data.rootModuleId,
        rootModuleSnapshot: data.rootModuleSnapshot,
        dependencies: data.dependencies.map(dependency => ({
            project: {
                id: dependency.projectId
            },
            version: dependency.version
        }))
    };
};
/* ==========================================
               Module Snapshot
   ==========================================
*/

type ModuleSnapshotLowCost = {
    hash: type.ModuleSnapshotHash;
    name: type.Label | null;
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
    description: string;
    exposing: boolean;
};

/**
 * 指定したモジュールを取得する
 * @param moduleId
 */
export const getModule = async (
    hash: type.ModuleSnapshotHash
): Promise<ModuleSnapshotLowCost> =>
    databaseLowModuleToLowCost(hash, await databaseLow.getModuleSnapshot(hash));

const databaseLowModuleToLowCost = (
    hash: type.ModuleSnapshotHash,
    data: databaseLow.ModuleSnapshotData
): ModuleSnapshotLowCost => ({
    hash: hash,
    name: data.name,
    children: data.children,
    typeDefs: data.typeDefs,
    partDefs: data.partDefs,
    description: data.description,
    exposing: data.exposing
});
/* ==========================================
               TypeDef Snapshot
   ==========================================
*/
type TypeDefSnapshotLowCost = {
    hash: type.TypeDefSnapshotHash;
    name: type.Label;
    description: string;
    body: type.TypeBody;
};

export const addTypeDef = async (
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
