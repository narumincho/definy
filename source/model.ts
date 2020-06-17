import { RequestState, Resource } from "./data";
import { data } from "definy-common";

export type LogInState =
  | { _: "Guest" }
  | { _: "WaitRequestingLogInUrl"; provider: data.OpenIdConnectProvider }
  | { _: "RequestingLogInUrl"; provider: data.OpenIdConnectProvider }
  | { _: "JumpingToLogInPage"; logInUrl: URL }
  | { _: "WaitVerifyingAccessToken"; accessToken: data.AccessToken }
  | { _: "VerifyingAccessToken"; accessToken: data.AccessToken }
  | { _: "LoggedIn"; accessToken: data.AccessToken; userId: data.UserId };

export type Model = {
  logInState: LogInState;
  language: data.Language;
  clientMode: data.ClientMode;
  projectData: ReadonlyMap<data.ProjectId, Resource<data.Project>>;
  userData: ReadonlyMap<data.UserId, Resource<data.User>>;
  onJump: (urlData: data.UrlData) => void;
  allProjectRequestState: RequestState;
  requestAllProject: () => void;
};
