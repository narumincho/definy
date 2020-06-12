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
  | { _: "RequestingLogInUrl"; provider: OpenIdConnectProvider };

export type Resource<T> =
  | { _: "Loading" }
  | { _: "Loaded"; snapshot: T }
  | { _: "NotFound" };

export type ProjectData = ReadonlyMap<ProjectId, Resource<ProjectSnapshot>>;

export type Model = {
  logInState: LogInState;
  language: Language;
  clientMode: ClientMode;
  projectData: ProjectData;
  onJump: (urlData: UrlData) => void;
};
