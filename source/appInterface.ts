import * as core from "definy-core";
import * as coreUtil from "definy-core/source/util";
import * as d from "definy-core/source/data";
import * as indexedDB from "./indexedDB";
import {
  GetTypePartInProjectState,
  HomeProjectState,
  TypePartEditSate,
} from "./model";
import { api } from "./api";

export class AppInterface {
  /** ホームに表示される. Top50のプロジェクトのID */
  top50ProjectIdState: HomeProjectState;

  /** プロジェクトの辞書 */
  readonly projectMap: Map<d.ProjectId, d.ResourceState<d.Project>>;

  /** ユーザーの辞書 */
  readonly userMap: Map<d.UserId, d.ResourceState<d.User>>;

  /** 画像のBlobURLの辞書 */
  readonly imageMap: Map<d.ImageToken, d.StaticResourceState<string>>;

  /** 型パーツの辞書 */
  typePartMap: Map<d.TypePartId, d.ResourceState<d.TypePart>>;

  /** プロジェクト作成中かどうか */
  isCreatingProject: boolean;

  /** 型パーツ編集状態 */
  typePartEditState: TypePartEditSate;

  /** プロジェクトに属する型パーツの取得状態 */
  getTypePartInProjectState: GetTypePartInProjectState;

  /** ページの言語 */
  language: d.Language;

  /** クライアントモード. デバッグ時のlocalhostか, リリース時か */
  clientMode: d.ClientMode;

  /** ログイン状態 */
  logInState: d.LogInState;

  /** 場所 */
  location: d.Location;

  /** 出力されたコード */
  outputCode: string | undefined;

  // 初期化処理
  constructor(private messageHandler: (message: Message) => void) {
    const urlDataAndAccountToken = core.urlDataAndAccountTokenFromUrl(
      new URL(window.location.href)
    );

    this.top50ProjectIdState = { _: "None" };

    this.projectMap = new Map();
    this.userMap = new Map();
    this.imageMap = new Map();
    this.typePartMap = new Map();
    this.isCreatingProject = false;
    this.typePartEditState = "None";
    this.getTypePartInProjectState = { _: "None" };
    this.language = urlDataAndAccountToken.urlData.language;
    this.clientMode = urlDataAndAccountToken.urlData.clientMode;
    this.logInState =
      urlDataAndAccountToken.accountToken._ === "Just"
        ? d.LogInState.VerifyingAccountToken(
            urlDataAndAccountToken.accountToken.value
          )
        : d.LogInState.LoadingAccountTokenFromIndexedDB;
    this.location = urlDataAndAccountToken.urlData.location;
    this.outputCode = undefined;

    // ブラウザで戻るボタンを押したときのイベントを登録
    window.addEventListener("popstate", () => {
      const newUrlData: d.UrlData = core.urlDataAndAccountTokenFromUrl(
        new URL(window.location.href)
      ).urlData;
      messageHandler({
        tag: messageJumpTag,
        language: newUrlData.language,
        location: newUrlData.location,
      });
    });

    // ブラウザのURLを正規化 アクセストークンを隠す
    window.history.replaceState(
      undefined,
      "",
      core
        .urlDataAndAccountTokenToUrl(
          {
            clientMode: this.clientMode,
            location: this.location,
            language: this.language,
          },
          d.Maybe.Nothing()
        )
        .toString()
    );
    switch (this.logInState._) {
      case "LoadingAccountTokenFromIndexedDB": {
        indexedDB.getAccountToken().then((accountToken) => {
          if (accountToken === undefined) {
            this.logInState = d.LogInState.Guest;
          } else {
            this.logInState = d.LogInState.VerifyingAccountToken(accountToken);
            this.verifyAccountToken(accountToken);
          }
        });
        return;
      }
      case "VerifyingAccountToken": {
        this.verifyAccountToken(this.logInState.accountToken);
      }
    }
  }

  verifyAccountToken(accountToken: d.AccountToken): void {
    api.getUserByAccountToken(accountToken).then((response) => {
      if (response._ === "Nothing") {
        return;
      }
      const userMaybe = response.value;
      switch (userMaybe._) {
        case "Just": {
          indexedDB.setAccountToken(accountToken);
          this.logInState = d.LogInState.LoggedIn({
            accountToken,
            userId: userMaybe.value.id,
          });
          this.userMap.set(
            userMaybe.value.id,
            d.ResourceState.Loaded({
              getTime: coreUtil.timeFromDate(new Date()),
              data: userMaybe.value.data,
            })
          );
          return;
        }
        case "Nothing":
          this.logInState = d.LogInState.Guest;
      }
    });
  }

  /**
   * アカウントトークンを得る
   */
  get accountToken(): d.AccountToken | undefined {
    switch (this.logInState._) {
      case "LoggedIn":
        return this.logInState.accountTokenAndUserId.accountToken;
    }
  }

  requestAllTop50Project(): void {
    this.top50ProjectIdState = { _: "Loading" };
    api.getTop50Project(undefined).then((response) => {
      if (response._ === "Nothing") {
        return;
      }
      const projectListData = response.value;
      this.top50ProjectIdState = {
        _: "Loaded",
        projectIdList: projectListData.data.map((idAndData) => idAndData.id),
      };

      for (const projectIdAndData of projectListData.data) {
        this.projectMap.set(
          projectIdAndData.id,
          d.ResourceState.Loaded({
            getTime: response.value.getTime,
            data: projectIdAndData.data,
          })
        );
      }
    });
  }

  requestUser(userId: d.UserId): void {
    if (this.userMap.has(userId)) {
      return;
    }
    this.userMap.set(userId, d.ResourceState.Requesting());
    api.getUser(userId).then((response) => {
      this.userMap.set(userId, getResourceResponseToResourceState(response));
    });
  }

  requestProject(projectId: d.ProjectId): void {
    if (this.projectMap.has(projectId)) {
      return;
    }
    this.projectMap.set(projectId, d.ResourceState.Requesting());

    api.getProject(projectId).then((response) => {
      this.projectMap.set(
        projectId,
        getResourceResponseToResourceState(response)
      );
    });
  }

  requestImage(imageToken: d.ImageToken): void {
    if (this.imageMap.has(imageToken)) {
      return;
    }
    this.imageMap.set(imageToken, d.StaticResourceState.Loading());

    api.getImageFile(imageToken).then((response): void => {
      this.imageMap.set(
        imageToken,
        response._ === "Nothing"
          ? d.StaticResourceState.Unknown<string>()
          : d.StaticResourceState.Loaded<string>(
              window.URL.createObjectURL(
                new Blob([response.value], {
                  type: "image/png",
                })
              )
            )
      );
    });
  }

  requestTypePartInProject(projectId: d.ProjectId): void {
    if (this.getTypePartInProjectState._ === "Requesting") {
      return;
    }
    this.getTypePartInProjectState = { _: "Requesting", projectId };

    api.getTypePartByProjectId(projectId).then((response) => {
      if (response._ === "Nothing") {
        return;
      }
      this.getTypePartInProjectState = { _: "None" };
      if (response.value.data._ === "Nothing") {
        return;
      }
      for (const typePartIdAndData of response.value.data.value) {
        this.typePartMap.set(
          typePartIdAndData.id,
          d.ResourceState.Loaded({
            data: typePartIdAndData.data,
            getTime: response.value.getTime,
          })
        );
      }
    });
  }

  async createProject(projectName: string): Promise<d.ProjectId | undefined> {
    if (this.accountToken === undefined || this.isCreatingProject) {
      return;
    }
    this.isCreatingProject = true;
    const response = await api.createProject({
      accountToken: this.accountToken,
      projectName,
    });
    this.isCreatingProject = false;
    if (response._ === "Nothing") {
      return;
    }
    const projectMaybe = response.value;
    switch (projectMaybe._) {
      case "Just": {
        this.projectMap.set(
          projectMaybe.value.id,
          d.ResourceState.Loaded({
            getTime: coreUtil.timeFromDate(new Date()),
            data: projectMaybe.value.data,
          })
        );

        return projectMaybe.value.id;
      }
    }
  }

  saveAndAddTypePart(
    projectId: d.ProjectId,
    typePartList: ReadonlyArray<d.IdAndData<d.TypePartId, d.TypePart>>
  ): void {
    if (this.accountToken === undefined || this.typePartEditState !== "None") {
      return;
    }
    const { accountToken } = this;
    this.typePartEditState = "Saving";
    api
      .setTypePartList({
        accountToken,
        projectId,
        typePartList,
      })
      .then((newTypePartList) => {
        if (newTypePartList._ === "Nothing") {
          this.typePartEditState = "Error";
          return;
        }
        const idAndDataList = newTypePartList.value.data;
        if (idAndDataList._ === "Nothing") {
          this.typePartEditState = "Error";
          return;
        }
        for (const { id, data } of idAndDataList.value) {
          this.typePartMap.set(
            id,
            d.ResourceState.Loaded({
              getTime: newTypePartList.value.getTime,
              data,
            })
          );
        }
        this.typePartEditState = "Adding";
        return api.addTypePart({
          accountToken,
          projectId,
        });
      })
      .then((response) => {
        if (response === undefined || response._ === "Nothing") {
          this.typePartEditState = "Error";
          return;
        }
        const typePartListMaybe = response.value.data;
        switch (typePartListMaybe._) {
          case "Just": {
            this.typePartMap.set(
              typePartListMaybe.value.id,
              d.ResourceState.Loaded({
                data: typePartListMaybe.value.data,
                getTime: response.value.getTime,
              })
            );
            this.typePartEditState = "None";
          }
        }
      });
  }

  setTypePartList(
    projectId: d.ProjectId,
    typePartList: ReadonlyArray<d.IdAndData<d.TypePartId, d.TypePart>>
  ): void {
    if (this.accountToken === undefined || this.typePartEditState !== "None") {
      return;
    }
    this.typePartEditState = "Saving";
    api
      .setTypePartList({
        accountToken: this.accountToken,
        projectId,
        typePartList,
      })
      .then((newTypePartList) => {
        if (newTypePartList._ === "Nothing") {
          this.typePartEditState = "Error";
          return;
        }
        const idAndDataList = newTypePartList.value.data;
        if (idAndDataList._ === "Nothing") {
          this.typePartEditState = "Error";
          return;
        }
        this.typePartEditState = "None";
        for (const { id, data } of idAndDataList.value) {
          this.typePartMap.set(
            id,
            d.ResourceState.Loaded({
              getTime: newTypePartList.value.getTime,
              data,
            })
          );
        }
      });
  }

  logIn(provider: d.OpenIdConnectProvider): void {
    this.logInState = d.LogInState.RequestingLogInUrl(provider);

    api
      .requestLogInUrl({
        openIdConnectProvider: provider,
        urlData: {
          clientMode: this.clientMode,
          language: this.language,
          location: this.location,
        },
      })
      .then((response) => {
        if (response._ === "Nothing") {
          return;
        }
        this.logInState = d.LogInState.JumpingToLogInPage(response.value);
        window.location.href = response.value;
      });
  }

  logOut(): void {
    this.logInState = d.LogInState.Guest;
    indexedDB.deleteAccountToken();
  }

  jump(location: d.Location, language: d.Language): void {
    this.location = location;
    this.language = language;
    window.history.pushState(
      undefined,
      "",
      core
        .urlDataAndAccountTokenToUrl(
          {
            clientMode: this.clientMode,
            location,
            language,
          },
          d.Maybe.Nothing()
        )
        .toString()
    );
  }

  generateCode(definyCode: ReadonlyMap<d.TypePartId, d.TypePart>): void {
    this.outputCode = "生成中...";
    // TODO WebWorker 使いたいね
    try {
      this.outputCode = core.generateTypeScriptCodeAsString(definyCode);
    } catch (error) {
      this.outputCode = "エラー! " + (error as string);
    }
  }

  update(message: Message): void {
    switch (message.tag) {
      case messageJumpTag:
        this.jump(message.location, message.language);
        return;
      case messageRequestLogIn:
        this.logIn(message.provider);
    }
  }
}

const getResourceResponseToResourceState = <resource extends unknown>(
  response: d.Maybe<d.WithTime<d.Maybe<resource>>>
): d.ResourceState<resource> => {
  if (response._ === "Nothing") {
    return d.ResourceState.Unknown(coreUtil.timeFromDate(new Date()));
  }
  if (response.value.data._ === "Just") {
    return d.ResourceState.Loaded({
      getTime: response.value.getTime,
      data: response.value.data.value,
    });
  }
  return d.ResourceState.Deleted(response.value.getTime);
};

export type Message =
  | {
      tag: typeof messageJumpTag;
      location: d.Location;
      language: d.Language;
    }
  | {
      tag: typeof messageRequestLogIn;
      provider: d.OpenIdConnectProvider;
    };

export const messageJumpTag = Symbol("Message-Jump");
export const messageRequestLogIn = Symbol("Message-RequestLogIn");
