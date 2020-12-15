import * as d from "definy-core/source/data";

export type HomeProjectState =
  | { _: "None" }
  | { _: "Loading" }
  | { _: "Loaded"; projectIdList: ReadonlyArray<d.ProjectId> };

export type TypePartEditSate = "None" | "Adding" | "Saving" | "Error";

export type GetTypePartInProjectState =
  | { _: "None" }
  | { _: "Requesting"; projectId: d.ProjectId };

export type RequestTypePartListInProjectState =
  | { _: "None" }
  | { _: "WaitRequesting"; projectId: d.ProjectId }
  | { _: "Requesting"; projectId: d.ProjectId };

/** Definy自体のAPIのようなもの. アプリの状態を読み取れ, 操作を要求できる */
export interface Model {
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

  /** 型パーツの編集状態 */
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

  /** 出力されコード */
  outputCode: string | undefined;

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
  addTypePart: (
    projectId: d.ProjectId,
    typePartList: ReadonlyArray<d.IdAndData<d.TypePartId, d.TypePart>>
  ) => void;

  /** 型パーツの保存 */
  setTypePartList: (
    projectId: d.ProjectId,
    typePartList: ReadonlyArray<d.IdAndData<d.TypePartId, d.TypePart>>
  ) => void;

  /** ログインする. ログインのURLを発行してログインページに移行する */
  logIn: (provider: d.OpenIdConnectProvider) => void;

  /** ログアウトする */
  logOut: () => void;

  /** ジャンプする */
  jump: (location: d.Location, language: d.Language) => void;

  /** コードを生成する */
  generateCode: (typePartMap: ReadonlyMap<d.TypePartId, d.TypePart>) => void;
}
