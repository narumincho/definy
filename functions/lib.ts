import * as admin from "firebase-admin";
import * as apiCodec from "definy-core/source/api";
import * as common from "definy-core";
import * as crypto from "crypto";
import * as d from "definy-core/source/data";
import * as functions from "firebase-functions";
import * as image from "./image";
import * as jimp from "jimp";
import * as jsonWebToken from "jsonwebtoken";
import * as stream from "stream";
import type * as typedFirestore from "typed-admin-firestore";
import * as util from "definy-core/source/util";
import axios, { AxiosResponse } from "axios";
import { URL } from "url";

const app = admin.initializeApp();

type AccessTokenHash = string & { _accessTokenHash: never };

const storageDefaultBucket = app.storage().bucket();
const database = (app.firestore() as unknown) as typedFirestore.Firestore<{
  openConnectState: {
    key: string;
    value: StateData;
    subCollections: Record<never, never>;
  };
  user: {
    key: d.UserId;
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
  createTime: admin.firestore.Timestamp;
  urlData: d.UrlData;
  provider: d.OpenIdConnectProvider;
};

/**
 * 登録してくれたユーザー
 */
type UserData = {
  /** アクセストークンのハッシュ値 */
  readonly accessTokenHash: AccessTokenHash;
  /** アクセストークンを発行した日時 */
  readonly accessTokenIssueTime: admin.firestore.Timestamp;
  readonly createTime: admin.firestore.Timestamp;
  readonly imageHash: d.ImageToken;
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
  readonly iconHash: d.ImageToken;
  readonly imageHash: d.ImageToken;
  readonly createTime: admin.firestore.Timestamp;
  readonly updateTime: admin.firestore.Timestamp;
  readonly createUserId: d.UserId;
  readonly commitId: d.CommitId;
  readonly rootIdeaId: d.IdeaId;
};

type TypePartData = {
  /** パーツの名前 */
  readonly name: string;
  /** 説明文 */
  readonly description: string;
  /** 型パーツの特殊扱いの種類 */
  readonly attribute: d.Maybe<d.TypeAttribute>;
  /** 型パラメーター */
  readonly typeParameterList: ReadonlyArray<d.TypeParameter>;
  /** 定義本体 */
  readonly typePartBody: d.TypePartBody;
  /** 所属しているプロジェクト */
  readonly projectId: d.ProjectId;
  /** 作成日時 */
  readonly createTime: admin.firestore.Timestamp;
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
          ["client_id", getOpenIdConnectClientId("Google")],
          ["redirect_uri", logInRedirectUri("Google")],
          ["scope", "profile openid"],
          ["state", state],
        ])
      );
    case "GitHub":
      return createUrl(
        "https://github.com/login/oauth/authorize",
        new Map([
          ["response_type", "code"],
          ["client_id", getOpenIdConnectClientId("GitHub")],
          ["redirect_uri", logInRedirectUri("GitHub")],
          ["scope", "read:user"],
          ["state", state],
        ])
      );
  }
};

const firestoreTimestampToTime = (
  timestamp: admin.firestore.Timestamp
): d.Time => util.timeFromDate(timestamp.toDate());

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

const logInRedirectUri = (
  openIdConnectProvider: d.OpenIdConnectProvider
): string =>
  "https://definy.app/logInCallback/" + (openIdConnectProvider as string);

/**
 * OpenIdConnectで外部ログインからの受け取ったデータを元に,ログインする前のURLとアクセストークンを返す
 * @param openIdConnectProvider
 * @param code
 * @param state
 */
export const logInCallback = async (
  openIdConnectProvider: d.OpenIdConnectProvider,
  code: string,
  state: string
): Promise<{ urlData: d.UrlData; accessToken: d.AccountToken }> => {
  const documentReference = database.collection("openConnectState").doc(state);
  const stateData = (await documentReference.get()).data();
  if (stateData === undefined) {
    throw new Error("Definy do not generate state.");
  }
  documentReference.delete();
  if (stateData.provider !== openIdConnectProvider) {
    throw new Error("Definy do not generate state.");
  }
  if (stateData.createTime.toMillis() + 60 * 1000 < new Date().getTime()) {
    throw new Error("state is too old.");
  }
  const providerUserData: ProviderUserData = await getUserDataFromCode(
    openIdConnectProvider,
    code
  );
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
  if (documentList.length === 0) {
    const accessToken = await createUser(
      providerUserData,
      openIdConnectProvider
    );
    return {
      urlData: stateData.urlData,
      accessToken,
    };
  }
  const userQueryDocumentSnapshot = documentList[0];
  const userDocumentReference = userQueryDocumentSnapshot.ref;
  const accessTokenData = issueAccessToken();
  await userDocumentReference.update({
    accessTokenHash: accessTokenData.accessTokenHash,
    accessTokenIssueTime: accessTokenData.issueTime,
  });
  return {
    urlData: stateData.urlData,
    accessToken: accessTokenData.accessToken,
  };
};

type ProviderUserData = {
  id: string;
  name: string;
  imageUrl: URL;
};

const getUserDataFromCode = (
  openIdConnectProvider: d.OpenIdConnectProvider,
  code: string
): Promise<ProviderUserData> => {
  switch (openIdConnectProvider) {
    case "Google":
      return getGoogleUserDataFromCode(code);
    case "GitHub":
      return getGitHubUserDataFromCode(code);
  }
};

const getGoogleUserDataFromCode = async (
  code: string
): Promise<ProviderUserData> => {
  const response = await axios.post(
    "https://www.googleapis.com/oauth2/v4/token",
    new URLSearchParams([
      ["grant_type", "authorization_code"],
      ["code", code],
      ["redirect_uri", logInRedirectUri("Google")],
      ["client_id", getOpenIdConnectClientId("Google")],
      ["client_secret", getOpenIdConnectClientSecret("Google")],
    ]),
    {
      headers: {
        "content-type": "application/x-www-form-urlencoded",
      },
    }
  );
  const idToken: string = response.data.id_token;
  const decoded = jsonWebToken.decode(idToken);
  if (typeof decoded === "string" || decoded === null) {
    throw new Error("Google idToken not include object");
  }
  const markedDecoded = decoded as {
    iss: unknown;
    sub: unknown;
    name: unknown;
    picture: unknown;
  };
  if (
    markedDecoded.iss !== "https://accounts.google.com" ||
    typeof markedDecoded.name !== "string" ||
    typeof markedDecoded.sub !== "string" ||
    typeof markedDecoded.picture !== "string"
  ) {
    console.error(
      "Googleから送られてきたIDトークンがおかしい" + markedDecoded.toString()
    );
    throw new Error("Google idToken is invalid");
  }

  return {
    id: markedDecoded.sub,
    name: markedDecoded.name,
    imageUrl: new URL(markedDecoded.picture),
  };
};

const getGitHubUserDataFromCode = async (
  code: string
): Promise<ProviderUserData> => {
  const responseData = (
    await axios.post(
      "https://github.com/login/oauth/access_token",
      new URLSearchParams([
        ["grant_type", "authorization_code"],
        ["code", code],
        ["redirect_uri", logInRedirectUri("GitHub")],
        ["client_id", getOpenIdConnectClientId("GitHub")],
        ["client_secret", getOpenIdConnectClientSecret("GitHub")],
      ]),
      {
        headers: {
          accept: "application/json",
          "content-type": "application/x-www-form-urlencoded",
        },
      }
    )
  ).data;
  const accessToken: unknown = responseData.access_token;
  if (typeof accessToken !== "string") {
    console.error("GitHubからアクセストークンを取得できなかった", responseData);
    throw new Error("LogInError: GitHub Oauth response is invalid");
  }

  const gitHubData = (
    await axios.post(
      "https://api.github.com/graphql",
      {
        query: `
query {
viewer {
    id
    name
    avatarUrl
}
}
`,
      },
      {
        headers: {
          Authorization: "token " + accessToken,
        },
      }
    )
  ).data.data.viewer;
  if (
    gitHubData === undefined ||
    gitHubData === null ||
    typeof gitHubData === "string"
  ) {
    throw new Error("LogInError: GitHub API response is invalid");
  }
  const id: unknown = gitHubData.id;
  const name: unknown = gitHubData.name;
  const avatarUrl: unknown = gitHubData.avatarUrl;
  if (
    typeof id !== "string" ||
    typeof name !== "string" ||
    typeof avatarUrl !== "string"
  ) {
    throw new Error("LogInError: GitHub API response is invalid");
  }
  return {
    id,
    name,
    imageUrl: new URL(avatarUrl),
  };
};

const createUser = async (
  providerUserData: ProviderUserData,
  provider: d.OpenIdConnectProvider
): Promise<d.AccountToken> => {
  const imageHash = await getAndSaveUserImage(providerUserData.imageUrl);
  const createTime = admin.firestore.Timestamp.now();
  const accessTokenData = issueAccessToken();
  await database
    .collection("user")
    .doc(createRandomId() as d.UserId)
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

const getAndSaveUserImage = async (imageUrl: URL): Promise<d.ImageToken> => {
  const response: AxiosResponse<Buffer> = await axios.get(imageUrl.toString(), {
    responseType: "arraybuffer",
  });
  return savePngFile(
    await (await jimp.create(response.data))
      .resize(64, 64)
      .getBufferAsync("image/ong")
  );
};

/**
 * Firebase Cloud Storage にPNGファイルを保存する
 */
const savePngFile = (binary: Uint8Array): Promise<d.ImageToken> =>
  saveFile(binary, "image/png");

/**
 * Firebase Cloud Storage にファイルを保存する
 */
const saveFile = async (
  binary: Uint8Array,
  mimeType: string
): Promise<d.ImageToken> => {
  const hash = createImageTokenFromUint8ArrayAndMimeType(binary, mimeType);
  const file = storageDefaultBucket.file(hash);
  await file.save(Buffer.from(binary), { contentType: mimeType });
  return hash;
};

export const createImageTokenFromUint8ArrayAndMimeType = (
  binary: Uint8Array,
  mimeType: string
): d.ImageToken =>
  crypto
    .createHash("sha256")
    .update(binary)
    .update(mimeType, "utf8")
    .digest("hex") as d.ImageToken;

/**
 * OpenIdConnectのclientSecretはfirebaseの環境変数に設定されている
 */
const getOpenIdConnectClientSecret = (
  openIdConnectProvider: d.OpenIdConnectProvider
): string => {
  return functions.config().openidconnectclientsecret[
    openIdConnectProvider.toLowerCase()
  ];
};

const getOpenIdConnectClientId = (
  openIdConnectProvider: d.OpenIdConnectProvider
): string => {
  switch (openIdConnectProvider) {
    case "Google":
      return "8347840964-l3796imv2d11d0qi8cnb6r48n5jabk9t.apps.googleusercontent.com";
    case "GitHub":
      return "b35031a84487b285978e";
  }
};

/**
 * アクセストークンを生成する
 */
const issueAccessToken = (): {
  accessToken: d.AccountToken;
  accessTokenHash: AccessTokenHash;
  issueTime: admin.firestore.Timestamp;
} => {
  const accessToken = crypto.randomBytes(32).toString("hex") as d.AccountToken;
  return {
    accessToken,
    accessTokenHash: hashAccessToken(accessToken),
    issueTime: admin.firestore.Timestamp.now(),
  };
};

const hashAccessToken = (accountToken: d.AccountToken): AccessTokenHash =>
  crypto
    .createHash("sha256")
    .update(new Uint8Array(d.AccountToken.codec.encode(accountToken)))
    .digest("hex") as AccessTokenHash;

export const getReadableStream = (imageToken: d.ImageToken): stream.Readable =>
  storageDefaultBucket.file(imageToken).createReadStream();

const projectDataToProjectSnapshot = (document: ProjectData): d.Project => ({
  name: document.name,
  iconHash: document.iconHash,
  imageHash: document.imageHash,
  createTime: firestoreTimestampToTime(document.createTime),
  createUserId: document.createUserId,
  updateTime: firestoreTimestampToTime(document.updateTime),
  commitId: document.commitId,
  rootIdeaId: document.rootIdeaId,
});

const typePartFromDBType = (
  typePartId: d.TypePartId,
  typePartData: TypePartData
): d.IdAndData<d.TypePartId, d.TypePart> => {
  return {
    id: typePartId,
    data: {
      name: typePartData.name,
      description: typePartData.description,
      attribute: typePartData.attribute,
      typeParameterList: typePartData.typeParameterList,
      body: typePartData.typePartBody,
      projectId: typePartData.projectId,
    },
  };
};

const typePartToDBType = (
  typePart: d.TypePart,
  createTime: admin.firestore.Timestamp
): TypePartData => ({
  name: typePart.name,
  description: typePart.description,
  attribute: typePart.attribute,
  typeParameterList: typePart.typeParameterList,
  createTime,
  projectId: typePart.projectId,
  typePartBody: typePart.body,
});

const typePartToDBTypeWithoutCreateTime = (
  typePart: d.TypePart
): Omit<TypePartData, "createTime"> => ({
  name: typePart.name,
  description: typePart.description,
  attribute: typePart.attribute,
  typeParameterList: typePart.typeParameterList,
  projectId: typePart.projectId,
  typePartBody: typePart.body,
});

const addTypePart = async (
  projectId: d.ProjectId
): Promise<d.IdAndData<d.TypePartId, d.TypePart>> => {
  const newTypePart: d.TypePart = {
    name: "NewType",
    description: "",
    attribute: d.Maybe.Nothing(),
    projectId,
    typeParameterList: [],
    body: d.TypePartBody.Sum([]),
  };
  const newTypePartId = createRandomId() as d.TypePartId;
  await database
    .collection("typePart")
    .doc(newTypePartId)
    .set(typePartToDBType(newTypePart, admin.firestore.Timestamp.now()));
  return {
    id: newTypePartId,
    data: newTypePart,
  };
};

type ApiCodecType = typeof apiCodec;

type GetCodecType<codec> = codec extends d.Codec<infer t> ? t : never;

export const apiFunc: {
  [apiName in keyof ApiCodecType]: (
    request: GetCodecType<ApiCodecType[apiName]["request"]>
  ) => Promise<GetCodecType<ApiCodecType[apiName]["response"]>>;
} = {
  requestLogInUrl: async (requestLogInUrlRequestData) => {
    const state = createRandomId();
    await database.collection("openConnectState").doc(state).create({
      createTime: admin.firestore.Timestamp.now(),
      urlData: requestLogInUrlRequestData.urlData,
      provider: requestLogInUrlRequestData.openIdConnectProvider,
    });
    return logInUrlFromOpenIdConnectProviderAndState(
      requestLogInUrlRequestData.openIdConnectProvider,
      state
    ).toString();
  },
  getUserByAccountToken: async (accountToken) => {
    const accessTokenHash: AccessTokenHash = hashAccessToken(accountToken);
    const querySnapshot = await database
      .collection("user")
      .where("accessTokenHash", "==", accessTokenHash)
      .get();
    const userDataDocs = querySnapshot.docs;
    if (userDataDocs.length !== 1) {
      return d.Maybe.Nothing();
    }
    const queryDocumentSnapshot = userDataDocs[0];
    const userData = queryDocumentSnapshot.data();

    return d.Maybe.Just({
      id: queryDocumentSnapshot.id as d.UserId,
      data: {
        name: userData.name,
        imageHash: userData.imageHash,
        introduction: userData.introduction,
        createTime: firestoreTimestampToTime(userData.createTime),
      },
    });
  },
  getUser: async (userId) => {
    const documentSnapshot = await database
      .collection("user")
      .doc(userId)
      .get();
    const userData = documentSnapshot.data();
    return {
      data:
        userData === undefined
          ? d.Maybe.Nothing()
          : d.Maybe.Just({
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
  ): Promise<d.Maybe<d.IdAndData<d.ProjectId, d.Project>>> => {
    const userDataMaybe = await apiFunc.getUserByAccountToken(
      parameter.accountToken
    );
    switch (userDataMaybe._) {
      case "Just": {
        const userData = userDataMaybe.value;
        const normalizedProjectName = common.stringToValidProjectName(
          parameter.projectName
        );
        const projectNameWithDefault =
          normalizedProjectName === null ? "?" : normalizedProjectName;
        const projectId = createRandomId() as d.ProjectId;
        const iconAndImage = await image.createProjectIconAndImage();
        const iconHashPromise = savePngFile(iconAndImage.icon);
        const imageHashPromise = savePngFile(iconAndImage.image);
        const createTime = admin.firestore.Timestamp.now();
        const createTimeAsTime = firestoreTimestampToTime(createTime);
        const rootIdeaId = createRandomId() as d.IdeaId;
        const emptyCommitId = createRandomId() as d.CommitId;
        const project: ProjectData = {
          name: projectNameWithDefault,
          iconHash: await iconHashPromise,
          imageHash: await imageHashPromise,
          createUserId: userData.id,
          createTime,
          updateTime: createTime,
          commitId: emptyCommitId,
          rootIdeaId,
        };

        await database.collection("project").doc(projectId).create(project);
        return d.Maybe.Just<d.IdAndData<d.ProjectId, d.Project>>({
          id: projectId,
          data: {
            name: project.name,
            iconHash: project.iconHash,
            imageHash: project.imageHash,
            createUserId: project.createUserId,
            createTime: createTimeAsTime,
            updateTime: createTimeAsTime,
            commitId: emptyCommitId,
            rootIdeaId,
          },
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
      data: documentList.map((document) => ({
        id: document.id,
        data: projectDataToProjectSnapshot(document.data()),
      })),
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
          : d.Maybe.Just<d.Project>(projectDataToProjectSnapshot(document)),
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
    const userPromise = apiFunc.getUserByAccountToken(
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
    if (project.data.value.createUserId !== user.value.id) {
      throw new Error("user can not edit this d.Project");
    }
    return {
      data: d.Maybe.Just(await addTypePart(accountTokenAndProjectId.projectId)),
      getTime: util.timeFromDate(new Date()),
    };
  },
  setTypePartList: async (request) => {
    const projectData = await apiFunc.getProject(request.projectId);
    // プロジェクトが存在しなかった
    if (projectData.data._ === "Nothing") {
      return {
        getTime: projectData.getTime,
        data: d.Maybe.Nothing(),
      };
    }
    const account = await apiFunc.getUserByAccountToken(request.accountToken);
    // アカウントトークンが不正だった
    if (account._ === "Nothing") {
      return {
        getTime: projectData.getTime,
        data: d.Maybe.Nothing(),
      };
    }
    // 型パーツを編集するアカウントとプロジェクトを作ったアカウントが違う
    if (account.value.id !== projectData.data.value.createUserId) {
      return {
        getTime: projectData.getTime,
        data: d.Maybe.Nothing(),
      };
    }
    await Promise.all(
      request.typePartList.map(
        async ({ id, data }): Promise<void> => {
          const typePartDocSnapshot = await database
            .collection("typePart")
            .doc(id)
            .get();
          const typePartDoc = typePartDocSnapshot.data();
          if (typePartDoc === undefined) {
            throw new Error("unknown typePart. typePartId=" + id);
          }
          if (typePartDoc.projectId !== request.projectId) {
            throw new Error(
              "typePart project is not same. projectId=" +
                request.projectId +
                "   typePartId" +
                id
            );
          }
          await database
            .collection("typePart")
            .doc(id)
            .update(typePartToDBTypeWithoutCreateTime(data));
        }
      )
    );

    return apiFunc.getTypePartByProjectId(request.projectId);
  },
  setTypePartListAndAddTypePart: async (request) => {
    const projectData = await apiFunc.getProject(request.projectId);
    // プロジェクトが存在しなかった
    if (projectData.data._ === "Nothing") {
      return {
        getTime: projectData.getTime,
        data: d.Maybe.Nothing(),
      };
    }
    const account = await apiFunc.getUserByAccountToken(request.accountToken);
    // アカウントトークンが不正だった
    if (account._ === "Nothing") {
      return {
        getTime: projectData.getTime,
        data: d.Maybe.Nothing(),
      };
    }
    // 型パーツを編集するアカウントとプロジェクトを作ったアカウントが違う
    if (account.value.id !== projectData.data.value.createUserId) {
      return {
        getTime: projectData.getTime,
        data: d.Maybe.Nothing(),
      };
    }
    await addTypePart(request.projectId);
    await Promise.all(
      request.typePartList.map(
        async ({ id, data }): Promise<void> => {
          const typePartDocSnapshot = await database
            .collection("typePart")
            .doc(id)
            .get();
          const typePartDoc = typePartDocSnapshot.data();
          if (typePartDoc === undefined) {
            throw new Error("unknown typePart. typePartId=" + id);
          }
          if (typePartDoc.projectId !== request.projectId) {
            throw new Error(
              "typePart project is not same. projectId=" +
                request.projectId +
                "   typePartId" +
                id
            );
          }
          await database
            .collection("typePart")
            .doc(id)
            .update(typePartToDBTypeWithoutCreateTime(data));
        }
      )
    );

    return apiFunc.getTypePartByProjectId(request.projectId);
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
    const account = await apiFunc.getUserByAccountToken(request.accountToken);
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
    if (account.value.id !== projectData.data.value.createUserId) {
      return {
        getTime: projectData.getTime,
        data: d.Maybe.Nothing(),
      };
    }

    const writeData = await database
      .collection("typePart")
      .doc(request.typePartId)
      .update(typePartToDBTypeWithoutCreateTime(request.typePart));

    return {
      getTime: firestoreTimestampToTime(writeData.writeTime),
      data: d.Maybe.Just(request.typePart),
    };
  },
};
