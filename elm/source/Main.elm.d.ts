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
  readonly urlData: data.UrlData;
  readonly networkConnection: boolean;
};

type Ports = {
  readonly preventDefaultBeforeKeyEvent: SubForElmCmd<null>;
  readonly consoleLog: SubForElmCmd<string>;
  readonly requestLogInUrl: SubForElmCmd<data.RequestLogInUrlRequestData>;
  readonly getUserByAccessToken: SubForElmCmd<data.AccessToken>;
  readonly getImageBlobUrl: SubForElmCmd<data.FileHash>;
  readonly pushUrl: SubForElmCmd<data.UrlData>;
  readonly createProject: SubForElmCmd<data.CreateProjectParameter>;
  readonly toValidProjectName: SubForElmCmd<string>;

  readonly responseUserByAccessToken: CmdForElmSub<
    data.Maybe<data.UserPublicAndUserId>
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
  readonly urlChanged: CmdForElmSub<data.UrlData>;
  readonly toValidProjectNameResponse: CmdForElmSub<{
    input: string;
    result: string | null;
  }>;
};

type SubForElmCmd<T> = {
  subscribe: (arg: (value: T) => void) => void;
};

type CmdForElmSub<T> = {
  send: (value: T) => void;
};
