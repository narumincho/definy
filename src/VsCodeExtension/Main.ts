import {
  type ExtensionContext,
  Position,
  Range,
  TextEdit,
  commands,
  languages,
  workspace,
} from "vscode";
import { LanguageClient, NodeModule } from "vscode-languageclient/node";

// eslint-disable-next-line no-undef-init
let client: LanguageClient | undefined = undefined;

export const activateFunc =
  (option: { formatFunc: (code: string) => string }) =>
  (context: ExtensionContext): void => {
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

    languages.registerDocumentFormattingEditProvider("definy", {
      provideDocumentFormattingEdits(document) {
        const fullText = document.getText();
        console.log(fullText);
        return [
          TextEdit.replace(
            document.validateRange(
              new Range(new Position(0, 0), new Position(document.lineCount, 0))
            ),
            option.formatFunc(fullText)
          ),
        ];
      },
    });
  };

export const deactivateFunc = (): Promise<void> | undefined => {
  if (client !== undefined) {
    return client.stop();
  }
};
