import {
  ClientMode,
  Language,
  OpenIdConnectProvider,
  ProjectId,
  ProjectSnapshot,
  UrlData,
} from "definy-common/source/data";
import { Resource } from "./data";

export type LogInState =
  | { _: "Guest" }
  | { _: "PreparingLogInUrlRequest"; provider: OpenIdConnectProvider }
  | { _: "RequestingLogInUrl"; provider: OpenIdConnectProvider }
  | { _: "JumpingToLogInPage"; logInUrl: URL };

export type RequestState =
  | "NotRequest"
  | "WaitRequest"
  | "Requesting"
  | "Respond";

export type Model = {
  logInState: LogInState;
  language: Language;
  clientMode: ClientMode;
  projectData: ReadonlyMap<ProjectId, Resource<ProjectSnapshot>>;
  onJump: (urlData: UrlData) => void;
  allProjectDataRequestState: RequestState;
};
