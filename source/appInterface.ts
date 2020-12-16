import * as d from "definy-core/source/data";
import * as pageDebug from "./pageDebug";
import {
  GetTypePartInProjectState,
  HomeProjectState,
  TypePartEditSate,
} from "./model";
import { Element } from "./view/view";

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

  /** デバッグページのタブ */
  readonly selectedDebugTab: pageDebug.Tab;
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
      readonly tag: typeof messageJumpTag;
      readonly location: d.Location;
      readonly language: d.Language;
    }
  | {
      readonly tag: typeof messageChangeLocationAndLanguage;
      readonly location: d.Location;
      readonly language: d.Language;
    }
  | {
      readonly tag: typeof messageRequestLogInTag;
      readonly provider: d.OpenIdConnectProvider;
    }
  | {
      readonly tag: typeof messageRespondLogInUrlTag;
      readonly logInUrlMaybe: d.Maybe<string>;
    }
  | {
      readonly tag: typeof messageLogOut;
    }
  | {
      readonly tag: typeof messageGetUserTag;
      readonly userId: d.UserId;
    }
  | {
      readonly tag: typeof messageRespondUserTag;
      readonly userId: d.UserId;
      readonly response: d.Maybe<d.WithTime<d.Maybe<d.User>>>;
    }
  | {
      readonly tag: typeof messageRespondAccountTokenFromIndexedDB;
      readonly accountToken: d.AccountToken | undefined;
    }
  | {
      readonly tag: typeof messageRespondUserByAccountToken;
      readonly response: d.Maybe<d.Maybe<d.IdAndData<d.UserId, d.User>>>;
    }
  | {
      readonly tag: typeof messageGetTop50Project;
    }
  | {
      readonly tag: typeof messageRespondAllTop50Project;
      readonly response: d.Maybe<
        d.WithTime<ReadonlyArray<d.IdAndData<d.ProjectId, d.Project>>>
      >;
    }
  | {
      readonly tag: typeof messageGetProject;
      readonly projectId: d.ProjectId;
    }
  | {
      readonly tag: typeof messageRespondProject;
      readonly projectId: d.ProjectId;
      readonly response: d.Maybe<d.WithTime<d.Maybe<d.Project>>>;
    }
  | {
      readonly tag: typeof messageGetImage;
      readonly imageToken: d.ImageToken;
    }
  | {
      readonly tag: typeof messageRespondImage;
      readonly imageToken: d.ImageToken;
      readonly response: d.Maybe<Uint8Array>;
    }
  | {
      readonly tag: typeof messageGenerateCode;
      readonly definyCode: ReadonlyMap<d.TypePartId, d.TypePart>;
    }
  | {
      readonly tag: typeof messageGetTypePartInProject;
      readonly projectId: d.ProjectId;
    }
  | {
      readonly tag: typeof messageRespondTypePartInProject;
      readonly response: d.Maybe<
        d.WithTime<d.Maybe<d.List<d.IdAndData<d.TypePartId, d.TypePart>>>>
      >;
    }
  | {
      readonly tag: typeof messageCreateProject;
      readonly projectName: string;
    }
  | {
      readonly tag: typeof messageRespondCreatingProject;
      readonly response: d.Maybe<d.Maybe<d.IdAndData<d.ProjectId, d.Project>>>;
    }
  | {
      readonly tag: typeof messageSetTypePartList;
      readonly projectId: d.ProjectId;
      readonly code: ReadonlyArray<d.IdAndData<d.TypePartId, d.TypePart>>;
    }
  | {
      readonly tag: typeof messageRespondSetTypePartList;
      readonly response: d.Maybe<
        d.WithTime<d.Maybe<d.List<d.IdAndData<d.TypePartId, d.TypePart>>>>
      >;
    }
  | {
      readonly tag: typeof messageSelectDebugPageTab;
      readonly tab: pageDebug.Tab;
    };

export const messageJumpTag = Symbol("Message-Jump");
export const messageChangeLocationAndLanguage = Symbol(
  "Message-ChangeLocationAndLanguage"
);
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
export const messageSelectDebugPageTab = Symbol("Message-SelectDebugPageTab");

export interface TitleAndElement {
  readonly title: string;
  readonly element: Element<Message>;
}
