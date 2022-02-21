import { type ExtensionContext, commands, window } from "vscode";
import { LanguageClient } from "vscode-languageclient/node";

// eslint-disable-next-line no-undef-init
let client: LanguageClient | undefined = undefined;

export const activateFunc = (context: ExtensionContext): void => {
  commands.registerCommand("definy.testCommand", () => {
    window.showInformationMessage("コマンドを呼ばれた!");
  });

  client = new LanguageClient(
    "definy-lsp",
    {
      command: "node",
      args: [context.extensionPath + "/lsp.js"],
    },
    {
      documentSelector: [{ scheme: "file", language: "definy" }],
    }
  );
  context.subscriptions.push(client.start());
};

export const deactivateFunc = (): Promise<void> | undefined => {
  if (client !== undefined) {
    return client.stop();
  }
};
