import { data } from "definy-common";

export namespace Elm {
  namespace Main {
    function init(args: {
      flags: Flags;
      node: HTMLElement;
    }): {
      ports: Ports;
    };
  }
}

type Flags = {
  readonly windowSize: {
    readonly width: number;
    readonly height: number;
  };
  readonly accessTokenMaybe: null | string;
  readonly networkConnection: boolean;
};

type Ports = {
  readonly preventDefaultBeforeKeyEvent: SubForElmCmd<null>;
  readonly consoleLog: SubForElmCmd<string>;
  readonly requestLogInUrl: SubForElmCmd<data.RequestLogInUrlRequestData>;
  readonly getUserByAccessToken: SubForElmCmd<data.AccessToken>;
  readonly getImageBlobUrl: SubForElmCmd<data.FileHash>;
  readonly createProject: SubForElmCmd<data.CreateProjectParameter>;
  readonly createIdea: SubForElmCmd<data.CreateIdeaParameter>;

  readonly toValidProjectName: SubForElmCmd<string>;
  readonly toValidIdeaName: SubForElmCmd<string>;

  readonly getUser: SubForElmCmd<data.UserId>;
  readonly getAllProjectIdList: SubForElmCmd<null>;
  readonly getProject: SubForElmCmd<data.ProjectId>;
  readonly getProjectForceNotUseCache: SubForElmCmd<data.ProjectId>;
  readonly getIdeaSnapshotAndIdListByProjectId: SubForElmCmd<data.ProjectId>;
  readonly getIdea: SubForElmCmd<data.IdeaId>;

  readonly responseUserByAccessToken: CmdForElmSub<
    data.Maybe<data.UserSnapshotAndId>
  >;
  readonly keyPressed: CmdForElmSub<KeyboardEvent>;
  readonly keyPrevented: CmdForElmSub<null>;
  readonly windowResize: CmdForElmSub<{
    width: number;
    height: number;
  }>;
  readonly changeNetworkConnection: CmdForElmSub<boolean>;
  readonly subPointerUp: CmdForElmSub<null>;
  readonly getImageBlobResponse: CmdForElmSub<{
    blobUrl: string;
    fileHash: string;
  }>;
  readonly toValidProjectNameResponse: CmdForElmSub<{
    input: string;
    result: string | null;
  }>;
  readonly toValidIdeaNameResponse: CmdForElmSub<{
    input: string;
    result: string | null;
  }>;
  readonly createProjectResponse: CmdForElmSub<
    data.Maybe<data.ProjectSnapshotAndId>
  >;
  readonly responseCreateIdea: CmdForElmSub<data.Maybe<data.IdeaSnapshotAndId>>;
  readonly responseAllProjectId: CmdForElmSub<ReadonlyArray<data.ProjectId>>;
  readonly responseProject: CmdForElmSub<data.ProjectResponse>;
  readonly responseUser: CmdForElmSub<data.UserResponse>;
  readonly responseIdeaSnapshotAndIdListByProjectId: CmdForElmSub<{
    projectId: data.ProjectId;
    ideaSnapshotAndIdList: ReadonlyArray<data.IdeaSnapshotAndId>;
  }>;
  readonly responseIdea: CmdForElmSub<data.IdeaResponse>;
};

type SubForElmCmd<T> = {
  subscribe: (arg: (value: T) => void) => void;
};

type CmdForElmSub<T> = {
  send: (value: T) => void;
};
