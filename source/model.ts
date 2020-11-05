import * as api from "./api";
import * as core from "definy-core";
import * as d from "definy-core/source/data";
import * as indexedDB from "./indexedDB";

export type HomeProjectState =
  | { _: "None" }
  | { _: "Loading" }
  | { _: "Loaded"; projectIdList: ReadonlyArray<d.ProjectId> };

export type AddTypePartState =
  | { _: "None" }
  | { _: "Creating"; projectId: d.ProjectId };

export type GetTypePartInProjectState =
  | { _: "None" }
  | { _: "Requesting"; projectId: d.ProjectId };

export type RequestTypePartListInProjectState =
  | { _: "None" }
  | { _: "WaitRequesting"; projectId: d.ProjectId }
  | { _: "Requesting"; projectId: d.ProjectId };

export type Model = {
  /** ホームに表示される. Top50のプロジェクトのID */
  top50ProjectIdState: HomeProjectState;

  /** プロジェクトの辞書 */
  projectMap: ReadonlyMap<d.ProjectId, d.ResourceState<d.Project>>;

  /** ユーザーの辞書 */
  userMap: ReadonlyMap<d.UserId, d.ResourceState<d.User>>;

  /** 画像のBlobURLの辞書 */
  imageMap: ReadonlyMap<d.ImageToken, d.StaticResourceState<string>>;

  /** 型パーツの辞書 */
  typePartMap: ReadonlyMap<d.TypePartId, d.ResourceState<d.TypePart>>;

  /** 型パーツの作成 */
  addTypePartState: AddTypePartState;

  /** プロジェクトに属する型パーツの取得状態 */
  getTypePartInProjectState: GetTypePartInProjectState;

  /** ページの言語 */
  language: d.Language;

  /** クライアントモード. デバッグ時のlocalhostか, リリース時か */
  clientMode: d.ClientMode;

  /** ログイン状態 */
  logInState: d.LogInState;

  /** ホームのプロジェクト一覧取得 */
  requestAllTop50Project: () => void;

  /** ユーザーを取得 */
  requestUser: (userId: d.UserId) => void;

  /** プロジェットを取得 */
  requestProject: (projectId: d.ProjectId) => void;

  /** 画像を取得 */
  requestImage: (imageToken: d.ImageToken) => void;

  /** プロジェットに含まれる型パーツを取得 */
  requestTypePartInProject: (projectId: d.ProjectId) => void;

  /** 型パーツの追加 */
  addTypePart: (projectId: d.ProjectId) => void;

  /** ログインする. ログインのURLを発行してログインページに移行する */
  logIn: (provider: d.OpenIdConnectProvider) => void;

  /** ログアウトする */
  logOut: () => void;
};

/**
 * Definyのアプリの状態管理. 各ページとやりとりをする. ブラウザとのやりとり, サーバーとの通信をする
 */
export class ModelInterface {
  /** ホームに表示される. Top50のプロジェクトのID */
  top50ProjectIdState: HomeProjectState = { _: "None" };

  /** プロジェクトの辞書 */
  projectMap: Map<d.ProjectId, d.ResourceState<d.Project>> = new Map();

  /** ユーザーの辞書 */
  userMap: Map<d.UserId, d.ResourceState<d.User>> = new Map();

  /** 画像のBlobURLの辞書 */
  imageMap: Map<d.ImageToken, d.StaticResourceState<string>> = new Map();

  /** 型パーツの辞書 */
  typePartMap: Map<d.TypePartId, d.ResourceState<d.TypePart>> = new Map();

  /** 型パーツの作成 */
  addTypePartState: AddTypePartState = { _: "None" };

  /** プロジェクトに属する型パーツの取得状態 */
  getTypePartInProjectState: GetTypePartInProjectState = { _: "None" };

  /** ページの言語 */
  language: d.Language;

  /** クライアントモード. デバッグ時のlocalhostか, リリース時か */
  clientMode: d.ClientMode;

  /** ログイン状態 */
  logInState: d.LogInState;

  onJump: (urlData: d.UrlData) => void;

  isDebug: boolean;

  /**
   * 場所から, 同じクライアントモード, 同じ言語のURLを得る
   * (Modelの状態を変更しない)
   */
  sameLanguageLink(location: d.Location): URL {
    return core.urlDataAndAccountTokenToUrl(
      { language: this.language, location, clientMode: this.clientMode },
      d.Maybe.Nothing()
    );
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

  /**
   * 初期化
   * @param param パラメーター
   * @param projector Maquette の Projector. データが変わったときに, レンダリングをさせるために必要
   * @param onJump URLを変更するときにどうするか
   */
  constructor(
    param: {
      language: d.Language;
      clientMode: d.ClientMode;
      accountToken: d.Maybe<d.AccountToken>;
    },
    projector: maquette.Projector,
    onJump: (urlData: d.UrlData) => void,
    isDebug: boolean
  ) {
    this.clientMode = param.clientMode;
    this.language = param.language;
    this.projector = projector;
    this.onJump = onJump;
    this.isDebug = isDebug;

    this.logInState =
      param.accountToken._ === "Just"
        ? d.LogInState.WaitVerifyingAccountToken(param.accountToken.value)
        : d.LogInState.WaitLoadingAccountTokenFromIndexedDB;
  }

  /**
   * ホームのプロジェクト一覧取得
   */
  requestAllTop50Project(): void {
    if (this.isDebug) {
      return;
    }
    this.top50ProjectIdState = { _: "Loading" };
    api.getTop50Project().then((response) => {
      this.top50ProjectIdState = {
        _: "Loaded",
        projectIdList: response.map((idAndData) => idAndData.id),
      };
      for (const projectIdAndData of response) {
        this.projectMap.set(
          projectIdAndData.id,
          d.ResourceState.Loaded(projectIdAndData.data)
        );
        if (projectIdAndData.data.dataMaybe._ === "Just") {
          this.requestImage(projectIdAndData.data.dataMaybe.value.imageHash);
          this.requestUser(projectIdAndData.data.dataMaybe.value.createUserId);
        }
      }
      this.projector.scheduleRender();
    });
    this.projector.scheduleRender();
  }

  requestUser(userId: d.UserId): void {
    if (this.isDebug) {
      return;
    }
    if (this.userMap.has(userId)) {
      return;
    }
    this.userMap.set(userId, d.ResourceState.Loading());
    api.getUser(userId).then((userResource) => {
      this.userMap.set(userId, d.ResourceState.Loaded(userResource));
      this.projector.scheduleRender();
      if (userResource.dataMaybe._ === "Just") {
        this.requestImage(userResource.dataMaybe.value.imageHash);
      }
    });
    this.projector.scheduleRender();
  }

  requestProject(projectId: d.ProjectId): void {
    if (this.isDebug) {
      return;
    }
    if (this.projectMap.has(projectId)) {
      return;
    }
    this.projectMap.set(projectId, d.ResourceState.Loading());
    api.getProject(projectId).then((response) => {
      this.projectMap.set(projectId, d.ResourceState.Loaded(response));
      this.projector.scheduleRender();
      if (response.dataMaybe._ === "Just") {
        this.requestImage(response.dataMaybe.value.imageHash);
        this.requestImage(response.dataMaybe.value.iconHash);
      }
    });
  }

  requestImage(imageToken: d.ImageToken): void {
    if (this.isDebug) {
      return;
    }
    if (this.imageMap.has(imageToken)) {
      return;
    }
    this.imageMap.set(imageToken, d.StaticResourceState.Loading());
    api.getImageFile(imageToken).then((binary): void => {
      this.imageMap.set(
        imageToken,
        binary._ === "Nothing"
          ? d.StaticResourceState.Unknown<string>()
          : d.StaticResourceState.Loaded<string>(
              window.URL.createObjectURL(
                new Blob([binary.value], {
                  type: "image/png",
                })
              )
            )
      );
      this.projector.scheduleRender();
    });
    this.projector.scheduleRender();
  }

  requestTypePartInProject(projectId: d.ProjectId): void {
    if (this.isDebug) {
      return;
    }
    if (this.getTypePartInProjectState._ === "Requesting") {
      return;
    }
    this.getTypePartInProjectState = { _: "Requesting", projectId };
    api.getTypePartByProjectId(projectId).then((response) => {
      if (response.dataMaybe._ === "Just") {
        for (const typePartIdAndData of response.dataMaybe.value) {
          this.typePartMap.set(
            typePartIdAndData.id,
            d.ResourceState.Loaded({
              dataMaybe: d.Maybe.Just(typePartIdAndData.data),
              getTime: response.getTime,
            })
          );
        }
      }
      this.addTypePartState = { _: "None" };
    });
    this.projector.scheduleRender();
  }

  async createProject(projectName: string): Promise<d.ProjectId | undefined> {
    if (this.isDebug) {
      return;
    }
    const { accountToken } = this;
    if (accountToken === undefined) {
      return;
    }
    const response = await api.createProject({
      accountToken,
      projectName,
    });
    switch (response._) {
      case "Just":
        this.projectMap.set(
          response.value.id,
          d.ResourceState.Loaded(response.value.data)
        );
        return response.value.id;
      case "Nothing":
    }
  }

  addTypePart(projectId: d.ProjectId): void {
    if (this.isDebug) {
      return;
    }
    const { accountToken } = this;
    if (accountToken === undefined || this.addTypePartState._ === "Creating") {
      return;
    }
    this.addTypePartState = { _: "Creating", projectId };
    api
      .addTypePart({
        accountToken,
        projectId,
      })
      .then((response) => {
        this.addTypePartState = { _: "None" };
        switch (response.dataMaybe._) {
          case "Just":
            for (const typePartIdAndData of response.dataMaybe.value) {
              this.typePartMap.set(
                typePartIdAndData.id,
                d.ResourceState.Loaded({
                  dataMaybe: d.Maybe.Just(typePartIdAndData.data),
                  getTime: response.getTime,
                })
              );
            }
            this.projector.scheduleRender();
        }
      });
    this.projector.scheduleRender();
  }

  logIn(provider: d.OpenIdConnectProvider): void {
    if (this.isDebug) {
      return;
    }
    this.logInState = d.LogInState.WaitRequestingLogInUrl(provider);
  }

  logOut(): void {
    if (this.isDebug) {
      return;
    }
    this.logInState = d.LogInState.Guest;
    indexedDB.deleteAccountToken();
  }

  /**
   * ブラウザのデフォルトの推移をしないで同じ言語のページに変更する
   */
  jumpSameLanguageLink(location: d.Location): void {
    if (this.isDebug) {
      return;
    }
    this.onJump({
      language: this.language,
      clientMode: this.clientMode,
      location,
    });
  }
}
