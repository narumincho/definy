import { type ExtensionContext, commands, workspace } from "vscode";
import { LanguageClient, NodeModule } from "vscode-languageclient/node";

// eslint-disable-next-line no-undef-init
let client: LanguageClient | undefined = undefined;

export const activateFunc = (context: ExtensionContext): void => {
  commands.registerCommand("definy.showEvaluatedValue", (value: string) => {
    workspace.openTextDocument({
      language: "definy",
      content: value,
    });
  });

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
};

export const deactivateFunc = (): Promise<void> | undefined => {
  if (client !== undefined) {
    return client.stop();
  }
};
