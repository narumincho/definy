import * as d from "definy-core/source/data";
import {
  GetTypePartInProjectState,
  HomeProjectState,
  TypePartEditSate,
} from "./model";

export interface AppInterface {
  /** ホームに表示される. Top50のプロジェクトのID */
  readonly top50ProjectIdState: HomeProjectState;

  /** プロジェクトの辞書 */
  readonly projectMap: ReadonlyMap<d.ProjectId, d.ResourceState<d.Project>>;

  /** ユーザーの辞書 */
  readonly userMap: ReadonlyMap<d.UserId, d.ResourceState<d.User>>;

  /** 画像のBlobURLの辞書 */
  readonly imageMap: ReadonlyMap<d.ImageToken, d.StaticResourceState<string>>;

  /** 型パーツの辞書 */
  readonly typePartMap: ReadonlyMap<d.TypePartId, d.ResourceState<d.TypePart>>;

  /** プロジェクト作成中かどうか */
  readonly isCreatingProject: boolean;

  /** 型パーツ編集状態 */
  readonly typePartEditState: TypePartEditSate;

  /** プロジェクトに属する型パーツの取得状態 */
  readonly getTypePartInProjectState: GetTypePartInProjectState;

  /** ページの言語 */
  readonly language: d.Language;

  /** クライアントモード. デバッグ時のlocalhostか, リリース時か */
  readonly clientMode: d.ClientMode;

  /** ログイン状態 */
  readonly logInState: d.LogInState;

  /** 出力されたコード */
  readonly outputCode: string | undefined;
}

/**
 * アカウントトークンを得る
 */
export const getAccountToken = (
  appInterface: AppInterface
): d.AccountToken | undefined => {
  switch (appInterface.logInState._) {
    case "LoggedIn":
      return appInterface.logInState.accountTokenAndUserId.accountToken;
  }
};

export type Message =
  | {
      tag: typeof messageJumpTag;
      location: d.Location;
      language: d.Language;
    }
  | {
      tag: typeof messageRequestLogInTag;
      provider: d.OpenIdConnectProvider;
    }
  | {
      tag: typeof messageRespondLogInUrlTag;
      logInUrlMaybe: d.Maybe<string>;
    }
  | {
      tag: typeof messageLogOut;
    }
  | {
      tag: typeof messageGetUserTag;
      userId: d.UserId;
    }
  | {
      tag: typeof messageRespondUserTag;
      userId: d.UserId;
      response: d.Maybe<d.WithTime<d.Maybe<d.User>>>;
    }
  | {
      tag: typeof messageRespondAccountTokenFromIndexedDB;
      accountToken: d.AccountToken | undefined;
    }
  | {
      tag: typeof messageRespondUserByAccountToken;
      response: d.Maybe<d.Maybe<d.IdAndData<d.UserId, d.User>>>;
    }
  | {
      tag: typeof messageGetTop50Project;
    }
  | {
      tag: typeof messageRespondAllTop50Project;
      response: d.Maybe<
        d.WithTime<ReadonlyArray<d.IdAndData<d.ProjectId, d.Project>>>
      >;
    }
  | {
      tag: typeof messageGetProject;
      projectId: d.ProjectId;
    }
  | {
      tag: typeof messageRespondProject;
      projectId: d.ProjectId;
      response: d.Maybe<d.WithTime<d.Maybe<d.Project>>>;
    }
  | {
      tag: typeof messageGetImage;
      imageToken: d.ImageToken;
    }
  | {
      tag: typeof messageRespondImage;
      imageToken: d.ImageToken;
      response: d.Maybe<Uint8Array>;
    }
  | {
      tag: typeof messageGenerateCode;
      definyCode: ReadonlyMap<d.TypePartId, d.TypePart>;
    }
  | {
      tag: typeof messageGetTypePartInProject;
      projectId: d.ProjectId;
    }
  | {
      tag: typeof messageRespondTypePartInProject;
      response: d.Maybe<
        d.WithTime<d.Maybe<d.List<d.IdAndData<d.TypePartId, d.TypePart>>>>
      >;
    }
  | {
      tag: typeof messageCreateProject;
      projectName: string;
    }
  | {
      tag: typeof messageRespondCreatingProject;
      response: d.Maybe<d.Maybe<d.IdAndData<d.ProjectId, d.Project>>>;
    }
  | {
      tag: typeof messageSetTypePartList;
      projectId: d.ProjectId;
      code: ReadonlyArray<d.IdAndData<d.TypePartId, d.TypePart>>;
    }
  | {
      tag: typeof messageRespondSetTypePartList;
      response: d.Maybe<
        d.WithTime<d.Maybe<d.List<d.IdAndData<d.TypePartId, d.TypePart>>>>
      >;
    };

export const messageJumpTag = Symbol("Message-Jump");
export const messageRequestLogInTag = Symbol("Message-RequestLogIn");
export const messageRespondLogInUrlTag = Symbol("Message-RespondLogInUrlTag");
export const messageLogOut = Symbol("Message-LogOut");
export const messageGetUserTag = Symbol("Message-GetUser");
export const messageRespondUserTag = Symbol("Message-RespondUser");
export const messageRespondAccountTokenFromIndexedDB = Symbol(
  "Message-RespondAccountTokenFromIndexedDB"
);
export const messageRespondUserByAccountToken = Symbol(
  "Message-RespondUserByAccountToken"
);
export const messageGetTop50Project = Symbol("Message-GetTop50Project");
export const messageRespondAllTop50Project = Symbol(
  "Message-RespondAllTop50Project"
);
export const messageGetProject = Symbol("Message-GetProject");
export const messageRespondProject = Symbol("Message-RespondProject");
export const messageGetImage = Symbol("Message-GetImage");
export const messageRespondImage = Symbol("Message-RespondImage");
export const messageGenerateCode = Symbol("Message-GenerateCode");
export const messageGetTypePartInProject = Symbol(
  "Message-GetTypePartInProject"
);
export const messageRespondTypePartInProject = Symbol(
  "Message-RespondTypePartInProject"
);
export const messageCreateProject = Symbol("Message-CreateProject");
export const messageRespondCreatingProject = Symbol(
  "Message-RespondCreatingProject"
);
export const messageSetTypePartList = Symbol("Message-SetTypePartList");
export const messageRespondSetTypePartList = Symbol(
  "Message-RespondSetTypePartList"
);
