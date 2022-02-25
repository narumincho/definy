import { type ExtensionContext, commands, window } from "vscode";
import { LanguageClient, NodeModule } from "vscode-languageclient/node";

// eslint-disable-next-line no-undef-init
let client: LanguageClient | undefined = undefined;

export const activateFunc = (context: ExtensionContext): void => {
  commands.registerCommand("definy.showEvaluatedValue", (value: string) => {
    console.log("called definy.testCommand !");
    window.showInformationMessage(`評価結果 ${value}`);
  });
  window.showInformationMessage("definy VSCode 拡張機能が起動できた");

  const nodeModule: NodeModule = {
    module: context.asAbsolutePath("language-server.js"),
  };
  client = new LanguageClient(
    "definy-language-server",
    {
      run: nodeModule,
      debug: nodeModule,
    },
    {
      documentSelector: [{ language: "definy" }],
    }
  );
  context.subscriptions.push(client.start());
  client.onReady().then(() => {
    window.showInformationMessage("definy language client を起動できた");
  });
};

export const deactivateFunc = (): Promise<void> | undefined => {
  if (client !== undefined) {
    return client.stop();
  }
};
