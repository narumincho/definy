import type { ExtensionContext } from "vscode";
import { LanguageClient } from "vscode-languageclient/node";

// eslint-disable-next-line no-undef-init
let client: LanguageClient | undefined = undefined;

export const activate = (context: ExtensionContext): void => {
  client = new LanguageClient(
    "definy-lsp",
    {
      command: "node",
      args: [context.extensionPath + "/definy.js", "--language-server"],
    },
    {
      documentSelector: [{ scheme: "file", language: "definy" }],
    }
  );
  context.subscriptions.push(client.start());
};

export const deactivate = (): Promise<void> | undefined => {
  if (client !== undefined) {
    return client.stop();
  }
};
