import * as common from "definy-common";

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
  windowSize: {
    width: number;
    height: number;
  };
  urlData: common.data.UrlData;
  networkConnection: boolean;
};

type Ports = {
  readonly preventDefaultBeforeKeyEvent: SubForElmCmd<null>;
  readonly requestAccessTokenFromIndexedDB: SubForElmCmd<null>;
  readonly writeAccessTokenToIndexedDB: SubForElmCmd<string>;
  readonly consoleLog: SubForElmCmd<string>;
  readonly requestLogInUrl: SubForElmCmd<
    common.data.RequestLogInUrlRequestData
  >;
  readonly keyPressed: CmdForElmSub<KeyboardEvent>;
  readonly keyPrevented: CmdForElmSub<null>;
  readonly windowResize: CmdForElmSub<{
    width: number;
    height: number;
  }>;
  readonly portResponseAccessTokenFromIndexedDB: CmdForElmSub<string | null>;
  readonly changeNetworkConnection: CmdForElmSub<boolean>;
  readonly subPointerUp: CmdForElmSub<null>;
};

type SubForElmCmd<T> = {
  subscribe: (arg: (value: T) => void) => void;
};

type CmdForElmSub<T> = {
  send: (value: T) => void;
};
