import * as api from "./api";
import * as core from "definy-core";
import * as d from "definy-core/source/data";
import * as maquette from "maquette";

export type HomeProjectState =
  | { _: "None" }
  | { _: "Loading" }
  | { _: "Loaded"; projectIdList: ReadonlyArray<d.ProjectId> };

export type CreateProjectState =
  | {
      _: "None";
    }
  | { _: "WaitCreating"; projectName: string }
  | { _: "Creating"; projectName: string }
  | { _: "Created"; projectId: d.ProjectId };

export type CreateIdeaState =
  | { _: "None" }
  | { _: "WaitCreating"; ideaName: string; parentId: d.IdeaId }
  | { _: "Creating"; ideaName: string; parentId: d.ProjectId }
  | { _: "Created"; ideaId: d.IdeaId };

export type AddTypePartState =
  | { _: "None" }
  | { _: "WaitCreating"; projectId: d.ProjectId }
  | { _: "Creating"; projectId: d.ProjectId };

export type RequestTypePartListInProjectState =
  | { _: "None" }
  | { _: "WaitRequesting"; projectId: d.ProjectId }
  | { _: "Requesting"; projectId: d.ProjectId };

export type Init = {
  initUrlData: d.UrlData;
  accountToken: d.Maybe<d.AccountToken>;
};

/**
 * Definyのアプリの状態管理, ブラウザとのやりとり, サーバーとの通信をする
 */
export class Model {
  /** ホームに表示される. Top50のプロジェクトのID */
  homeProjectState: HomeProjectState = { _: "None" };

  /** プロジェクトの辞書 */
  projectMap: Map<d.ProjectId, d.ResourceState<d.Project>> = new Map();

  /** ユーザーの辞書 */
  userMap: Map<d.UserId, d.ResourceState<d.User>> = new Map();

  /** 画像のBlobURLの辞書 */
  imageMap: Map<d.ImageToken, d.StaticResourceState<string>> = new Map();

  /** 型パーツの辞書 */
  typePartMap: Map<d.TypePartId, d.ResourceState<d.TypePart>> = new Map();

  /** ページの場所 */
  location: d.Location;

  /** ページの言語 */
  language: d.Language;

  /** クライアントモード. デバッグ時のlocalhostか, リリース時か */
  clientMode: d.ClientMode;

  /** ログイン状態 */
  logInState: d.LogInState;

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
   */
  constructor(
    param: { initUrlData: d.UrlData; accountToken: d.Maybe<d.AccountToken> },
    public projector: maquette.Projector
  ) {
    this.projector = projector;

    // ブラウザのURLを正規化
    window.history.replaceState(
      undefined,
      "",
      core
        .urlDataAndAccountTokenToUrl(param.initUrlData, d.Maybe.Nothing())
        .toString()
    );
    this.language = param.initUrlData.language;
    this.location = param.initUrlData.location;
    this.clientMode = param.initUrlData.clientMode;

    // ブラウザで戻るボタンを押したときのイベントを登録
    window.addEventListener("popstate", () => {
      const newUrlData: d.UrlData = core.urlDataAndAccountTokenFromUrl(
        new URL(window.location.href)
      ).urlData;
      this.language = param.initUrlData.language;
      this.location = param.initUrlData.location;
      this.clientMode = param.initUrlData.clientMode;
    });

    this.logInState =
      param.accountToken._ === "Just"
        ? d.LogInState.WaitVerifyingAccountToken(param.accountToken.value)
        : d.LogInState.WaitLoadingAccountTokenFromIndexedDB;
  }

  /**
   * ホームのプロジェクト一覧取得
   */
  async requestAllTop50Project(): Promise<void> {
    this.homeProjectState = { _: "Loading" };
    this.projector.scheduleRender();
    const response = await api.getTop50Project();
    this.homeProjectState = {
      _: "Loaded",
      projectIdList: response.map((idAndData) => idAndData.id),
    };
    for (const projectIdAndData of response) {
      this.projectMap.set(
        projectIdAndData.id,
        d.ResourceState.Loaded(projectIdAndData.data)
      );
    }
    this.projector.scheduleRender();
  }

  /**
   * ブラウザのデフォルトの推移をしないで同じ言語のページに変更する
   */
  jumpSameLanguageLink(location: d.Location): void {
    this.location = location;
    window.history.pushState(
      undefined,
      "",
      core
        .urlDataAndAccountTokenToUrl(
          {
            language: this.language,
            location: this.location,
            clientMode: this.clientMode,
          },
          d.Maybe.Nothing()
        )
        .toString()
    );
  }
}
