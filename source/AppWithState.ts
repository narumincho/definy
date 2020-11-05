import * as d from "definy-core/source/data";
import {
  AddTypePartState,
  GetTypePartInProjectState,
  HomeProjectState,
} from "./modelInterface";
import { Component, VNode, h } from "preact";

export type Props = {
  initUrlData: d.UrlData;
  accountToken: d.Maybe<d.AccountToken>;
};

export type State = {
  /** ホームに表示される. Top50のプロジェクトのID */
  top50ProjectIdState: HomeProjectState;

  /** プロジェクトの辞書 */
  projectMap: Map<d.ProjectId, d.ResourceState<d.Project>>;

  /** ユーザーの辞書 */
  userMap: Map<d.UserId, d.ResourceState<d.User>>;

  /** 画像のBlobURLの辞書 */
  imageMap: Map<d.ImageToken, d.StaticResourceState<string>>;

  /** 型パーツの辞書 */
  typePartMap: Map<d.TypePartId, d.ResourceState<d.TypePart>>;

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
};

export class AppWithState extends Component<Props, State> {
  displayName = "AppWithState";

  constructor(props: Props) {
    super(props);
    this.state = {
      top50ProjectIdState: { _: "None" },
      projectMap: new Map(),
      userMap: new Map(),
      imageMap: new Map(),
      typePartMap: new Map(),
      addTypePartState: { _: "None" },
      getTypePartInProjectState: { _: "None" },
      language: props.initUrlData.language,
      clientMode: props.initUrlData.clientMode,
      logInState:
        props.accountToken._ === "Just"
          ? d.LogInState.WaitVerifyingAccountToken(props.accountToken.value)
          : d.LogInState.WaitLoadingAccountTokenFromIndexedDB,
    };
  }

  render(): VNode<Props> {
    return h("div", {}, this.state.language + "の言語だよ");
  }
}
