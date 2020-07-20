import * as data from "definy-core/source/data";

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
  projectMap: ReadonlyMap<data.ProjectId, data.ResourceState<data.Project>>;
  userMap: ReadonlyMap<data.UserId, data.ResourceState<data.User>>;
  imageMap: ReadonlyMap<data.ImageToken, data.StaticResourceState<string>>;
  onJump: (urlData: data.UrlData) => void;
  allProjectIdListMaybe: data.Maybe<
    data.ResourceState<ReadonlyArray<data.ProjectId>>
  >;
  requestAllProject: () => void;
  requestProject: (projectId: data.ProjectId) => void;
  requestUser: (userId: data.UserId) => void;
  requestImage: (imageToken: data.ImageToken) => void;
};
