import { data } from "definy-common";

export namespace Elm {
  namespace Main {
    function init(args: {
      readonly flags: Flags;
      readonly node: HTMLElement;
    }): {
      readonly ports: Ports;
    };
  }
}

type Flags = {
  readonly windowSize: {
    readonly width: number;
    readonly height: number;
  };
  readonly nowTime: data.Time;
  readonly accessTokenMaybe: null | string;
  readonly networkConnection: boolean;
};

type Ports = {
  readonly preventDefaultBeforeKeyEvent: SubForElmCmd<null>;
  readonly consoleLog: SubForElmCmd<string>;
  readonly requestLogInUrl: SubForElmCmd<data.RequestLogInUrlRequestData>;
  readonly getUserByAccessToken: SubForElmCmd<data.AccessToken>;
  readonly getImageBlobUrl: SubForElmCmd<data.ImageToken>;
  readonly createProject: SubForElmCmd<data.CreateProjectParameter>;
  readonly createIdea: SubForElmCmd<data.CreateIdeaParameter>;
  readonly addComment: SubForElmCmd<data.AddCommentParameter>;
  readonly addSuggestion: SubForElmCmd<data.AddSuggestionParameter>;

  readonly toValidProjectName: SubForElmCmd<string>;
  readonly toValidIdeaName: SubForElmCmd<string>;
  readonly toValidTypePartName: SubForElmCmd<string>;

  readonly getUser: SubForElmCmd<data.UserId>;
  readonly getUserNoCache: SubForElmCmd<data.UserId>;
  readonly getAllProjectIdList: SubForElmCmd<null>;
  readonly getProject: SubForElmCmd<data.ProjectId>;
  readonly getProjectNoCache: SubForElmCmd<data.ProjectId>;
  readonly getProjectForceNotUseCache: SubForElmCmd<data.ProjectId>;
  readonly getIdeaAndIdListByProjectId: SubForElmCmd<data.ProjectId>;
  readonly getIdea: SubForElmCmd<data.IdeaId>;
  readonly getIdeaNoCache: SubForElmCmd<data.IdeaId>;
  readonly getSuggestion: SubForElmCmd<data.SuggestionId>;
  readonly getSuggestionNoCache: SubForElmCmd<data.SuggestionId>;

  readonly responseUserByAccessToken: CmdForElmSub<
    data.Maybe<data.UserSnapshotAndId>
  >;
  readonly keyPressed: CmdForElmSub<KeyboardEvent>;
  readonly keyPrevented: CmdForElmSub<null>;
  readonly windowResize: CmdForElmSub<{
    readonly width: number;
    readonly height: number;
  }>;
  readonly changeNetworkConnection: CmdForElmSub<boolean>;
  readonly subPointerUp: CmdForElmSub<null>;
  readonly getImageBlobResponse: CmdForElmSub<{
    readonly blobUrl: string;
    readonly imageToken: string;
  }>;
  readonly toValidProjectNameResponse: CmdForElmSub<{
    readonly input: string;
    readonly result: string | null;
  }>;
  readonly toValidIdeaNameResponse: CmdForElmSub<{
    readonly input: string;
    readonly result: string | null;
  }>;
  readonly toValidTypePartNameResponse: CmdForElmSub<{
    readonly input: string;
    readonly result: string | null;
  }>;
  readonly createProjectResponse: CmdForElmSub<
    data.Maybe<data.ProjectSnapshotAndId>
  >;
  readonly responseCreateIdea: CmdForElmSub<data.Maybe<data.IdeaSnapshotAndId>>;
  readonly responseAllProjectId: CmdForElmSub<ReadonlyArray<data.ProjectId>>;
  readonly responseProject: CmdForElmSub<data.ProjectResponse>;
  readonly responseUser: CmdForElmSub<data.UserResponse>;
  readonly responseAddComment: CmdForElmSub<data.IdeaResponse>;
  readonly responseAddSuggestion: CmdForElmSub<
    data.Maybe<data.SuggestionSnapshotAndId>
  >;
  readonly responseIdeaSnapshotAndIdListByProjectId: CmdForElmSub<
    data.IdeaListByProjectIdResponse
  >;
  readonly responseIdea: CmdForElmSub<data.IdeaResponse>;
  readonly responseSuggestion: CmdForElmSub<data.SuggestionResponse>;
};

type SubForElmCmd<T> = {
  readonly subscribe: (arg: (value: T) => void) => void;
};

type CmdForElmSub<T> = {
  readonly send: (value: T) => void;
};
