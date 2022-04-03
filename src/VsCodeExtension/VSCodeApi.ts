import {
  CompletionItem,
  CompletionItemKind,
  CompletionList,
  Diagnostic,
  DiagnosticCollection,
  DiagnosticRelatedInformation,
  DiagnosticSeverity,
  Hover,
  Location,
  MarkdownString,
  ParameterInformation,
  Position,
  Range,
  SemanticTokens,
  SemanticTokensLegend,
  SignatureHelp,
  SignatureInformation,
  SnippetString,
  TextEdit,
  Uri,
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

export const diagnosticCollectionSet =
  (
    diagnosticsData: ReadonlyArray<{
      readonly uri: Uri;
      readonly diagnosticList: ReadonlyArray<Diagnostic>;
    }>
  ) =>
  (diagnosticCollection: DiagnosticCollection): void => {
    diagnosticCollection.set(
      diagnosticsData.map(({ uri, diagnosticList }) => [uri, diagnosticList])
    );
  };

export const newDiagnostic =
  (range: Range) =>
  (message: string) =>
  (
    relatedInformation: ReadonlyArray<DiagnosticRelatedInformation>
  ): Diagnostic => {
    const diagnostic = new Diagnostic(range, message, DiagnosticSeverity.Error);
    diagnostic.relatedInformation = [...relatedInformation];
    return diagnostic;
  };

export const newDiagnosticRelatedInformation =
  (location: Location) =>
  (message: string): DiagnosticRelatedInformation => {
    return new DiagnosticRelatedInformation(location, message);
  };

export const newLocation =
  (uri: Uri) =>
  (range: Range): Location => {
    return new Location(uri, range);
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
      readonly contents: string;
      readonly range: Range;
    } | null;
  }) =>
  () => {
    languages.registerHoverProvider(option.languageId, {
      provideHover(document, position) {
        const result = option.func({ code: document.getText(), position });
        if (result === null) {
          return undefined;
        }
        return new Hover(result.contents, result.range);
      },
    });
  };

export const languagesRegisterCompletionItemProvider =
  (option: {
    readonly languageId: string;
    readonly func: (input: {
      readonly code: string;
      readonly position: Position;
    }) => ReadonlyArray<{
      readonly label: string;
      readonly description: string;
      readonly detail: string;
      readonly kind: CompletionItemKind;
      readonly documentation: string;
      readonly commitCharacters: ReadonlyArray<string>;
      readonly insertText: string;
    }>;
    readonly triggerCharacters: ReadonlyArray<string>;
  }) =>
  () => {
    languages.registerCompletionItemProvider(
      option.languageId,
      {
        provideCompletionItems(document, position) {
          return new CompletionList(
            option.func({ code: document.getText(), position }).map((item) => {
              const completionItem = new CompletionItem(
                {
                  label: item.label,
                  description: item.description,
                  detail: item.detail,
                },
                item.kind
              );
              completionItem.documentation = new MarkdownString(
                item.documentation
              );

              completionItem.commitCharacters = [...item.commitCharacters];
              completionItem.insertText = new SnippetString(item.insertText);
              return completionItem;
            })
          );
        },
      },
      ...option.triggerCharacters
    );
  };

export const completionItemKindFunction = CompletionItemKind.Function;
export const completionItemKindModule = CompletionItemKind.Module;

export const languageRegisterSignatureHelpProvider =
  (option: {
    readonly languageId: string;
    readonly func: (input: {
      readonly code: string;
      readonly position: Position;
    }) => {
      readonly signatures: ReadonlyArray<{
        readonly label: string;
        readonly documentation: string;
        readonly parameters: ReadonlyArray<{
          readonly label: string;
          readonly documentation: string;
        }>;
      }>;
      readonly activeSignature: number;
      readonly activeParameter: number;
    };
    readonly triggerCharacters: ReadonlyArray<string>;
  }) =>
  () => {
    languages.registerSignatureHelpProvider(
      option.languageId,
      {
        provideSignatureHelp(document, position) {
          const result = option.func({ code: document.getText(), position });
          const signatureHelp = new SignatureHelp();
          signatureHelp.activeSignature = result.activeSignature;
          signatureHelp.activeParameter = result.activeParameter;
          signatureHelp.signatures = result.signatures.map((signature) => {
            const signatureInformation = new SignatureInformation(
              signature.label,
              signature.documentation
            );
            signatureInformation.parameters = signature.parameters.map(
              (parameter) =>
                new ParameterInformation(
                  parameter.label,
                  new MarkdownString(parameter.documentation)
                )
            );
            return signatureInformation;
          });
          return signatureHelp;
        },
      },
      { triggerCharacters: option.triggerCharacters, retriggerCharacters: [] }
    );
  };

export const languageRegisterDefinitionProvider =
  (option: {
    readonly languageId: string;
    readonly func: (input: {
      readonly code: string;
      readonly uri: Uri;
      readonly position: Position;
    }) => Location | null;
  }) =>
  () => {
    languages.registerDefinitionProvider(option.languageId, {
      provideDefinition(document, position) {
        return option.func({
          code: document.getText(),
          uri: document.uri,
          position,
        });
      },
    });
  };

export const workspaceOnDidChangeTextDocument =
  (
    callback: (data: {
      readonly languageId: string;
      readonly uri: Uri;
      readonly code: string;
    }) => void
  ) =>
  () => {
    workspace.onDidChangeTextDocument((textDocumentChangeEvent) => {
      callback({
        languageId: textDocumentChangeEvent.document.languageId,
        uri: textDocumentChangeEvent.document.uri,
        code: textDocumentChangeEvent.document.getText(),
      });
    });
  };
