import * as databaseLow from "./databaseLow";
import * as type from "./type";
import axios, { AxiosResponse } from "axios";
import { URL } from "url";

/* ==========================================
                    User
   ==========================================
*/

/**
 * OpenId ConnectのStateを生成して保存する
 * リプレイアタックを防いだり、他のサーバーがつくマートのクライアントIDを使って発行しても自分が発行したものと見比べて識別できるようにする
 */
export const generateAndWriteLogInState = async (
    logInService: type.SocialLoginService
): Promise<string> => {
    const state = type.createRandomId();
    await databaseLow.writeGoogleLogInState(logInService, state);
    return state;
};

/**
 * 指定したサービスのtateがDefinyによって発行したものかどうか調べ、あったらそのstateを削除する
 */
export const checkExistsAndDeleteState = async (
    logInService: type.SocialLoginService,
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
    return await databaseLow.saveFile(response.data, mimeType);
};

/**
 * ソーシャルログインのアカウントからユーザーを取得する
 * @param logInServiceAndId
 */
export const getUserFromLogInService = async (
    logInServiceAndId: type.LogInServiceAndId
): Promise<(UserLowCost & { lastAccessToken: string }) | null> => {
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
        lastAccessToken: userDataAndId.data.lastAccessTokenHash
    };
};

type UserLowCost = {
    readonly id: type.UserId;
    readonly name: type.UserName;
    readonly imageFileHash: type.FileHash;
    readonly introduction: string;
    readonly createdAt: Date;
    readonly branches: ReadonlyArray<{
        id: type.BranchId;
    }>;
};

/**
 * ユーザーを追加する
 */
export const addUser = async (data: {
    name: type.UserName;
    imageId: type.FileHash;
    logInServiceAndId: type.LogInServiceAndId;
}): Promise<{ userId: type.UserId; accessToken: type.AccessToken }> => {
    const userId = type.createRandomId() as type.UserId;
    const accessToken = await createAccessToken(userId);
    await databaseLow.addUser(userId, {
        name: data.name,
        imageHash: data.imageId,
        introduction: "",
        createdAt: databaseLow.getNowTimestamp(),
        branchIds: [],
        lastAccessTokenHash: type.hashAccessToken(accessToken),
        logInServiceAndId: data.logInServiceAndId
    });
    return { userId: userId, accessToken: accessToken };
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
 *  全てのユーザーの情報を取得する
 */
export const getAllUser = async (): Promise<Array<UserLowCost>> =>
    (await databaseLow.getAllUser()).map(databaseLowUserToLowCost);

const databaseLowUserToLowCost = ({
    id,
    data
}: {
    id: type.UserId;
    data: databaseLow.UserData;
}): UserLowCost => ({
    id: id,
    name: data.name,
    imageFileHash: data.imageHash,
    introduction: data.introduction,
    createdAt: data.createdAt.toDate(),
    branches: data.branchIds.map(id => ({ id: id }))
});

/**
 * 最後のアクセストークンを変更する
 * @param userId
 * @param accessToken
 */
export const updateLastAccessToken = async (
    userId: type.UserId,
    accessToken: type.AccessToken
): Promise<void> => {
    await databaseLow.updateUser(userId, {
        lastAccessTokenHash: type.hashAccessToken(accessToken)
    });
};
/* ==========================================
                Project
   ==========================================
*/

type ProjectLowCost = {
    readonly id: type.ProjectId;
    readonly masterBranch: {
        readonly id: type.BranchId;
    };
    readonly branches: ReadonlyArray<{
        readonly id: type.BranchId;
    }>;
    readonly taggedCommits: ReadonlyArray<{
        readonly hash: type.CommitHash;
    }>;
};

/**
 * プロジェクトを追加する
 */
export const addProject = async (
    userId: type.UserId
): Promise<ProjectLowCost> => {
    const initialCommitHash = (await addCommit({
        authorId: userId,
        commitDescription: "",
        commitSummary: "initial commit",
        dependencies: [],
        parentCommitHashes: [],
        projectSummary: "",
        projectDescription: "",
        projectName: "",
        projectIconHash: null,
        projectImageHash: null,
        releaseId: null,
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
        description: "プロジェクト作成時に自動的に作られるマスターブランチ",
        headHash: initialCommitHash,
        name: type.labelFromString("master"),
        projectId: projectId,
        ownerId: userId
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
    readonly id: type.BranchId;
    readonly name: type.Label;
    readonly project: {
        readonly id: type.ProjectId;
    };
    readonly description: string;
    readonly head: {
        readonly hash: type.CommitHash;
    };
    readonly owner: {
        readonly id: type.UserId;
    };
    readonly draftCommit: null | {
        readonly hash: type.DraftCommitHash;
    };
};

export const addBranch = async (
    name: type.Label,
    description: string,
    projectId: type.ProjectId,
    userId: type.UserId,
    commitSummary: string,
    commitDescription: string,
    dependencies: ReadonlyArray<{
        projectId: type.ProjectId;
        releaseId: type.ReleaseId;
    }>,
    parentCommitHashes: ReadonlyArray<type.CommitHash>,
    projectName: string,
    projectIconHash: type.FileHash,
    projectImageHash: type.FileHash,
    projectSummary: string,
    projectDescription: string,
    releaseId: null | type.ReleaseId,
    children: ReadonlyArray<{
        id: type.ModuleId;
        hash: type.ModuleSnapshotHash;
    }>,
    typeDefs: ReadonlyArray<{
        id: type.TypeId;
        hash: type.TypeDefSnapshotHash;
    }>,
    partDefs: ReadonlyArray<{
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
        projectIconHash: projectIconHash,
        projectImageHash: projectImageHash,
        projectSummary: projectSummary,
        projectDescription: projectDescription,
        partDefs: partDefs,
        typeDefs: typeDefs,
        releaseId: releaseId,
        children: children
    })).hash;

    const branchId = type.createRandomId() as type.BranchId;
    await databaseLow.addBranch(branchId, {
        name: name,
        description: description,
        projectId: projectId,
        headHash: branchHeadCommitHash,
        ownerId: userId
    });
    return {
        id: branchId,
        name: name,
        description: description,
        project: { id: projectId },
        head: { hash: branchHeadCommitHash },
        owner: { id: userId },
        draftCommit: null
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
    head: { hash: data.headHash },
    owner: { id: data.ownerId },
    draftCommit: null
});

/* ==========================================
                   Commit
   ==========================================
*/
type CommitLowCost = {
    readonly hash: type.CommitHash;
    readonly parentCommits: ReadonlyArray<{
        readonly hash: type.CommitHash;
    }>;
    readonly releaseId: null | type.ReleaseId;
    readonly description: string;
    readonly author: {
        readonly id: type.UserId;
    };
    readonly date: Date;
    readonly projectName: string;
    readonly projectIcon: {
        hash: type.FileHash | null;
    };
    readonly projectImage: {
        hash: type.FileHash | null;
    };
    readonly projectSummary: string;
    readonly projectDescription: string;
    readonly children: ReadonlyArray<{
        readonly id: type.ModuleId;
        readonly snapshot: {
            readonly hash: type.ModuleSnapshotHash;
        };
    }>;
    readonly typeDefs: ReadonlyArray<{
        readonly id: type.TypeId;
        readonly snapshot: {
            readonly hash: type.TypeDefSnapshotHash;
        };
    }>;
    readonly partDefs: ReadonlyArray<{
        readonly id: type.PartId;
        readonly snapshot: {
            readonly hash: type.PartDefSnapshotHash;
        };
    }>;
    readonly dependencies: ReadonlyArray<{
        readonly project: {
            readonly id: type.ProjectId;
        };
        readonly releaseId: type.ReleaseId;
    }>;
};

export const addCommit = async (data: {
    parentCommitHashes: ReadonlyArray<type.CommitHash>;
    releaseId: null | type.ReleaseId;
    authorId: type.UserId;
    commitSummary: string;
    commitDescription: string;
    projectName: string;
    projectIconHash: type.FileHash | null;
    projectImageHash: type.FileHash | null;
    projectSummary: string;
    projectDescription: string;
    children: ReadonlyArray<{
        id: type.ModuleId;
        hash: type.ModuleSnapshotHash;
    }>;
    typeDefs: ReadonlyArray<{
        id: type.TypeId;
        hash: type.TypeDefSnapshotHash;
    }>;
    partDefs: ReadonlyArray<{
        id: type.PartId;
        hash: type.PartDefSnapshotHash;
    }>;
    dependencies: ReadonlyArray<{
        projectId: type.ProjectId;
        releaseId: type.ReleaseId;
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
    releaseId: data.releaseId,
    author: {
        id: data.authorId
    },
    date: data.date.toDate(),
    description: data.commitDescription,
    projectName: data.projectName,
    projectIcon: { hash: data.projectIconHash },
    projectImage: { hash: data.projectImageHash },
    projectSummary: data.projectSummary,
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
        releaseId: dependency.releaseId
    }))
});

/* ==========================================
               Draft Commit
   ==========================================
*/
type DraftCommitLowCost = {
    readonly hash: type.DraftCommitHash;
    readonly date: Date;
    readonly description: string;
    readonly isRelease: boolean;
    readonly projectName: string;
    readonly projectIconHash: type.FileHash;
    readonly projectImageHash: type.FileHash;
    readonly projectSummary: string;
    readonly projectDescription: string;
    readonly children: ReadonlyArray<{
        readonly id: type.ModuleId;
        readonly snapshot: {
            readonly hash: type.ModuleSnapshotHash;
        };
    }>;
    readonly typeDefs: ReadonlyArray<{
        readonly id: type.TypeId;
        readonly snapshot: {
            readonly hash: type.TypeDefSnapshotHash;
        };
    }>;
    readonly partDefs: ReadonlyArray<{
        readonly id: type.PartId;
        readonly snapshot: {
            readonly hash: type.PartDefSnapshotHash;
        };
    }>;
    readonly dependencies: ReadonlyArray<{
        readonly project: {
            readonly id: type.ProjectId;
        };
        readonly releaseId: type.ReleaseId;
    }>;
};

export const getDraftCommit = async (
    hash: type.DraftCommitHash
): Promise<DraftCommitLowCost> =>
    databaseLowDraftCommitToLowCost({
        hash: hash,
        data: await databaseLow.getDraftCommit(hash)
    });

const databaseLowDraftCommitToLowCost = ({
    hash,
    data
}: {
    hash: type.DraftCommitHash;
    data: databaseLow.DraftCommitData;
}): DraftCommitLowCost => ({
    hash: hash,
    date: data.date.toDate(),
    description: data.description,
    isRelease: data.isRelease,
    projectName: data.projectName,
    projectIconHash: data.projectIconHash,
    projectImageHash: data.projectImageHash,
    projectSummary: data.projectSummary,
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
        releaseId: dependency.releaseId
    }))
});

/* ==========================================
               Module Snapshot
   ==========================================
*/
type ModuleSnapshotLowCost = {
    readonly hash: type.ModuleSnapshotHash;
    readonly name: type.Label;
    readonly children: ReadonlyArray<{
        readonly id: type.ModuleId;
        readonly snapshot: {
            readonly hash: type.ModuleSnapshotHash;
        };
    }>;
    readonly typeDefs: ReadonlyArray<{
        readonly id: type.TypeId;
        readonly snapshot: {
            readonly hash: type.TypeDefSnapshotHash;
        };
    }>;
    readonly partDefs: ReadonlyArray<{
        readonly id: type.PartId;
        readonly snapshot: {
            readonly hash: type.PartDefSnapshotHash;
        };
    }>;
    readonly description: string;
    readonly exposing: boolean;
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
    readonly hash: type.PartDefSnapshotHash;
    readonly name: type.Label;
    readonly description: string;
    readonly type: ReadonlyArray<type.TypeTermOrParenthesis>;
    readonly expr: {
        readonly hash: type.ExprSnapshotHash;
    };
};

export const addPartDefSnapshot = async (
    name: type.Label,
    description: string,
    type: ReadonlyArray<type.TypeTermOrParenthesis>,
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
               Expr Snapshot
   ==========================================
*/
type ExprSnapshotLowCost = {
    readonly hash: type.ExprSnapshotHash;
    readonly value: ReadonlyArray<type.TermOrParenthesis>;
};

export const addExprDefSnapshot = async (
    value: ReadonlyArray<type.TermOrParenthesis>
): Promise<ExprSnapshotLowCost> => {
    const hash = await databaseLow.addExprSnapshot({ value: value });
    return {
        hash: hash,
        value: value
    };
};

export const getExprSnapshot = async (
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
                AccessToken
   ==========================================
*/

/**
 * アクセストークンを生成して、DBに保存する
 * @param accessToken
 */
export const createAccessToken = async (
    userId: type.UserId
): Promise<type.AccessToken> => {
    const accessToken = type.createAccessToken();
    await databaseLow.createAndWriteAccessToken(
        type.hashAccessToken(accessToken),
        {
            userId: userId,
            issuedAt: databaseLow.getNowTimestamp()
        }
    );
    return accessToken;
};
/**
 * アクセストークンの正当性チェックとuserIdの取得
 * @param accessToken
 */
export const verifyAccessToken = async (
    accessToken: type.AccessToken
): Promise<type.UserId> =>
    await databaseLow.verifyAccessToken(type.hashAccessToken(accessToken));
