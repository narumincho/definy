import {
  DiagnosticCollection,
  Hover,
  Position,
  Range,
  SemanticTokens,
  SemanticTokensLegend,
  TextEdit,
  languages,
  workspace,
} from "vscode";

export const newRange =
  (start: Position) =>
  (end: Position): Range => {
    return new Range(start, end);
  };

export const rangeGetStart = (range: Range): Position => {
  return range.start;
};

export const rangeGetEnd = (range: Range): Position => {
  return range.end;
};

export const rangeContains =
  (position: Position) =>
  (range: Range): boolean => {
    return range.contains(position);
  };

export const rangeEqual =
  (a: Range) =>
  (b: Range): boolean => {
    return a.isEqual(b);
  };

export const newPosition =
  (line: number) =>
  (character: number): Position => {
    return new Position(line, character);
  };

export const positionGetLine = (position: Position): number => {
  return position.line;
};

export const positionGetCharacter = (position: Position): number => {
  return position.character;
};

export const positionTranslateCharacter =
  (characterDelta: number) =>
  (position: Position): Position => {
    return position.translate(0, characterDelta);
  };

export const languagesCreateDiagnosticCollection =
  (name: string) => (): DiagnosticCollection => {
    return languages.createDiagnosticCollection(name);
  };

export const languagesRegisterDocumentFormattingEditProvider =
  (option: {
    readonly languageId: string;
    readonly formatFunc: (code: string) => string;
  }) =>
  (): void => {
    languages.registerDocumentFormattingEditProvider(option.languageId, {
      provideDocumentFormattingEdits(document) {
        const fullText = document.getText();
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

export const languagesRegisterDocumentSemanticTokensProvider =
  (option: {
    readonly languageId: string;
    readonly semanticTokensProviderFunc: (
      code: string
    ) => ReadonlyArray<number>;
    readonly semanticTokensProviderLegend: ReadonlyArray<string>;
  }) =>
  (): void => {
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

export const languagesRegisterHoverProvider =
  (option: {
    readonly languageId: string;
    readonly func: (funcInput: {
      readonly code: string;
      readonly position: Position;
    }) => {
      readonly markdown: string;
      readonly range: Range;
    };
  }) =>
  () => {
    languages.registerHoverProvider(option.languageId, {
      provideHover(document, position) {
        const result = option.func({ code: document.getText(), position });
        return new Hover(result.markdown, result.range);
      },
    });
  };

export const workspaceOnDidChangeTextDocument =
  (option: {
    callback: (data: {
      readonly languageId: string;
      readonly code: string;
    }) => void;
  }) =>
  () => {
    workspace.onDidChangeTextDocument((textDocumentChangeEvent) => {
      option.callback({
        languageId: textDocumentChangeEvent.document.languageId,
        code: textDocumentChangeEvent.document.getText(),
      });
    });
  };
