export type VSCodeApi = {
  readonly commands: {
    readonly registerCommand: (id: string, callback: () => void) => void;
  };
  readonly window: {
    readonly registerCustomEditorProvider: (id: string, provider: {
      readonly resolveCustomTextEditor: (
        document: TextDocument,
        webviewPanel: WebviewPanel,
      ) => void;
    }) => void;
  };
};

export type Context = {};

export type TextDocument = {
  getText: () => string;
};

export type WebviewPanel = {
  title: string;
  readonly webview: {
    html: string;
  };
};

declare global {
  const require: ((path: "vscode") => VSCodeApi) | undefined;
}

export const importVscode = (): VSCodeApi | undefined => {
  if (typeof require === "undefined") {
    return;
  }
  const path = "vscode";
  return require(path);
};
