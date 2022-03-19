import {
  Position,
  Range,
  SemanticTokens,
  SemanticTokensLegend,
  TextEdit,
  commands,
  languages,
  workspace,
} from "vscode";

export const activateFunc =
  (option: {
    readonly languageId: string;
    readonly formatFunc: (code: string) => string;
    readonly semanticTokensProviderFunc: (
      code: string
    ) => ReadonlyArray<number>;
    readonly semanticTokensProviderLegend: ReadonlyArray<string>;
  }) =>
  (): void => {
    commands.registerCommand("definy.showEvaluatedValue", (value: string) => {
      workspace.openTextDocument({
        language: "definy",
        content: value,
      });
    });

    languages.registerDocumentFormattingEditProvider(option.languageId, {
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

    languages.registerDocumentSemanticTokensProvider(
      option.languageId,
      {
        provideDocumentSemanticTokens(document) {
          return new SemanticTokens(
            new Uint32Array(
              option.semanticTokensProviderFunc(document.getText())
            )
          );
        },
      },
      new SemanticTokensLegend([...option.semanticTokensProviderLegend])
    );
  };

export const deactivateFunc = (): Promise<void> => {
  return Promise.resolve();
};
