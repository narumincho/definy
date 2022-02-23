import { type ExtensionContext, commands, window } from "vscode";
import { LanguageClient } from "vscode-languageclient/browser";

// eslint-disable-next-line no-undef-init
let client: LanguageClient | undefined = undefined;

export const activateFunc =
  (languageServerFileName: string) =>
  (context: ExtensionContext): void => {
    commands.registerCommand("definy.testCommand", () => {
      console.log("called definy.testCommand !");
      window.showInformationMessage("コマンドを呼ばれた!");
    });

    client = new LanguageClient(
      "definy-language-server",
      "definy language server",
      {
        documentSelector: [{ language: "definy" }],
        synchronize: {},
        initializationOptions: {},
      },
      new Worker(context.asAbsolutePath(languageServerFileName))
    );
    context.subscriptions.push(client.start());

    client.onReady().then(() => {
      console.log("definy-web-extension server is ready");
    });
  };

export const deactivateFunc = (): Promise<void> | undefined => {
  if (client !== undefined) {
    return client.stop();
  }
};
