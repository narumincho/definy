import * as databaseLow from "./databaseLow";
import * as type from "./type";
import axios, { AxiosResponse } from "axios";
import { URL } from "url";
import * as tool from "./tool";
import * as jwt from "jsonwebtoken";
import * as key from "./key";

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
    leaderProjects: Array<{ id: type.ProjectId }>;
    editingProjects: Array<{ id: type.ProjectId }>;
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
        editingProjects: [],
        leaderProjects: [],
        createdAt: databaseLow.getNowTimestamp(),
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
        editingProjects: data.editingProjects.map(id => ({ id: id })),
        leaderProjects: data.leaderProjects.map(id => ({ id: id }))
    };
};

type ProjectLowCost = {
    id: type.ProjectId;
    name: type.Label;
    leader: {
        id: type.UserId;
    };
    editors: Array<{ id: type.UserId }>;
    createdAt: Date;
    updateAt: Date;
    modules: Array<{ id: type.ModuleId }>;
};

/**
 * プロジェクトを追加する
 */
export const addProject = async (data: {
    name: type.Label;
    leaderId: type.UserId;
    editors: Array<type.UserId>;
}): Promise<ProjectLowCost> => {
    const now = databaseLow.getNowTimestamp();
    const projectId = await databaseLow.addProject({
        name: data.name,
        leaderId: data.leaderId,
        editorIds: data.editors,
        createdAt: now,
        updateAt: now,
        modulesId: [] // TODO ルートモジュールの追加
    });
    return {
        id: projectId,
        name: data.name,
        leader: {
            id: data.leaderId
        },
        editors: data.editors.map(id => ({ id: id })),
        createdAt: now.toDate(),
        updateAt: now.toDate(),
        modules: []
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
    name: data.name,
    leader: {
        id: data.leaderId
    },
    editors: data.editorIds.map(id => ({ id: id })),
    createdAt: data.createdAt.toDate(),
    updateAt: data.updateAt.toDate(),
    modules: data.modulesId.map(id => ({ id: id }))
});

type ModuleLowCost = {
    id: type.ModuleId;
    name: Array<type.Label>;
    project: {
        id: type.ProjectId;
    };
    editors: Array<{ id: type.UserId }>;
    createdAt: Date;
    updateAt: Date;
    description: string;
    typeDefinitions: Array<{ id: type.TypeId }>;
    partDefinitions: Array<{ id: type.PartId }>;
};

/**
 * 指定したモジュールを取得する
 * @param moduleId
 */
export const getModule = async (
    moduleId: type.ModuleId
): Promise<ModuleLowCost> =>
    databaseLowModuleToLowCost({
        id: moduleId,
        data: await databaseLow.getModule(moduleId)
    });

/**
 * 全てのモジュールを取得する
 */
export const getAllModule = async (): Promise<Array<ModuleLowCost>> =>
    (await databaseLow.getAllModule()).map(databaseLowModuleToLowCost);

const databaseLowModuleToLowCost = ({
    id,
    data
}: {
    id: type.ModuleId;
    data: databaseLow.ModuleData;
}): ModuleLowCost => ({
    id: id,
    name: data.name,
    project: {
        id: data.projectId
    },
    editors: data.editorIds.map(id => ({ id: id })),
    createdAt: data.createdAt.toDate(),
    updateAt: data.createdAt.toDate(),
    description: data.description,
    typeDefinitions: data.typeDefinitionIds.map(id => ({ id: id })),
    partDefinitions: data.partDefinitionIds.map(id => ({ id: id }))
});

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
