import * as data from "definy-core/source/data";
import { Resource, TokenResource } from "./data";

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
  projectData: ReadonlyMap<data.ProjectId, Resource<data.Maybe<data.Project>>>;
  userData: ReadonlyMap<data.UserId, Resource<data.Maybe<data.User>>>;
  imageData: ReadonlyMap<data.ImageToken, TokenResource<string>>;
  onJump: (urlData: data.UrlData) => void;
  allProjectIdListMaybe: data.Maybe<Resource<ReadonlyArray<data.ProjectId>>>;
  requestAllProject: () => void;
  requestProject: (projectId: data.ProjectId) => void;
  requestUser: (userId: data.UserId) => void;
  requestImage: (imageToken: data.ImageToken) => void;
};
