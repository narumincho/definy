import * as d from "../../data";
import * as indexedDB from "../indexedDB";
import {
  OptionsObject,
  SnackbarKey,
  SnackbarMessage,
  useSnackbar,
} from "notistack";
import {
  urlDataAndAccountTokenFromUrl,
  urlDataAndAccountTokenToUrl,
} from "../../common/url";
import { useEffect, useState } from "react";
import { api } from "../api";
import { useResourceState } from "./resourceState";

export type TopProjectsLoadingState =
  | { _: "none" }
  | { _: "loading" }
  | { _: "loaded"; projectIdList: ReadonlyArray<d.ProjectId> };

export type CreateProjectState =
  | {
      _: "creating";
      name: string;
    }
  | {
      _: "none";
    };

export type Resource<id extends string, resource> = {
  /**
   * メモリから, リリースのリクエスト状態とデータを取得する
   *
   * *no-side-effect*
   */
  getFromMemoryCache: (id_: id) => d.ResourceState<resource> | undefined;
  /**
   * データがキャッシュにない場合, サーバーにリクエストする
   *
   * *side-effect*
   */
  requestToServerIfEmpty: (id_: id) => void;
  /**
   * 強制的にサーバーにリクエストする
   *
   * *side-effect*
   */
  forciblyRequestToServer: (id_: id) => void;
};

export type UseDefinyAppResult = {
  /**
   * おすすめのプロジェクト取得状態
   * *no-side-effect*
   */
  readonly topProjectsLoadingState: TopProjectsLoadingState;
  /**
   * プロジェクトをキャッシュから取得, サーバーへのリクエストができる
   */
  readonly projectResource: Resource<d.ProjectId, d.Project>;
  /**
   * アカウントをキャッシュから取得, サーバーへのリクエストができる
   */
  readonly accountResource: Resource<d.AccountId, d.Account>;
  /**
   * 現在のページの場所
   *
   * *no-side-effect*
   */
  readonly location: d.Location;
  /**
   * 画面表示に使用する言語
   *
   * *no-side-effect*
   */
  readonly language: d.Language;
  /**
   * ログイン状態
   *
   * *no-side-effect*
   */
  readonly logInState: d.LogInState;
  /**
   * プロジェクトの作成状態
   *
   * *no-side-effect*
   */
  readonly createProjectState: CreateProjectState;
  /**
   * ページを移動する
   *
   * *side-effect*
   */
  readonly jump: (urlData: d.UrlData) => void;
  /**
   * ログインする
   *
   * *side-effect*
   */
  readonly logIn: () => void;
  /**
   * ログアウトする
   *
   * *side-effect*
   */
  readonly logOut: () => void;
  /**
   * プロジェクトを作成する
   * @param projectName プロジェクト名
   *
   * *side-effect*
   */
  readonly createProject: (projectName: string) => void;

  /**
   * おすすめのプロジェクトを取得する
   *
   * *side-effect*
   */
  readonly requestTop50Project: () => void;
};

/**
 * Definy の アプリの動作をする Hook.
 *
 * 想定する環境は ブラウザで, notistack の context を使用する. node.js 内ではたぶん動かない
 */
export const useDefinyApp = (): UseDefinyAppResult => {
  const [
    topProjectsLoadingState,
    setTopProjectsLoadingState,
  ] = useState<TopProjectsLoadingState>({ _: "none" });
  const [urlData, setUrlData] = useState<d.UrlData>({
    language: "English",
    location: d.Location.Home,
  });
  const [logInState, setLogInState] = useState<d.LogInState>(
    d.LogInState.Guest
  );
  const [
    createProjectState,
    setCreateProjectState,
  ] = useState<CreateProjectState>({ _: "none" });
  const { enqueueSnackbar } = useSnackbar();
  const projectDict = useResourceState<d.ProjectId, d.Project>();
  const accountDict = useResourceState<d.AccountId, d.Account>();

  /**
   * ページを移動する
   */
  const jump = (newUrlData: d.UrlData): void => {
    window.history.pushState(
      undefined,
      "",
      urlDataAndAccountTokenToUrl(newUrlData, d.Maybe.Nothing()).toString()
    );
    setUrlData(newUrlData);
  };

  const logIn = () => {
    setLogInState({ _: "RequestingLogInUrl", openIdConnectProvider: "Google" });
    api
      .requestLogInUrl({ urlData, openIdConnectProvider: "Google" })
      .then((response) => {
        if (response._ === "Nothing") {
          enqueueSnackbar("ログインURL取得に失敗しました", {
            variant: "error",
          });
          return;
        }
        setLogInState(d.LogInState.JumpingToLogInPage);
        requestAnimationFrame(() => {
          window.location.href = response.value;
        });
      });
  };

  const logOut = () => {
    indexedDB.deleteAccountToken();
    setLogInState(d.LogInState.Guest);
    jump({
      language: urlData.language,
      location: d.Location.Home,
    });
    enqueueSnackbar("ログアウトしました", { variant: "success" });
  };

  const getAccountToken = (): d.AccountToken | undefined => {
    switch (logInState._) {
      case "LoggedIn":
        return logInState.accountTokenAndUserId.accountToken;
      case "VerifyingAccountToken":
        return logInState.accountToken;
    }
  };

  const createProject = (projectName: string): void => {
    const accountToken = getAccountToken();
    if (accountToken === undefined) {
      enqueueSnackbar(
        "ログインしていない状態でプロジェクトを作ることはできない",
        {
          variant: "error",
        }
      );
      return;
    }
    if (createProjectState._ === "creating") {
      enqueueSnackbar(
        "プロジェクト作成中にさらにプロジェクトを作成することはできない",
        {
          variant: "error",
        }
      );
      return;
    }
    setCreateProjectState({ _: "creating", name: projectName });
    api
      .createProject({
        accountToken,
        projectName,
      })
      .then((response) => {
        setCreateProjectState({ _: "none" });
        if (response._ === "Nothing" || response.value._ === "Nothing") {
          enqueueSnackbar("プロジェクト作成に失敗しました");
          return;
        }
        enqueueSnackbar(
          `プロジェクト「${response.value.value.data.name}」を作成しました`,
          { variant: "success" }
        );
        jump({
          language: urlData.language,
          location: d.Location.Project(response.value.value.id),
        });
      });
  };

  const requestTop50Project = (): void => {
    setTopProjectsLoadingState({ _: "loading" });
    api.getTop50Project(undefined).then((response) => {
      if (response._ === "Nothing") {
        enqueueSnackbar("プロジェクト一覧取得に失敗しました", {
          variant: "error",
        });
        return;
      }
      setTopProjectsLoadingState({
        _: "loaded",
        projectIdList: response.value.data.map((project) => project.id),
      });
      projectDict.setLoadedList(response.value.data, response.value.getTime);
    });
  };

  useEffect(() => {
    document.title =
      "Definy 手軽に堅牢なゲームとツールが作れて公開できる が目標のWebアプリ";

    // ブラウザで戻るボタンを押したときのイベントを登録
    window.addEventListener("popstate", () => {
      const newUrlData: d.UrlData = urlDataAndAccountTokenFromUrl(
        new URL(window.location.href)
      ).urlData;
      setUrlData({
        language: newUrlData.language,
        location: newUrlData.location,
      });
    });

    const urlDataAndAccountToken = urlDataAndAccountTokenFromUrl(
      new URL(location.href)
    );
    // ブラウザのURLを正規化 アクセストークンを隠す
    window.history.replaceState(
      undefined,
      "",

      urlDataAndAccountTokenToUrl(
        urlDataAndAccountToken.urlData,
        d.Maybe.Nothing()
      ).toString()
    );
    setUrlData(urlDataAndAccountToken.urlData);
    if (urlDataAndAccountToken.accountToken._ === "Just") {
      const accountToken = urlDataAndAccountToken.accountToken.value;
      verifyingAccountTokenAndGetAccount(
        setLogInState,
        accountToken,
        accountDict.setLoaded,
        enqueueSnackbar
      );
      return;
    }
    indexedDB.getAccountToken().then((accountToken) => {
      if (accountToken === undefined) {
        setLogInState(d.LogInState.Guest);
        return;
      }
      verifyingAccountTokenAndGetAccount(
        setLogInState,
        accountToken,
        accountDict.setLoaded,
        enqueueSnackbar
      );
    });
  }, []);

  const projectResource: Resource<d.ProjectId, d.Project> = {
    getFromMemoryCache: projectDict.get,
    forciblyRequestToServer: (projectId: d.ProjectId): void => {
      projectDict.setRequesting(projectId);
      api.getProject(projectId).then((response) => {
        if (response._ === "Nothing") {
          enqueueSnackbar("プロジェクトの取得に失敗しました", {
            variant: "error",
          });
          projectDict.setUnknown(projectId);
          return;
        }
        if (response.value.data._ === "Nothing") {
          enqueueSnackbar("プロジェクトが存在しなかった", {
            variant: "error",
          });
          projectDict.setDeleted(projectId, response.value.getTime);
          return;
        }
        projectDict.setLoaded(
          projectId,
          response.value.data.value,
          response.value.getTime
        );
      });
    },
    requestToServerIfEmpty: (projectId: d.ProjectId): void => {
      const projectState = projectDict.get(projectId);
      /** 一度取得したプロジェクトはリロードするまで再取得しない */
      if (projectState !== undefined) {
        return;
      }
      projectDict.setRequesting(projectId);
      api.getProject(projectId).then((response) => {
        if (response._ === "Nothing") {
          enqueueSnackbar("プロジェクトの取得に失敗しました", {
            variant: "error",
          });
          projectDict.setUnknown(projectId);
          return;
        }
        if (response.value.data._ === "Nothing") {
          enqueueSnackbar("プロジェクトが存在しなかった", {
            variant: "error",
          });
          projectDict.setDeleted(projectId, response.value.getTime);
          return;
        }
        projectDict.setLoaded(
          projectId,
          response.value.data.value,
          response.value.getTime
        );
      });
    },
  };

  const accountResource: Resource<d.AccountId, d.Account> = {
    getFromMemoryCache: accountDict.get,
    forciblyRequestToServer: (accountId: d.AccountId): void => {
      accountDict.setRequesting(accountId);
      api.getAccount(accountId).then((response) => {
        if (response._ === "Nothing") {
          enqueueSnackbar("プロジェクトの取得に失敗しました", {
            variant: "error",
          });
          accountDict.setUnknown(accountId);
          return;
        }
        if (response.value.data._ === "Nothing") {
          enqueueSnackbar("プロジェクトが存在しなかった", {
            variant: "error",
          });
          accountDict.setDeleted(accountId, response.value.getTime);
          return;
        }
        accountDict.setLoaded(
          accountId,
          response.value.data.value,
          response.value.getTime
        );
      });
    },
    requestToServerIfEmpty: (accountId: d.AccountId): void => {
      const accountState = accountDict.get(accountId);
      /** 一度取得したアカウントはリロードするまで再取得しない */
      if (accountState !== undefined) {
        return;
      }
      accountDict.setRequesting(accountId);
      api.getAccount(accountId).then((response) => {
        if (response._ === "Nothing") {
          enqueueSnackbar("プロジェクトの取得に失敗しました", {
            variant: "error",
          });
          accountDict.setUnknown(accountId);
          return;
        }
        if (response.value.data._ === "Nothing") {
          enqueueSnackbar("プロジェクトが存在しなかった", {
            variant: "error",
          });
          accountDict.setDeleted(accountId, response.value.getTime);
          return;
        }
        accountDict.setLoaded(
          accountId,
          response.value.data.value,
          response.value.getTime
        );
      });
    },
  };

  return {
    accountResource,
    projectResource,
    createProject,
    createProjectState,
    jump,
    language: urlData.language,
    location: urlData.location,
    logIn,
    logInState,
    logOut,
    topProjectsLoadingState,
    requestTop50Project,
  };
};

const verifyingAccountTokenAndGetAccount = (
  setLogInState: (logInState: d.LogInState) => void,
  accountToken: d.AccountToken,
  setAccount: (accountId: d.AccountId, account: d.Account) => void,
  enqueueSnackbar: (
    message: SnackbarMessage,
    options?: OptionsObject | undefined
  ) => SnackbarKey
) => {
  setLogInState(d.LogInState.VerifyingAccountToken(accountToken));
  api.getAccountByAccountToken(accountToken).then((response) => {
    if (response._ === "Nothing" || response.value._ === "Nothing") {
      enqueueSnackbar("ログインに失敗しました", {
        variant: "error",
      });
      setLogInState(d.LogInState.Guest);
      return;
    }
    enqueueSnackbar(
      `「${response.value.value.data.name}」としてログインしました`,
      {
        variant: "success",
      }
    );
    setLogInState(
      d.LogInState.LoggedIn({
        accountToken,
        userId: response.value.value.id,
      })
    );
    setAccount(response.value.value.id, response.value.value.data);
  });
};
