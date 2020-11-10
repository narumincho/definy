import * as api from "./api";
import * as core from "definy-core";
import * as d from "definy-core/source/data";
import * as indexedDB from "./indexedDB";
import {
  AddTypePartState,
  GetTypePartInProjectState,
  HomeProjectState,
  Model,
} from "./model";
import { Component, ReactElement, createElement as h } from "react";
import { App } from "./app";

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

  /** 場所 */
  location: d.Location;
};

export class AppWithState extends Component<Record<never, never>, State> {
  // 初期化処理
  constructor(props: Record<never, never>) {
    super(props);

    const urlDataAndAccountToken = core.urlDataAndAccountTokenFromUrl(
      new URL(window.location.href)
    );
    console.log(urlDataAndAccountToken, window.location.href);

    // ブラウザのURLを正規化
    window.history.replaceState(
      undefined,
      "",
      core
        .urlDataAndAccountTokenToUrl(
          urlDataAndAccountToken.urlData,
          d.Maybe.Nothing()
        )
        .toString()
    );

    this.state = {
      top50ProjectIdState: { _: "None" },
      projectMap: new Map(),
      userMap: new Map(),
      imageMap: new Map(),
      typePartMap: new Map(),
      isCreatingProject: false,
      addTypePartState: { _: "None" },
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
    console.log("logInState", this.state.logInState);
    switch (this.state.logInState._) {
      case "LoadingAccountTokenFromIndexedDB": {
        indexedDB.getAccountToken().then((accountToken) => {
          if (accountToken === undefined) {
            this.setState({ logInState: d.LogInState.Guest });
          } else {
            this.setState({
              logInState: d.LogInState.WaitVerifyingAccountToken(accountToken),
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
    api.getUserByAccountToken(accountToken).then((userResourceAndIdMaybe) => {
      switch (userResourceAndIdMaybe._) {
        case "Just":
          indexedDB.setAccountToken(accountToken);
          this.setState((state) => ({
            logInState: d.LogInState.LoggedIn({
              accountToken,
              userId: userResourceAndIdMaybe.value.id,
            }),
            userMap: new Map(state.userMap).set(
              userResourceAndIdMaybe.value.id,
              d.ResourceState.Loaded(userResourceAndIdMaybe.value.data)
            ),
          }));
          return;
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
    api.getTop50Project().then((response) => {
      this.setState((state) => {
        const newTop50ProjectIdState: HomeProjectState = {
          _: "Loaded",
          projectIdList: response.map((idAndData) => idAndData.id),
        };
        const newProjectMap = new Map(state.projectMap);
        for (const projectIdAndData of response) {
          newProjectMap.set(
            projectIdAndData.id,
            d.ResourceState.Loaded(projectIdAndData.data)
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
      userMap: new Map(state.userMap).set(userId, d.ResourceState.Loading()),
    }));
    api.getUser(userId).then((userResource) => {
      this.setState((state) => ({
        userMap: new Map([
          ...state.userMap,
          [userId, d.ResourceState.Loaded(userResource)],
        ]),
      }));
    });
  }

  requestProject(projectId: d.ProjectId): void {
    if (this.state.projectMap.has(projectId)) {
      return;
    }
    this.setState((state) => ({
      projectMap: new Map([
        ...state.projectMap,
        [projectId, d.ResourceState.Loading()],
      ]),
    }));
    api.getProject(projectId).then((response) => {
      this.setState((state) => ({
        projectMap: new Map([
          ...state.projectMap,
          [projectId, d.ResourceState.Loaded(response)],
        ]),
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
    api.getImageFile(imageToken).then((binary): void => {
      this.setState((state) => ({
        imageMap: new Map([
          ...state.imageMap,
          [
            imageToken,
            binary._ === "Nothing"
              ? d.StaticResourceState.Unknown<string>()
              : d.StaticResourceState.Loaded<string>(
                  window.URL.createObjectURL(
                    new Blob([binary.value], {
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
      this.setState((state) => {
        if (response.dataMaybe._ === "Nothing") {
          return {
            typePartMap: state.typePartMap,
            addTypePartState: { _: "None" },
          };
        }
        const newTypePartMap = new Map(state.typePartMap);
        for (const typePartIdAndData of response.dataMaybe.value) {
          newTypePartMap.set(
            typePartIdAndData.id,
            d.ResourceState.Loaded({
              dataMaybe: d.Maybe.Just(typePartIdAndData.data),
              getTime: response.getTime,
            })
          );
        }
        return {
          typePartMap: newTypePartMap,
          addTypePartState: { _: "None" },
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
    switch (response._) {
      case "Just": {
        this.setState((state) => ({
          projectMap: new Map(state.projectMap).set(
            response.value.id,
            d.ResourceState.Loaded(response.value.data)
          ),
          isCreatingProject: false,
        }));
        return response.value.id;
      }
      case "Nothing":
        this.setState({ isCreatingProject: false });
    }
  }

  addTypePart(projectId: d.ProjectId): void {
    if (
      this.accountToken === undefined ||
      this.state.addTypePartState._ === "Creating"
    ) {
      return;
    }
    this.setState({ addTypePartState: { _: "Creating", projectId } });
    api
      .addTypePart({
        accountToken: this.accountToken,
        projectId,
      })
      .then((response) => {
        this.setState({ addTypePartState: { _: "None" } });
        switch (response.dataMaybe._) {
          case "Just": {
            const data = response.dataMaybe.value;
            this.setState((state) => {
              const newTypePartMap = new Map(state.typePartMap);
              for (const typePartIdAndData of data) {
                newTypePartMap.set(
                  typePartIdAndData.id,
                  d.ResourceState.Loaded({
                    dataMaybe: d.Maybe.Just(typePartIdAndData.data),
                    getTime: response.getTime,
                  })
                );
              }
              return {
                typePartMap: newTypePartMap,
              };
            });
          }
        }
      });
  }

  logIn(provider: d.OpenIdConnectProvider): void {
    this.setState({
      logInState: d.LogInState.WaitRequestingLogInUrl(provider),
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
      .then((logInUrl) => {
        this.setState({
          logInState: d.LogInState.JumpingToLogInPage(logInUrl),
        });
        window.location.href = logInUrl;
      });
  }

  logOut(): void {
    this.setState({ logInState: d.LogInState.Guest });
    indexedDB.deleteAccountToken();
  }

  jump(location: d.Location, language: d.Language): void {
    this.setState({ location, language });
  }

  render(): ReactElement {
    const model: Model = {
      top50ProjectIdState: this.state.top50ProjectIdState,
      projectMap: this.state.projectMap,
      userMap: this.state.userMap,
      imageMap: this.state.imageMap,
      typePartMap: this.state.typePartMap,
      addTypePartState: this.state.addTypePartState,
      getTypePartInProjectState: this.state.getTypePartInProjectState,
      language: this.state.language,
      clientMode: this.state.clientMode,
      logInState: this.state.logInState,
      location: this.state.location,
      requestAllTop50Project: () => this.requestAllTop50Project(),
      requestUser: (userId) => this.requestUser(userId),
      requestProject: (projectId) => this.requestProject(projectId),
      requestImage: (imageToken) => this.requestImage(imageToken),
      requestTypePartInProject: (projectId) =>
        this.requestTypePartInProject(projectId),
      addTypePart: (projectId) => this.addTypePart(projectId),
      logIn: (provider) => this.logIn(provider),
      logOut: () => this.logOut(),
      jump: (location: d.Location, language: d.Language) =>
        this.jump(location, language),
    };
    return h(App, {
      model,
    });
  }
}

const verifyingAccountToken = (
  accountToken: d.AccountToken,
  setState: <K extends keyof State>(
    state:
      | ((prevState: Readonly<State>) => Pick<State, K> | State | null)
      | (Pick<State, K> | State | null),
    callback?: () => void
  ) => void
) => {
  api.getUserByAccountToken(accountToken).then((userResourceAndIdMaybe) => {
    switch (userResourceAndIdMaybe._) {
      case "Just":
        indexedDB.setAccountToken(accountToken);
        setState((state) => ({
          logInState: d.LogInState.LoggedIn({
            accountToken,
            userId: userResourceAndIdMaybe.value.id,
          }),
          userMap: new Map(state.userMap).set(
            userResourceAndIdMaybe.value.id,
            d.ResourceState.Loaded(userResourceAndIdMaybe.value.data)
          ),
        }));
        return;
      case "Nothing":
        setState({ logInState: d.LogInState.Guest });
    }
  });
};
