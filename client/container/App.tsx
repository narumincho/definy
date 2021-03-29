import * as React from "react";
import * as d from "../../data";
import * as indexedDB from "../indexedDB";
import {
  CreateProjectState,
  TopProjectsLoadingState,
  App as UiApp,
} from "../ui/App";
import {
  OptionsObject,
  SnackbarKey,
  SnackbarMessage,
  SnackbarProvider,
  useSnackbar,
} from "notistack";
import {
  urlDataAndAccountTokenFromUrl,
  urlDataAndAccountTokenToUrl,
} from "../../common/url";
import { api } from "../api";
import { useProjectDict } from "../hook/projectDict";

export const App: React.VFC<Record<string, string>> = () => {
  return (
    <SnackbarProvider maxSnack={4}>
      <AppInSnack />
    </SnackbarProvider>
  );
};

export const AppInSnack: React.VFC<Record<string, never>> = () => {
  const [
    topProjectsLoadingState,
    setTopProjectsLoadingState,
  ] = React.useState<TopProjectsLoadingState>({ _: "none" });
  const [urlData, setUrlData] = React.useState<d.UrlData>({
    language: "English",
    location: d.Location.Home,
  });
  const [logInState, setLogInState] = React.useState<d.LogInState>(
    d.LogInState.Guest
  );
  const [accountDict, setAccountDict] = React.useState<
    ReadonlyMap<d.AccountId, d.Account>
  >(new Map());
  const [
    createProjectState,
    setCreateProjectState,
  ] = React.useState<CreateProjectState>({ _: "none" });
  const { enqueueSnackbar } = useSnackbar();
  const useProjectDictResult = useProjectDict(enqueueSnackbar);

  const setAccount = (accountId: d.AccountId, account: d.Account): void => {
    setAccountDict((beforeDict) => new Map(beforeDict).set(accountId, account));
  };

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

  const onLogInButtonClick = () => {
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

  React.useEffect(() => {
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
      useProjectDictResult.setProjectList(
        response.value.data,
        response.value.getTime
      );
    });
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
        setAccount,
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
        setAccount,
        enqueueSnackbar
      );
    });
  }, []);

  return (
    <UiApp
      topProjectsLoadingState={topProjectsLoadingState}
      useProjectDictResult={useProjectDictResult}
      onJump={jump}
      onLogInButtonClick={onLogInButtonClick}
      location={urlData.location}
      language={urlData.language}
      logInState={logInState}
      accountDict={accountDict}
      createProjectState={createProjectState}
      onLogOutButtonClick={logOut}
      onCreateProject={createProject}
    />
  );
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
  api.getUserByAccountToken(accountToken).then((response) => {
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