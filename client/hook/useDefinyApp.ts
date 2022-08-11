import * as d from "../../localData";
import * as indexedDB from "../indexedDB";
import { AddMessage, useNotification } from "./useNotification";
import { NextRouter, useRouter } from "next/router";
import { ReactElement, useCallback, useEffect, useMemo, useState } from "react";
import {
  locationAndLanguageToNodeUrlObject,
  urlToUrlData,
} from "../../common/url";
import type { TypePartIdAndMessage } from "../../core/TypePartIdAndMessage";
import { api } from "../api";
import { generateTypeScriptCode } from "../../core/main";
import { jsTs } from "../../gen/main";
import { useResourceState } from "./resourceState";
import { useTypePartIdListInProject } from "./typePartIdListInProject";

export type TopProjectsLoadingState =
  | { readonly _: "none" }
  | { readonly _: "loading" }
  | {
      readonly _: "loaded";
      readonly projectIdList: ReadonlyArray<d.ProjectId>;
    };

export type CreateProjectState =
  | {
      readonly _: "creating";
      readonly name: string;
    }
  | {
      readonly _: "none";
    };

export type CreateTypePartState =
  | { readonly tag: "creating"; readonly projectId: d.ProjectId }
  | { readonly tag: "none" };

export type Resource<id extends string, resource> = {
  /**
   * メモリから, リリースのリクエスト状態とデータを取得する
   *
   * *no-side-effect*
   */
  readonly getFromMemoryCache: (
    id_: id
  ) => d.ResourceState<resource> | undefined;
  /**
   * データがキャッシュにない場合, サーバーにリクエストする
   *
   * *side-effect*
   */
  readonly requestToServerIfEmpty: (id_: id) => void;
  /**
   * 強制的にサーバーにリクエストする
   *
   * *side-effect*
   */
  readonly forciblyRequestToServer: (id_: id) => void;
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
   * 型パーツをキャッシュから取得, サーバーへのリクエストができる
   */
  readonly typePartResource: Resource<d.TypePartId, d.TypePart>;
  /**
   * プロジェクトに属している型パーツのIDをキャッシュから取得, サーバーへのリクエストができる
   */
  readonly typePartIdListInProjectResource: Resource<
    d.ProjectId,
    ReadonlyArray<d.TypePartId>
  >;
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
   * ログインする
   *
   * *side-effect*
   */
  readonly logIn: (locationAndLanguage: d.LocationAndLanguage) => void;
  /**
   * ログアウトする
   *
   * *side-effect*
   */
  readonly logOut: (language: d.Language) => void;
  /**
   * プロジェクトを作成する
   * @param projectName プロジェクト名
   *
   * *side-effect*
   */
  readonly createProject: (param: {
    readonly projectName: string;
    readonly language: d.Language;
  }) => void;

  /**
   * おすすめのプロジェクトを取得する
   *
   * *side-effect*
   */
  readonly requestTop50Project: () => void;

  /**
   * 型パーツを追加する
   *
   * *side-effect*
   */
  readonly addTypePart: (param: {
    readonly projectId: d.ProjectId;
    readonly language: d.Language;
  }) => void;

  /**
   * 型パーツを保存する
   *
   * *side-effect*
   */
  readonly saveTypePart: (
    parameter: Pick<
      d.SetTypePartParameter,
      | "typePartId"
      | "name"
      | "description"
      | "attribute"
      | "typeParameterList"
      | "body"
    >
  ) => void;

  /**
   * 型パーツを保存中かどうか
   *
   * *no-side-effect*
   */
  readonly isSavingTypePart: boolean;

  /**
   * コード生成を生成する
   *
   * *side-effect*
   */
  readonly generateCode: (projectId: d.ProjectId) => void;

  /**
   * 出力されたコード
   *
   * *no-side-effect*
   */
  readonly outputCode: OutputCode;

  /**
   * 通知の表示
   */
  readonly notificationElement: ReactElement;
};

export type OutputCode =
  | {
      readonly tag: "notGenerated";
    }
  | {
      readonly tag: "generating";
    }
  | {
      readonly tag: "generated";
      readonly typeScript: string;
    }
  | {
      readonly tag: "errorWithTypePartId";
      readonly messageList: ReadonlyArray<TypePartIdAndMessage>;
    }
  | {
      readonly tag: "error";
      readonly errorMessage: string;
    };

export type NotificationMessageHandler = (
  message: string,
  variant: "error" | "success"
) => void;

export type UseDefinyAppOption = {
  readonly notificationMessageHandler: NotificationMessageHandler;
};

const getIdFunc = <Id>(item: { id: Id }): Id => item.id;

/**
 * definy の アプリの動作をする Hook.
 *
 * 想定する環境は ブラウザで, Reactを使用する. node.js 内ではたぶん動かない
 */
export const useDefinyApp = (): UseDefinyAppResult => {
  const [topProjectsLoadingState, setTopProjectsLoadingState] =
    useState<TopProjectsLoadingState>({ _: "none" });

  const [logInState, setLogInState] = useState<d.LogInState>(
    d.LogInState.Guest
  );
  const [createProjectState, setCreateProjectState] =
    useState<CreateProjectState>({ _: "none" });
  const projectDict = useResourceState<d.ProjectId, d.Project>(getIdFunc);
  const accountDict = useResourceState<d.AccountId, d.Account>(getIdFunc);
  const [createTypePartState, setCreateTypePartState] =
    useState<CreateTypePartState>({ tag: "none" });
  const typePartIdListInProjectDict = useTypePartIdListInProject();
  const typePartDict = useResourceState<d.TypePartId, d.TypePart>(getIdFunc);
  const [isSavingTypePart, setIsSavingTypePart] = useState<boolean>(false);
  const [outputCode, setOutputCode] = useState<OutputCode>({
    tag: "notGenerated",
  });
  const { addMessage, element: notificationElement } = useNotification();

  const router = useRouter();

  const logIn = useCallback(
    (locationAndLanguage: d.LocationAndLanguage) => {
      setLogInState({
        _: "RequestingLogInUrl",
        openIdConnectProvider: "Google",
      });
      api
        .requestLogInUrl({
          locationAndLanguage,
          openIdConnectProvider: "Google",
        })
        .then((response) => {
          if (response._ === "Nothing") {
            addMessage({
              text: "ログインURL取得に失敗しました",
              type: "error",
            });
            return;
          }
          setLogInState(d.LogInState.JumpingToLogInPage);
          requestAnimationFrame(() => {
            window.location.href = response.value;
          });
        });
    },
    [addMessage]
  );

  const logOut = useCallback(
    (language: d.Language) => {
      indexedDB.deleteAccountToken();
      setLogInState(d.LogInState.Guest);
      router.push(
        locationAndLanguageToNodeUrlObject({
          language,
          location: d.Location.Home,
        })
      );
      addMessage({ text: "ログアウトしました", type: "success" });
    },
    [router, addMessage]
  );

  const getAccountToken = useCallback((): d.AccountToken | undefined => {
    switch (logInState._) {
      case "LoggedIn":
        return logInState.accountTokenAccountId.accountToken;
    }
  }, [logInState]);

  const createProject = useCallback(
    (param: {
      readonly projectName: string;
      readonly language: d.Language;
    }): void => {
      const accountToken = getAccountToken();
      if (accountToken === undefined) {
        addMessage({
          text: "ログインしていない状態でプロジェクトを作ることはできない",
          type: "error",
        });
        return;
      }
      if (createProjectState._ === "creating") {
        addMessage({
          text: "プロジェクト作成中にさらにプロジェクトを作成することはできない",
          type: "error",
        });
        return;
      }
      setCreateProjectState({ _: "creating", name: param.projectName });
      api
        .createProject({
          accountToken,
          projectName: param.projectName,
        })
        .then((response) => {
          setCreateProjectState({ _: "none" });
          if (response._ === "Nothing" || response.value._ === "Nothing") {
            addMessage({
              text: "プロジェクト作成に失敗しました",
              type: "error",
            });
            return;
          }
          addMessage({
            text: `プロジェクト「${response.value.value.name}」を作成しました`,
            type: "success",
          });
          router.push(
            locationAndLanguageToNodeUrlObject({
              language: param.language,
              location: d.Location.Project(response.value.value.id),
            })
          );
        });
    },
    [getAccountToken, createProjectState._, addMessage, router]
  );

  const requestTop50Project = useCallback((): void => {
    setTopProjectsLoadingState({ _: "loading" });
    api.getTop50Project(undefined).then((response) => {
      if (response._ === "Nothing") {
        addMessage({
          text: "プロジェクト一覧取得に失敗しました",
          type: "error",
        });
        return;
      }
      projectDict.setLoadedList(response.value.data, response.value.getTime);
      setTopProjectsLoadingState({
        _: "loaded",
        projectIdList: response.value.data.map((project) => project.id),
      });
    });
  }, [addMessage, projectDict]);

  useEffect(() => {
    const urlData = urlToUrlData(new URL(location.href));
    if (urlData._ === "Normal") {
      // ブラウザのURLを正規化.
      router.replace(
        locationAndLanguageToNodeUrlObject(urlData.locationAndLanguage)
      );
      indexedDB.getAccountToken().then((accountToken) => {
        if (accountToken === undefined) {
          setLogInState(d.LogInState.Guest);
          return;
        }
        verifyingAccountTokenAndGetAccount(
          setLogInState,
          accountToken,
          accountDict.setLoaded,
          addMessage
        );
      });
      return;
    }
    // urlData が LogInCallback の場合
    verifyingAccountTokenAndGetAccountFromCodeAndState(
      setLogInState,
      urlData.codeAndState,
      accountDict.setLoaded,
      addMessage,
      router
    );
  }, [accountDict.setLoaded, addMessage, router]);

  const projectResource: Resource<d.ProjectId, d.Project> = useMemo(
    () => ({
      getFromMemoryCache: projectDict.get,
      forciblyRequestToServer: (projectId: d.ProjectId): void => {
        if (projectDict.get(projectId)?._ === "Requesting") {
          return;
        }
        projectDict.setRequesting(projectId);
        api.getProject(projectId).then((response) => {
          if (response._ === "Nothing") {
            addMessage({
              text: "プロジェクトの取得に失敗しました",
              type: "error",
            });
            projectDict.setUnknown(projectId);
            return;
          }
          if (response.value.data._ === "Nothing") {
            addMessage({
              text: "プロジェクトが存在しなかった",
              type: "error",
            });
            projectDict.setDeleted(projectId, response.value.getTime);
            return;
          }
          projectDict.setLoaded(
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
        projectResource.forciblyRequestToServer(projectId);
      },
    }),
    [addMessage, projectDict]
  );

  const accountResource: Resource<d.AccountId, d.Account> = useMemo(
    () => ({
      getFromMemoryCache: accountDict.get,
      forciblyRequestToServer: (accountId: d.AccountId): void => {
        if (accountDict.get(accountId)?._ === "Requesting") {
          return;
        }
        accountDict.setRequesting(accountId);
        api.getAccount(accountId).then((response) => {
          if (response._ === "Nothing") {
            addMessage({
              text: "プロジェクトの取得に失敗しました",
              type: "error",
            });
            accountDict.setUnknown(accountId);
            return;
          }
          if (response.value.data._ === "Nothing") {
            addMessage({
              text: "プロジェクトが存在しなかった",
              type: "error",
            });
            accountDict.setDeleted(accountId, response.value.getTime);
            return;
          }
          accountDict.setLoaded(
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
        accountResource.forciblyRequestToServer(accountId);
      },
    }),
    [accountDict, addMessage]
  );

  const addTypePart = useCallback(
    (param: {
      readonly projectId: d.ProjectId;
      readonly language: d.Language;
    }): void => {
      const accountToken = getAccountToken();
      if (accountToken === undefined) {
        addMessage({
          text: "ログインしていない状態で型パーツを作ることはできない",
          type: "error",
        });
        return;
      }
      if (createTypePartState.tag === "creating") {
        addMessage({ text: "型パーツ作成は同時にできない", type: "error" });
        return;
      }
      setCreateTypePartState({ tag: "creating", projectId: param.projectId });
      api
        .addTypePart({
          accountToken,
          projectId: param.projectId,
        })
        .then((response) => {
          setCreateTypePartState({ tag: "none" });
          if (response._ === "Nothing" || response.value.data._ === "Nothing") {
            addMessage({ text: "型パーツ作成に失敗しました", type: "error" });
            return;
          }
          addMessage({
            text: `型パーツ 「${response.value.data.value.name}」を作成しました`,
            type: "success",
          });
          router.push(
            locationAndLanguageToNodeUrlObject({
              language: param.language,
              location: d.Location.TypePart(response.value.data.value.id),
            })
          );
        });
    },
    [getAccountToken, createTypePartState.tag, addMessage, router]
  );

  const typePartIdListInProjectResource: UseDefinyAppResult["typePartIdListInProjectResource"] =
    useMemo(
      () => ({
        forciblyRequestToServer: (projectId) => {
          if (typePartIdListInProjectDict.get(projectId)?._ === "Requesting") {
            return;
          }
          typePartIdListInProjectDict.setRequesting(projectId);
          api.getTypePartByProjectId(projectId).then((response) => {
            if (
              response._ === "Nothing" ||
              response.value.data._ === "Nothing"
            ) {
              typePartIdListInProjectDict.setUnknown(projectId);
              addMessage({
                text: "プロジェクトに属している型パーツ一覧の取得に失敗しました",
                type: "error",
              });
              return;
            }
            console.log("typePartList", response);
            typePartDict.setLoadedList(
              response.value.data.value,
              response.value.getTime
            );
            typePartIdListInProjectDict.setLoaded(
              projectId,
              response.value.data.value.map((e) => e.id)
            );
          });
        },
        getFromMemoryCache: typePartIdListInProjectDict.get,
        requestToServerIfEmpty: (projectId) => {
          const resource = typePartIdListInProjectDict.get(projectId);
          if (resource !== undefined) {
            return;
          }
          typePartIdListInProjectResource.forciblyRequestToServer(projectId);
        },
      }),
      [addMessage, typePartDict, typePartIdListInProjectDict]
    );

  const typePartResource: UseDefinyAppResult["typePartResource"] = useMemo(
    () => ({
      forciblyRequestToServer: (typePartId) => {
        if (typePartDict.get(typePartId)?._ === "Requesting") {
          return;
        }
        typePartDict.setRequesting(typePartId);
        api.getTypePart(typePartId).then((response) => {
          if (response._ === "Nothing") {
            typePartDict.setUnknown(typePartId);
            addMessage({ text: "型パーツの取得に失敗しました", type: "error" });
            return;
          }
          if (response.value.data._ === "Nothing") {
            typePartDict.setDeleted(typePartId, response.value.getTime);
            addMessage({ text: "型パーツは存在しなかった", type: "error" });
            return;
          }
          typePartDict.setLoaded(response.value.data.value);
        });
      },
      getFromMemoryCache: typePartDict.get,
      requestToServerIfEmpty: (typePartId) => {
        if (typePartDict.get(typePartId) !== undefined) {
          return;
        }
        typePartResource.forciblyRequestToServer(typePartId);
      },
    }),
    [addMessage, typePartDict]
  );

  const saveTypePart = useCallback(
    (
      parameter: Pick<
        d.SetTypePartParameter,
        | "typePartId"
        | "name"
        | "description"
        | "attribute"
        | "typeParameterList"
        | "body"
      >
    ): void => {
      const accountToken = getAccountToken();
      if (accountToken === undefined) {
        addMessage({
          text: "ログインしていない状態で型パーツを保存することはできない",
          type: "error",
        });
        return;
      }
      setIsSavingTypePart(true);
      api
        .setTypePart({
          accountToken,
          typePartId: parameter.typePartId,
          name: parameter.name,
          description: parameter.description,
          attribute: parameter.attribute,
          typeParameterList: parameter.typeParameterList,
          body: parameter.body,
        })
        .then((response) => {
          setIsSavingTypePart(false);
          if (response._ === "Nothing") {
            addMessage({ text: "型の保存に失敗した", type: "error" });
            return;
          }
          if (response.value.data._ === "Nothing") {
            addMessage({ text: "型の保存に失敗した?", type: "error" });
            return;
          }
          typePartDict.setLoaded(
            response.value.data.value,
            response.value.getTime
          );
          addMessage({ text: "型の保存に成功!", type: "success" });
        });
    },
    [addMessage, getAccountToken, typePartDict]
  );

  const generateCode = useCallback(
    (projectId: d.ProjectId): void => {
      setOutputCode({ tag: "generating" });
      const gen = () => {
        const projectIdList =
          typePartIdListInProjectResource.getFromMemoryCache(projectId);
        if (projectIdList === undefined || projectIdList._ !== "Loaded") {
          addMessage({
            text: "プロジェクトの型パーツ一覧を取得していない状態でコードは生成できない",
            type: "error",
          });
          return;
        }
        const definyCode: Map<d.TypePartId, d.TypePart> = new Map();
        for (const typePartId of projectIdList.dataWithTime.data) {
          const typePart = typePartDict.get(typePartId);
          if (typePart !== undefined && typePart._ === "Loaded") {
            definyCode.set(typePartId, typePart.dataWithTime.data);
          }
        }
        setOutputCode(generateCodeWithOutErrorHandling(definyCode));
        addMessage({ text: "コードを生成しました", type: "success" });
      };
      requestAnimationFrame(gen);
    },
    [addMessage, typePartDict, typePartIdListInProjectResource]
  );

  return useMemo<UseDefinyAppResult>(
    () => ({
      accountResource,
      projectResource,
      createProject,
      createProjectState,
      logIn,
      logInState,
      logOut,
      topProjectsLoadingState,
      requestTop50Project,
      addTypePart,
      typePartIdListInProjectResource,
      typePartResource,
      saveTypePart,
      isSavingTypePart,
      generateCode,
      outputCode,
      notificationElement,
    }),
    [
      accountResource,
      projectResource,
      createProject,
      createProjectState,
      logIn,
      logInState,
      logOut,
      topProjectsLoadingState,
      requestTop50Project,
      addTypePart,
      typePartIdListInProjectResource,
      typePartResource,
      saveTypePart,
      isSavingTypePart,
      generateCode,
      outputCode,
      notificationElement,
    ]
  );
};

const verifyingAccountTokenAndGetAccount = (
  setLogInState: (logInState: d.LogInState) => void,
  accountToken: d.AccountToken,
  setAccount: (account: d.Account) => void,
  addMessage: AddMessage
) => {
  setLogInState(d.LogInState.LoadingAccountData);
  api.getAccountByAccountToken(accountToken).then((response) => {
    if (response._ === "Nothing" || response.value._ === "Nothing") {
      addMessage({
        text: "ログインに失敗しました",
        type: "error",
      });
      setLogInState(d.LogInState.Guest);
      return;
    }
    indexedDB.setAccountToken(accountToken);
    addMessage({
      text: `「${response.value.value.name}」としてログインしました`,
      type: "success",
    });
    setLogInState(
      d.LogInState.LoggedIn({
        accountToken,
        accountId: response.value.value.id,
      })
    );
    setAccount(response.value.value);
  });
};

const verifyingAccountTokenAndGetAccountFromCodeAndState = (
  setLogInState: (logInState: d.LogInState) => void,
  codeAndState: d.CodeAndState,
  setAccount: (account: d.Account) => void,
  addMessage: AddMessage,
  router: NextRouter
): void => {
  setLogInState(d.LogInState.LoadingAccountData);

  api.getAccountTokenAndUrlDataByCodeAndState(codeAndState).then((response) => {
    if (response._ === "Nothing" || response.value._ === "Nothing") {
      addMessage({ text: "ログインに失敗しました", type: "error" });
      setLogInState(d.LogInState.Guest);
      return;
    }
    indexedDB.setAccountToken(response.value.value.accountToken);
    addMessage({
      text: `「${response.value.value.account.name}」としてログインしました`,
      type: "success",
    });
    setLogInState(
      d.LogInState.LoggedIn({
        accountToken: response.value.value.accountToken,
        accountId: response.value.value.account.id,
      })
    );
    setAccount(response.value.value.account);
    router.push(
      locationAndLanguageToNodeUrlObject(
        response.value.value.locationAndLanguage
      )
    );
  });
};

const generateCodeWithOutErrorHandling = (
  definyCode: ReadonlyMap<d.TypePartId, d.TypePart>
): OutputCode => {
  try {
    const jsTsCode = generateTypeScriptCode(definyCode);
    if (jsTsCode._ === "Error") {
      return {
        tag: "errorWithTypePartId",
        messageList: jsTsCode.error,
      };
    }

    return {
      tag: "generated",
      typeScript: jsTs.generateCodeAsString(jsTsCode.ok, "TypeScript"),
    };
  } catch (error: unknown) {
    return {
      tag: "error",
      errorMessage: "エラーが発生しました " + (error as string),
    };
  }
};
