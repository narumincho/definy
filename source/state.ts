import * as d from "definy-core/source/data";

export interface State {
  /** ログイン状態 */
  logInState: d.LogInState;
  language: d.Language;
  clientMode: d.ClientMode;
}

export interface Message {
  tag: "setUrlData";
  language: d.Language;
  clientMode: d.ClientMode;
  location: d.Location;
}
