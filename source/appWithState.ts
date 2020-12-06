import * as core from "definy-core";
import * as coreUtil from "definy-core/source/util";
import * as d from "definy-core/source/data";
import * as indexedDB from "./indexedDB";
import { Component, ReactElement, createElement } from "react";
import {
  GetTypePartInProjectState,
  HomeProjectState,
  Model,
  TypePartEditSate,
} from "./model";
import { App } from "./app";
import { api } from "./api";

export type State = {
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
};

export class AppWithState extends Component<Record<never, never>, State> {
  // 初期化処理
  constructor(props: Record<never, never>) {
    super(props);

    const urlDataAndAccountToken = core.urlDataAndAccountTokenFromUrl(
      new URL(window.location.href)
    );

    this.state = {
      top50ProjectIdState: { _: "None" },
      projectMap: new Map(),
      userMap: new Map(),
      imageMap: new Map(),
      typePartMap: new Map(),
      isCreatingProject: false,
      typePartEditState: "None",
      getTypePartInProjectState: { _: "None" },
      language: urlDataAndAccountToken.urlData.language,
      clientMode: urlDataAndAccountToken.urlData.clientMode,
      logInState:
        urlDataAndAccountToken.accountToken._ === "Just"
          ? d.LogInState.VerifyingAccountToken(
              urlDataAndAccountToken.accountToken.value
            )
          : d.LogInState.LoadingAccountTokenFromIndexedDB,
      location: urlDataAndAccountToken.urlData.location,
      outputCode: undefined,
    };

    // ブラウザで戻るボタンを押したときのイベントを登録
    window.addEventListener("popstate", () => {
      const newUrlData: d.UrlData = core.urlDataAndAccountTokenFromUrl(
        new URL(window.location.href)
      ).urlData;
      this.setState({
        language: newUrlData.language,
        clientMode: newUrlData.clientMode,
        location: newUrlData.location,
      });
    });
  }

  componentDidMount(): void {
    // ブラウザのURLを正規化 アクセストークンを隠す
    window.history.replaceState(
      undefined,
      "",
      core
        .urlDataAndAccountTokenToUrl(
          {
            clientMode: this.state.clientMode,
            location: this.state.location,
            language: this.state.language,
          },
          d.Maybe.Nothing()
        )
        .toString()
    );
    switch (this.state.logInState._) {
      case "LoadingAccountTokenFromIndexedDB": {
        indexedDB.getAccountToken().then((accountToken) => {
          if (accountToken === undefined) {
            this.setState({ logInState: d.LogInState.Guest });
          } else {
            this.setState({
              logInState: d.LogInState.VerifyingAccountToken(accountToken),
            });
            this.verifyAccountToken(accountToken);
          }
        });
        return;
      }
      case "VerifyingAccountToken": {
        this.verifyAccountToken(this.state.logInState.accountToken);
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
          this.setState((state) => ({
            logInState: d.LogInState.LoggedIn({
              accountToken,
              userId: userMaybe.value.id,
            }),
            userMap: new Map(state.userMap).set(
              userMaybe.value.id,
              d.ResourceState.Loaded({
                getTime: coreUtil.timeFromDate(new Date()),
                data: userMaybe.value.data,
              })
            ),
          }));
          return;
        }
        case "Nothing":
          this.setState({ logInState: d.LogInState.Guest });
      }
    });
  }

  /**
   * アカウントトークンを得る
   */
  get accountToken(): d.AccountToken | undefined {
    switch (this.state.logInState._) {
      case "LoggedIn":
        return this.state.logInState.accountTokenAndUserId.accountToken;
    }
  }

  requestAllTop50Project(): void {
    this.setState({ top50ProjectIdState: { _: "Loading" } });
    api.getTop50Project(undefined).then((response) => {
      if (response._ === "Nothing") {
        return;
      }
      const projectListData = response.value;
      this.setState((state) => {
        const newTop50ProjectIdState: HomeProjectState = {
          _: "Loaded",
          projectIdList: projectListData.data.map((idAndData) => idAndData.id),
        };
        const newProjectMap = new Map(state.projectMap);
        for (const projectIdAndData of projectListData.data) {
          newProjectMap.set(
            projectIdAndData.id,
            d.ResourceState.Loaded({
              getTime: response.value.getTime,
              data: projectIdAndData.data,
            })
          );
        }
        return {
          top50ProjectIdState: newTop50ProjectIdState,
          projectMap: newProjectMap,
        };
      });
    });
  }

  requestUser(userId: d.UserId): void {
    if (this.state.userMap.has(userId)) {
      return;
    }
    this.setState((state) => ({
      userMap: new Map(state.userMap).set(userId, d.ResourceState.Requesting()),
    }));
    api.getUser(userId).then((response) => {
      this.setState((state) => ({
        userMap: new Map(state.userMap).set(
          userId,
          getResourceResponseToResourceState(response)
        ),
      }));
    });
  }

  requestProject(projectId: d.ProjectId): void {
    if (this.state.projectMap.has(projectId)) {
      return;
    }
    this.setState((state) => ({
      projectMap: new Map(state.projectMap).set(
        projectId,
        d.ResourceState.Requesting()
      ),
    }));
    api.getProject(projectId).then((response) => {
      this.setState((state) => ({
        projectMap: new Map(state.projectMap).set(
          projectId,
          getResourceResponseToResourceState(response)
        ),
      }));
    });
  }

  requestImage(imageToken: d.ImageToken): void {
    if (this.state.imageMap.has(imageToken)) {
      return;
    }
    this.setState((state) => ({
      imageMap: new Map([
        ...state.imageMap,
        [imageToken, d.StaticResourceState.Loading()],
      ]),
    }));
    api.getImageFile(imageToken).then((response): void => {
      this.setState((state) => ({
        imageMap: new Map([
          ...state.imageMap,
          [
            imageToken,
            response._ === "Nothing"
              ? d.StaticResourceState.Unknown<string>()
              : d.StaticResourceState.Loaded<string>(
                  window.URL.createObjectURL(
                    new Blob([response.value], {
                      type: "image/png",
                    })
                  )
                ),
          ],
        ]),
      }));
    });
  }

  requestTypePartInProject(projectId: d.ProjectId): void {
    if (this.state.getTypePartInProjectState._ === "Requesting") {
      return;
    }
    this.setState({
      getTypePartInProjectState: { _: "Requesting", projectId },
    });
    api.getTypePartByProjectId(projectId).then((response) => {
      if (response._ === "Nothing") {
        return;
      }
      this.setState((state) => {
        if (response.value.data._ === "Nothing") {
          return {
            typePartMap: state.typePartMap,
            getTypePartInProjectState: { _: "None" },
          };
        }
        const newTypePartMap = new Map(state.typePartMap);
        for (const typePartIdAndData of response.value.data.value) {
          newTypePartMap.set(
            typePartIdAndData.id,
            d.ResourceState.Loaded({
              data: typePartIdAndData.data,
              getTime: response.value.getTime,
            })
          );
        }
        return {
          typePartMap: newTypePartMap,
          getTypePartInProjectState: { _: "None" },
        };
      });
    });
  }

  async createProject(projectName: string): Promise<d.ProjectId | undefined> {
    if (this.accountToken === undefined || this.state.isCreatingProject) {
      return;
    }
    this.setState({ isCreatingProject: true });
    const response = await api.createProject({
      accountToken: this.accountToken,
      projectName,
    });
    if (response._ === "Nothing") {
      this.setState({ isCreatingProject: false });
      return;
    }
    const projectMaybe = response.value;
    switch (projectMaybe._) {
      case "Just": {
        this.setState((state) => ({
          projectMap: new Map(state.projectMap).set(
            projectMaybe.value.id,
            d.ResourceState.Loaded({
              getTime: coreUtil.timeFromDate(new Date()),
              data: projectMaybe.value.data,
            })
          ),
          isCreatingProject: false,
        }));
        return projectMaybe.value.id;
      }
      case "Nothing":
        this.setState({ isCreatingProject: false });
    }
  }

  saveAndAddTypePart(
    projectId: d.ProjectId,
    typePartList: ReadonlyArray<d.IdAndData<d.TypePartId, d.TypePart>>
  ): void {
    if (
      this.accountToken === undefined ||
      this.state.typePartEditState !== "None"
    ) {
      return;
    }
    const { accountToken } = this;
    this.setState({ typePartEditState: "Saving" });
    api
      .setTypePartList({
        accountToken,
        projectId,
        typePartList,
      })
      .then((newTypePartList) => {
        if (newTypePartList._ === "Nothing") {
          this.setState({ typePartEditState: "Error" });
          return;
        }
        const idAndDataList = newTypePartList.value.data;
        if (idAndDataList._ === "Nothing") {
          this.setState({ typePartEditState: "Error" });
          return;
        }
        this.setState({
          typePartMap: new Map([
            ...this.state.typePartMap,
            ...idAndDataList.value.map(
              ({ id, data }) =>
                [
                  id,
                  d.ResourceState.Loaded({
                    getTime: newTypePartList.value.getTime,
                    data,
                  }),
                ] as const
            ),
          ]),
          typePartEditState: "Adding",
        });
        return api.addTypePart({
          accountToken,
          projectId,
        });
      })
      .then((response) => {
        if (response === undefined) {
          this.setState({ typePartEditState: "Error" });
          return;
        }
        this.setState({ typePartEditState: "None" });
        if (response._ === "Nothing") {
          this.setState({ typePartEditState: "Error" });
          return;
        }
        const typePartListMaybe = response.value.data;
        switch (typePartListMaybe._) {
          case "Just": {
            this.setState((state) => {
              const newTypePartMap = new Map(state.typePartMap);
              newTypePartMap.set(
                typePartListMaybe.value.id,
                d.ResourceState.Loaded({
                  data: typePartListMaybe.value.data,
                  getTime: response.value.getTime,
                })
              );
              return {
                typePartMap: newTypePartMap,
                typePartEditState: "None",
              };
            });
          }
        }
      });
  }

  setTypePartList(
    projectId: d.ProjectId,
    typePartList: ReadonlyArray<d.IdAndData<d.TypePartId, d.TypePart>>
  ): void {
    if (
      this.accountToken === undefined ||
      this.state.typePartEditState !== "None"
    ) {
      return;
    }
    this.setState({ typePartEditState: "Saving" });
    api
      .setTypePartList({
        accountToken: this.accountToken,
        projectId,
        typePartList,
      })
      .then((newTypePartList) => {
        if (newTypePartList._ === "Nothing") {
          this.setState({ typePartEditState: "Error" });
          return;
        }
        const idAndDataList = newTypePartList.value.data;
        if (idAndDataList._ === "Nothing") {
          this.setState({ typePartEditState: "Error" });
          return;
        }
        this.setState((oldState) => ({
          typePartMap: new Map([
            ...oldState.typePartMap,
            ...idAndDataList.value.map(
              ({ id, data }) =>
                [
                  id,
                  d.ResourceState.Loaded({
                    getTime: newTypePartList.value.getTime,
                    data,
                  }),
                ] as const
            ),
          ]),
          typePartEditState: "None",
        }));
      });
  }

  logIn(provider: d.OpenIdConnectProvider): void {
    this.setState({
      logInState: d.LogInState.RequestingLogInUrl(provider),
    });
    api
      .requestLogInUrl({
        openIdConnectProvider: provider,
        urlData: {
          clientMode: this.state.clientMode,
          language: this.state.language,
          location: this.state.location,
        },
      })
      .then((response) => {
        if (response._ === "Nothing") {
          return;
        }
        this.setState({
          logInState: d.LogInState.JumpingToLogInPage(response.value),
        });
        window.location.href = response.value;
      });
  }

  logOut(): void {
    this.setState({ logInState: d.LogInState.Guest });
    indexedDB.deleteAccountToken();
  }

  jump(location: d.Location, language: d.Language): void {
    this.setState({ location, language });
    window.history.pushState(
      undefined,
      "",
      core
        .urlDataAndAccountTokenToUrl(
          {
            clientMode: this.state.clientMode,
            location,
            language,
          },
          d.Maybe.Nothing()
        )
        .toString()
    );
  }

  generateCode(definyCode: ReadonlyMap<d.TypePartId, d.TypePart>): void {
    this.setState({ outputCode: "生成中..." });
    try {
      this.setState({
        outputCode: core.generateTypeScriptCodeAsString(definyCode),
      });
    } catch (error) {
      this.setState({
        outputCode: "エラー! " + (error as string),
      });
    }
  }

  render(): ReactElement {
    const model: Model = {
      top50ProjectIdState: this.state.top50ProjectIdState,
      projectMap: this.state.projectMap,
      userMap: this.state.userMap,
      imageMap: this.state.imageMap,
      typePartMap: this.state.typePartMap,
      typePartEditState: this.state.typePartEditState,
      getTypePartInProjectState: this.state.getTypePartInProjectState,
      language: this.state.language,
      clientMode: this.state.clientMode,
      logInState: this.state.logInState,
      location: this.state.location,
      outputCode: this.state.outputCode,
      requestAllTop50Project: () => this.requestAllTop50Project(),
      requestUser: (userId) => this.requestUser(userId),
      requestProject: (projectId) => this.requestProject(projectId),
      requestImage: (imageToken) => this.requestImage(imageToken),
      requestTypePartInProject: (projectId) =>
        this.requestTypePartInProject(projectId),
      addTypePart: (projectId, typePartList) =>
        this.saveAndAddTypePart(projectId, typePartList),
      setTypePartList: (projectId, typePartList) =>
        this.setTypePartList(projectId, typePartList),
      logIn: (provider) => this.logIn(provider),
      logOut: () => this.logOut(),
      jump: (location: d.Location, language: d.Language) =>
        this.jump(location, language),
      generateCode: (code) => this.generateCode(code),
    };
    return createElement(App, {
      model,
    });
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
