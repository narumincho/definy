import * as data from "definy-core/source/data";

export type CreateProjectState =
  | {
      _: "None";
    }
  | { _: "WaitCreating"; projectName: string }
  | { _: "Creating"; projectName: string }
  | { _: "Created"; projectId: data.ProjectId };

export type CreateIdeaState =
  | { _: "None" }
  | { _: "WaitCreating"; ideaName: string; parentId: data.IdeaId }
  | { _: "Creating"; ideaName: string; parentId: data.ProjectId }
  | { _: "Created"; ideaId: data.IdeaId };

export type Model = {
  logInState: data.LogInState;
  language: data.Language;
  clientMode: data.ClientMode;
  projectMap: ReadonlyMap<data.ProjectId, data.ResourceState<data.Project>>;
  userMap: ReadonlyMap<data.UserId, data.ResourceState<data.User>>;
  imageMap: ReadonlyMap<data.ImageToken, data.StaticResourceState<string>>;
  ideaMap: ReadonlyMap<data.IdeaId, data.ResourceState<data.Idea>>;
  projectIdeaIdMap: ReadonlyMap<data.ProjectId, ReadonlyArray<data.IdeaId>>;
  createProjectState: CreateProjectState;
  onJump: (urlData: data.UrlData) => void;
  requestLogOut: () => void;
  allProjectIdListMaybe: data.Maybe<
    data.ResourceState<ReadonlyArray<data.ProjectId>>
  >;
  requestAllProject: () => void;
  requestProject: (projectId: data.ProjectId) => void;
  requestUser: (userId: data.UserId) => void;
  requestImage: (imageToken: data.ImageToken) => void;
  requestIdea: (ideaId: data.IdeaId) => void;
  createProject: (projectName: string) => void;
  createIdea: (ideaName: string, parentId: data.IdeaId) => void;
  requestProjectIdea: (projectId: data.ProjectId) => void;
};
