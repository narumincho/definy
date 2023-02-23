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

export type Context = {
  something: "???";
};

export type TextDocument = {
  getText: () => string;
};

export type WebviewPanel = {
  title: string;
  readonly webview: {
    html: string;
  };
};

export const importVscode = (): VSCodeApi | undefined => {
  const require =
    (globalThis as unknown as { require: (path: "vscode") => VSCodeApi })
      .require;
  if (typeof require === "undefined") {
    return;
  }
  const path = "vscode";
  return require(path);
};
