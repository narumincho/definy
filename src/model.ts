import {
  ClientMode,
  Language,
  OpenIdConnectProvider,
  ProjectId,
  ProjectSnapshot,
  UrlData,
} from "definy-common/source/data";

export type LogInState =
  | { _: "Guest" }
  | { _: "PreparingLogInUrlRequest"; provider: OpenIdConnectProvider }
  | { _: "RequestingLogInUrl"; provider: OpenIdConnectProvider }
  | { _: "JumpingToLogInPage"; logInUrl: URL };

export type Resource<T> =
  | { _: "Loading" }
  | { _: "Loaded"; snapshot: T }
  | { _: "NotFound" };

export type Model = {
  logInState: LogInState;
  language: Language;
  clientMode: ClientMode;
  projectData: ReadonlyMap<ProjectId, Resource<ProjectSnapshot>>;
  onJump: (urlData: UrlData) => void;
};
