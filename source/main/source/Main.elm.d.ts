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
  url: string;
  windowSize: {
    width: number;
    height: number;
  };
  language: common.data.Language;
  networkConnection: boolean;
  indexedDBSupport: boolean;
  webGLSupport: boolean;
  serviceWorkerSupport: boolean;
};

type Ports = {
  readonly preventDefaultBeforeKeyEvent: SubForElmCmd<null>;
  readonly requestAccessTokenFromIndexedDB: SubForElmCmd<null>;
  readonly writeAccessTokenToIndexedDB: SubForElmCmd<string>;
  readonly consoleLog: SubForElmCmd<string>;
  readonly keyPressed: CmdForElmSub<KeyboardEvent>;
  readonly keyPrevented: CmdForElmSub<null>;
  readonly windowResize: CmdForElmSub<{
    width: number;
    height: number;
  }>;
  readonly portResponseAccessTokenFromIndexedDB: CmdForElmSub<string | null>;
  readonly changeLanguage: CmdForElmSub<string>;
  readonly subPointerUp: CmdForElmSub<null>;
  readonly changeNetworkConnection: CmdForElmSub<boolean>;
  readonly serviceWorkerRegisterError: CmdForElmSub<null>;
  readonly serviceWorkerLoadingOfflineFiles: CmdForElmSub<null>;
  readonly serviceWorkerActivatedWithOfflineFiles: CmdForElmSub<null>;
  readonly serviceWorkerActivatedWithOutOfflineFiles: CmdForElmSub<null>;
};

type SubForElmCmd<T> = {
  subscribe: (arg: (value: T) => void) => void;
};

type CmdForElmSub<T> = {
  send: (value: T) => void;
};
