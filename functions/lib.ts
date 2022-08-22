import * as commonUrl from "../common/url";
import * as core from "../core/main";
import * as crypto from "node:crypto";
import * as d from "../localData";
import * as image from "./image";
import * as jimp from "jimp";
import * as mimeType from "../definy-output/typescript/mimeType";
import type * as typedFirestore from "typed-admin-firestore";
import * as util from "../core/util";
import {
  AccountDataInProvider,
  getAccountDataInGoogleFromCode,
  googleLogInClientId,
} from "./login";
import { ApiCodecType, GetCodecType } from "../common/apiCodec";
import { Timestamp, getFirestore } from "firebase-admin/firestore";
import axios, { AxiosResponse } from "axios";
import type { Readable } from "node:stream";
import { getStorage } from "firebase-admin/storage";
import { initializeApp } from "firebase-admin/app";

const app = initializeApp();

type AccessTokenHash = string & { _accessTokenHash: never };

const storageDefaultBucket = getStorage(app).bucket();
const database = getFirestore(app) as unknown as typedFirestore.Firestore<{
  openConnectState: {
    key: string;
    value: StateData;
    subCollections: Record<never, never>;
  };
  user: {
    key: d.AccountId;
    value: UserData;
    subCollections: Record<never, never>;
  };
  project: {
    key: d.ProjectId;
    value: ProjectData;
    subCollections: Record<never, never>;
  };
  typePart: {
    key: d.TypePartId;
    value: TypePartData;
    subCollections: Record<never, never>;
  };
}>;

type StateData = {
  createTime: Timestamp;
  locationAndLanguage: d.LocationAndLanguage;
  provider: d.OpenIdConnectProvider;
};

/**
 * 登録してくれたユーザー
 */
type UserData = {
  /** アクセストークンのハッシュ値 */
  readonly accessTokenHash: AccessTokenHash;
  /** アクセストークンを発行した日時 */
  readonly accessTokenIssueTime: Timestamp;
  readonly createTime: Timestamp;
  readonly imageHash: d.ImageHash;
  readonly introduction: string;
  /** ユーザー名 */
  readonly name: string;
  /** ユーザーのログイン */
  readonly openIdConnect: OpenIdConnectProviderAndId;
};

/** ソーシャルログインに関する情報 */
type OpenIdConnectProviderAndId = {
  /** プロバイダー (例: Google, GitHub) */
  readonly provider: d.OpenIdConnectProvider;
  /** プロバイダー内でのアカウントID */
  readonly idInProvider: string;
};

type ProjectData = {
  readonly name: string;
  readonly iconHash: d.ImageHash;
  readonly imageHash: d.ImageHash;
  readonly createTime: Timestamp;
  readonly updateTime: Timestamp;
  readonly createUserId: d.AccountId;
};

type TypePartData = {
  /** パーツの名前 */
  readonly name: string;
  /** 説明文 */
  readonly description: string;
  /** 型パーツの特殊扱いの種類 */
  readonly attribute: d.Maybe<d.TypeAttribute>;
  /** 型パラメーター */
  readonly typeParameterList: ReadonlyArray<d.DataTypeParameter>;
  /** 定義本体 */
  readonly typePartBody: d.TypePartBody;
  /** 所属しているプロジェクト */
  readonly projectId: d.ProjectId;
  /** 作成日時 */
  readonly createTime: Timestamp;
};

const logInUrlFromOpenIdConnectProviderAndState = (
  openIdConnectProvider: d.OpenIdConnectProvider,
  state: string
): URL => {
  switch (openIdConnectProvider) {
    case "Google":
      return createUrl(
        "https://accounts.google.com/o/oauth2/v2/auth",
        new Map([
          ["response_type", "code"],
          ["client_id", googleLogInClientId],
          ["redirect_uri", commonUrl.logInRedirectUri("Google")],
          ["scope", "profile openid"],
          ["state", state],
        ])
      );
  }
};

const firestoreTimestampToTime = (timestamp: Timestamp): d.Time =>
  util.timeFromDate(timestamp.toDate());

const createUrl = (
  originAndPath: string,
  query: ReadonlyMap<string, string>
): URL => {
  const url = new URL(originAndPath);
  for (const [key, value] of query) {
    url.searchParams.append(key, value);
  }
  return url;
};

/**
 * Id。各種リソースを識別するために使うID。UUID(v4)やIPv6と同じ128bit, 16bytes
 * 小文字に統一して、大文字は使わない。長さは32文字
 */
const createRandomId = (): string => {
  return crypto.randomBytes(16).toString("hex");
};

/**
 * OpenIdConnectで外部ログインからの受け取ったデータを元に,ログインする前のURLとアクセストークンを返す
 * @param openIdConnectProvider
 * @param code
 * @param state
 */
const logInCallback = async ({
  code,
  state,
  openIdConnectProvider,
}: d.CodeAndState): Promise<
  d.Result<
    {
      readonly locationAndLanguage: d.LocationAndLanguage;
      readonly accessToken: d.AccountToken;
    },
    string
  >
> => {
  const documentReference = database.collection("openConnectState").doc(state);
  const stateData = (await documentReference.get()).data();
  if (stateData === undefined) {
    return d.Result.Error("definy do not generate state.");
  }
  documentReference.delete();
  if (stateData.provider !== openIdConnectProvider) {
    return d.Result.Error("definy do not generate state.");
  }
  if (stateData.createTime.toMillis() + 60 * 1000 < new Date().getTime()) {
    return d.Result.Error("definy do not generate state.");
  }
  const providerUserData = await getAccountDataInGoogleFromCode(code);
  if (providerUserData === undefined) {
    throw new Error("google server response error?");
  }
  const openIdConnectProviderAndIdQuery: OpenIdConnectProviderAndId = {
    idInProvider: providerUserData.id,
    provider: openIdConnectProvider,
  };
  const documentList = (
    await database
      .collection("user")
      .where("openIdConnect", "==", openIdConnectProviderAndIdQuery)
      .get()
  ).docs;
  if (documentList[0] === undefined) {
    const accessToken = await createUser(
      providerUserData,
      openIdConnectProvider
    );
    return d.Result.Ok({
      locationAndLanguage: stateData.locationAndLanguage,
      accessToken,
    });
  }
  const userQueryDocumentSnapshot = documentList[0];
  const userDocumentReference = userQueryDocumentSnapshot.ref;
  const accessTokenData = issueAccessToken();
  await userDocumentReference.update({
    accessTokenHash: accessTokenData.accessTokenHash,
    accessTokenIssueTime: accessTokenData.issueTime,
  });
  return d.Result.Ok({
    locationAndLanguage: stateData.locationAndLanguage,
    accessToken: accessTokenData.accessToken,
  });
};

const createUser = async (
  providerUserData: AccountDataInProvider,
  provider: d.OpenIdConnectProvider
): Promise<d.AccountToken> => {
  const imageHash = await getAndSaveUserImage(providerUserData.imageUrl);
  const createTime = Timestamp.now();
  const accessTokenData = issueAccessToken();
  await database
    .collection("user")
    .doc(d.AccountId.fromString(createRandomId()))
    .create({
      name: providerUserData.name,
      createTime,
      imageHash,
      introduction: "",
      accessTokenHash: accessTokenData.accessTokenHash,
      accessTokenIssueTime: accessTokenData.issueTime,
      openIdConnect: {
        idInProvider: providerUserData.id,
        provider,
      },
    });
  return accessTokenData.accessToken;
};

const getAndSaveUserImage = async (imageUrl: URL): Promise<d.ImageHash> => {
  const response: AxiosResponse<Buffer> = await axios.get(imageUrl.toString(), {
    responseType: "arraybuffer",
  });
  return savePngFile(
    await (await jimp.create(response.data))
      .resize(64, 64)
      .getBufferAsync(mimeType.png)
  );
};

/**
 * Cloud Storage for Firebase に PNGファイルを保存する
 */
const savePngFile = async (binary: Uint8Array): Promise<d.ImageHash> => {
  const hash = createImageTokenFromUint8ArrayAndMimeType(binary);
  const file = storageDefaultBucket.file(hash);
  await file.save(Buffer.from(binary), {
    contentType: mimeType.png,
  });
  return hash;
};

export const createImageTokenFromUint8ArrayAndMimeType = (
  binary: Uint8Array
): d.ImageHash =>
  d.ImageHash.fromString(
    crypto
      .createHash("sha256")
      .update(binary)
      .update(mimeType.png, "utf8")
      .digest("hex")
  );

/**
 * アクセストークンを生成する
 */
const issueAccessToken = (): {
  accessToken: d.AccountToken;
  accessTokenHash: AccessTokenHash;
  issueTime: Timestamp;
} => {
  const accessToken = d.AccountToken.fromString(
    crypto.randomBytes(32).toString("hex")
  );
  return {
    accessToken,
    accessTokenHash: hashAccessToken(accessToken),
    issueTime: Timestamp.now(),
  };
};

const hashAccessToken = (accountToken: d.AccountToken): AccessTokenHash =>
  crypto
    .createHash("sha256")
    .update(new Uint8Array(d.AccountToken.codec.encode(accountToken)))
    .digest("hex") as AccessTokenHash;

/**
 * Cloud Storage for Firebase からPNGファイルを読み込む
 */
export const readPngFile = (hash: string): Readable => {
  return storageDefaultBucket.file(hash).createReadStream();
};

const projectDataToProjectSnapshot = (
  id: d.ProjectId,
  document: ProjectData
): d.Project => ({
  id,
  name: document.name,
  iconHash: document.iconHash,
  imageHash: document.imageHash,
  createTime: firestoreTimestampToTime(document.createTime),
  createAccountId: document.createUserId,
  updateTime: firestoreTimestampToTime(document.updateTime),
});

const typePartFromDBType = (
  typePartId: d.TypePartId,
  typePartData: TypePartData
): d.TypePart => {
  return {
    id: typePartId,
    name: typePartData.name,
    description: typePartData.description,
    attribute: typePartData.attribute,
    dataTypeParameterList: typePartData.typeParameterList,
    body: typePartData.typePartBody,
    projectId: typePartData.projectId,
  };
};

const typePartToDBType = (
  typePart: d.TypePart,
  createTime: Timestamp
): TypePartData => ({
  name: typePart.name,
  description: typePart.description,
  attribute: typePart.attribute,
  typeParameterList: typePart.dataTypeParameterList,
  createTime,
  projectId: typePart.projectId,
  typePartBody: typePart.body,
});

const addTypePart = async (projectId: d.ProjectId): Promise<d.TypePart> => {
  const newTypePartId = d.TypePartId.fromString(createRandomId());
  const newTypePart: d.TypePart = {
    id: newTypePartId,
    name: "NewType",
    description: "",
    attribute: d.Maybe.Nothing(),
    projectId,
    dataTypeParameterList: [],
    body: d.TypePartBody.Sum([]),
  };
  await database
    .collection("typePart")
    .doc(newTypePartId)
    .set(typePartToDBType(newTypePart, Timestamp.now()));
  return newTypePart;
};

const getAccountByAccountToken = async (
  accountToken: d.AccountToken
): Promise<d.Maybe<d.Account>> => {
  const accessTokenHash: AccessTokenHash = hashAccessToken(accountToken);
  const querySnapshot = await database
    .collection("user")
    .where("accessTokenHash", "==", accessTokenHash)
    .get();
  const userDataDocs = querySnapshot.docs;
  if (userDataDocs[0] === undefined || userDataDocs.length !== 1) {
    return d.Maybe.Nothing();
  }
  const queryDocumentSnapshot = userDataDocs[0];
  const userData = queryDocumentSnapshot.data();

  return d.Maybe.Just({
    id: d.AccountId.fromString(queryDocumentSnapshot.id),
    name: userData.name,
    imageHash: userData.imageHash,
    introduction: userData.introduction,
    createTime: firestoreTimestampToTime(userData.createTime),
  });
};

export const apiFunc: {
  [apiName in keyof ApiCodecType]: (
    request: GetCodecType<ApiCodecType[apiName]["request"]>
  ) => Promise<GetCodecType<ApiCodecType[apiName]["response"]>>;
} = {
  requestLogInUrl: async (requestLogInUrlRequestData) => {
    const state = createRandomId();
    await database.collection("openConnectState").doc(state).create({
      createTime: Timestamp.now(),
      locationAndLanguage: requestLogInUrlRequestData.locationAndLanguage,
      provider: requestLogInUrlRequestData.openIdConnectProvider,
    });
    return logInUrlFromOpenIdConnectProviderAndState(
      requestLogInUrlRequestData.openIdConnectProvider,
      state
    ).toString();
  },
  getAccountByAccountToken,
  getAccountTokenAndUrlDataByCodeAndState: async (codeAndState) => {
    const result = await logInCallback(codeAndState);
    if (result._ === "Error") {
      return d.Maybe.Nothing();
    }
    const account = await getAccountByAccountToken(result.ok.accessToken);
    if (account._ === "Nothing") {
      return d.Maybe.Nothing();
    }
    return d.Maybe.Just({
      account: account.value,
      accountToken: result.ok.accessToken,
      locationAndLanguage: result.ok.locationAndLanguage,
    });
  },
  getAccount: async (accountId) => {
    const documentSnapshot = await database
      .collection("user")
      .doc(accountId)
      .get();
    const userData = documentSnapshot.data();
    return {
      data:
        userData === undefined
          ? d.Maybe.Nothing()
          : d.Maybe.Just({
              id: d.AccountId.fromString(documentSnapshot.id),
              name: userData.name,
              imageHash: userData.imageHash,
              introduction: userData.introduction,
              createTime: firestoreTimestampToTime(userData.createTime),
            }),
      getTime: firestoreTimestampToTime(documentSnapshot.readTime),
    };
  },
  createProject: async (
    parameter: d.CreateProjectParameter
  ): Promise<d.Maybe<d.Project>> => {
    const userDataMaybe = await getAccountByAccountToken(
      parameter.accountToken
    );
    switch (userDataMaybe._) {
      case "Just": {
        const userData = userDataMaybe.value;
        const normalizedProjectName = core.stringToValidProjectName(
          parameter.projectName
        );
        const projectNameWithDefault =
          normalizedProjectName === null ? "?" : normalizedProjectName;
        const projectId = d.ProjectId.fromString(createRandomId());
        const iconAndImage = await image.createProjectIconAndImage();
        const iconHashPromise = savePngFile(iconAndImage.icon);
        const imageHashPromise = savePngFile(iconAndImage.image);
        const createTime = Timestamp.now();
        const createTimeAsTime = firestoreTimestampToTime(createTime);
        const project: ProjectData = {
          name: projectNameWithDefault,
          iconHash: await iconHashPromise,
          imageHash: await imageHashPromise,
          createUserId: userData.id,
          createTime,
          updateTime: createTime,
        };

        await database.collection("project").doc(projectId).create(project);
        return d.Maybe.Just<d.Project>({
          id: projectId,
          name: project.name,
          iconHash: project.iconHash,
          imageHash: project.imageHash,
          createAccountId: project.createUserId,
          createTime: createTimeAsTime,
          updateTime: createTimeAsTime,
        });
      }
      case "Nothing": {
        return d.Maybe.Nothing();
      }
    }
  },
  getTop50Project: async () => {
    const querySnapshot: typedFirestore.QuerySnapshot<
      d.ProjectId,
      ProjectData
    > = await database.collection("project").limit(50).get();
    const documentList: ReadonlyArray<
      typedFirestore.QueryDocumentSnapshot<d.ProjectId, ProjectData>
    > = querySnapshot.docs;
    const getTime = firestoreTimestampToTime(querySnapshot.readTime);
    return {
      data: documentList.map((document) =>
        projectDataToProjectSnapshot(document.id, document.data())
      ),
      getTime,
    };
  },
  getProject: async (projectId) => {
    const documentSnapshot = await database
      .collection("project")
      .doc(projectId)
      .get();
    const document = documentSnapshot.data();
    return {
      data:
        document === undefined
          ? d.Maybe.Nothing()
          : d.Maybe.Just<d.Project>(
              projectDataToProjectSnapshot(documentSnapshot.id, document)
            ),
      getTime: firestoreTimestampToTime(documentSnapshot.readTime),
    };
  },
  getImageFile: async (imageToken) => {
    const file = storageDefaultBucket.file(imageToken);
    const downloadResponse: Buffer | undefined = (await file.download())[0];
    if (downloadResponse === undefined) {
      throw new Error("Received an unknown Image Token. token =" + imageToken);
    }
    return downloadResponse;
  },
  getTypePartByProjectId: async (projectId) => {
    const documentSnapshot = await database
      .collection("typePart")
      .where("projectId", "==", projectId)
      .get();
    return {
      data: d.Maybe.Just(
        documentSnapshot.docs.map((document) =>
          typePartFromDBType(document.id, document.data())
        )
      ),
      getTime: firestoreTimestampToTime(documentSnapshot.readTime),
    };
  },
  addTypePart: async (accountTokenAndProjectId: d.AccountTokenAndProjectId) => {
    const userPromise = getAccountByAccountToken(
      accountTokenAndProjectId.accountToken
    );
    const projectPromise = apiFunc.getProject(
      accountTokenAndProjectId.projectId
    );
    const user = await userPromise;
    if (user._ === "Nothing") {
      throw new Error("invalid account token");
    }
    const project = await projectPromise;
    if (project.data._ === "Nothing") {
      throw new Error("invalid project id");
    }
    if (project.data.value.createAccountId !== user.value.id) {
      throw new Error("user can not edit this d.Project");
    }
    return {
      data: d.Maybe.Just(await addTypePart(accountTokenAndProjectId.projectId)),
      getTime: util.timeFromDate(new Date()),
    };
  },
  setTypePart: async (request) => {
    const typePartSnapshot = await database
      .collection("typePart")
      .doc(request.typePartId)
      .get();
    const typePart = typePartSnapshot.data();

    // 型パーツが存在していなかった
    if (typePart === undefined) {
      return {
        getTime: firestoreTimestampToTime(typePartSnapshot.readTime),
        data: d.Maybe.Nothing(),
      };
    }
    const account = await getAccountByAccountToken(request.accountToken);
    // アカウントトークンが不正だった
    if (account._ === "Nothing") {
      return {
        getTime: firestoreTimestampToTime(typePartSnapshot.readTime),
        data: d.Maybe.Nothing(),
      };
    }

    const projectData = await apiFunc.getProject(typePart.projectId);
    // プロジェクトが存在しなかった (ありえないエラー)
    if (projectData.data._ === "Nothing") {
      return {
        getTime: projectData.getTime,
        data: d.Maybe.Nothing(),
      };
    }

    // 型パーツを編集するアカウントとプロジェクトを作ったアカウントが違う
    if (account.value.id !== projectData.data.value.createAccountId) {
      return {
        getTime: projectData.getTime,
        data: d.Maybe.Nothing(),
      };
    }

    const writeData = await database
      .collection("typePart")
      .doc(request.typePartId)
      .update({
        name: request.name,
        description: request.description,
        attribute: request.attribute,
        typeParameterList: request.typeParameterList,
        typePartBody: request.body,
      });

    return {
      getTime: firestoreTimestampToTime(writeData.writeTime),
      data: d.Maybe.Just({
        name: request.name,
        description: request.description,
        attribute: request.attribute,
        dataTypeParameterList: request.typeParameterList,
        body: request.body,
        id: request.typePartId,
        projectId: typePart.projectId,
      }),
    };
  },
  getTypePart: async (typePartId) => {
    const typePartSnapshot = await database
      .collection("typePart")
      .doc(typePartId)
      .get();
    const typePartData = typePartSnapshot.data();

    // 型パーツが存在していなかった
    if (typePartData === undefined) {
      return {
        getTime: firestoreTimestampToTime(typePartSnapshot.readTime),
        data: d.Maybe.Nothing(),
      };
    }
    return {
      getTime: firestoreTimestampToTime(typePartSnapshot.readTime),
      data: d.Maybe.Just(typePartFromDBType(typePartSnapshot.id, typePartData)),
    };
  },
};
