/* eslint-disable max-classes-per-file */
import * as vscode from "vscode";

const getVscodeModule = (): Pick<
  typeof import("vscode"),
  | "Diagnostic"
  | "DiagnosticRelatedInformation"
  | "DiagnosticSeverity"
  | "Hover"
  | "Location"
  | "Position"
  | "Range"
  | "SemanticTokens"
  | "SemanticTokensLegend"
  | "TextEdit"
  | "Uri"
> & {
  readonly languages: Pick<
    typeof import("vscode").languages,
    | "createDiagnosticCollection"
    | "registerHoverProvider"
    | "registerDocumentFormattingEditProvider"
    | "registerDocumentSemanticTokensProvider"
  >;
} & {
  readonly workspace: Pick<
    typeof import("vscode").workspace,
    "onDidChangeTextDocument"
  >;
} => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require("vscode");
  } catch (error) {
    const DiagnosticSeverity: {
      readonly Error: vscode.DiagnosticSeverity.Error;
      readonly Warning: vscode.DiagnosticSeverity.Warning;
      readonly Information: vscode.DiagnosticSeverity.Information;
      readonly Hint: vscode.DiagnosticSeverity.Hint;
    } = {
      Error: 0,
      Warning: 1,
      Information: 2,
      Hint: 3,
    };

    return {
      Diagnostic: class Diagnostic {
        severity: vscode.DiagnosticSeverity = 0;

        constructor(
          public range: vscode.Range,
          public message: string,
          severity?: vscode.DiagnosticSeverity | undefined
        ) {
          if (severity !== undefined) {
            this.severity = severity;
          }
        }
      },
      DiagnosticRelatedInformation: class DiagnosticRelatedInformation {
        // eslint-disable-next-line no-useless-constructor
        constructor(public location: vscode.Location, public message: string) {}
      },
      DiagnosticSeverity,
      Hover: class Hover {
        contents: Array<vscode.MarkdownString>;

        constructor(
          contents: vscode.MarkdownString | Array<vscode.MarkdownString>,
          range?: vscode.Range | undefined
        ) {
          if (contents instanceof Array) {
            this.contents = contents;
          } else {
            this.contents = [contents];
          }
        }
      },
      Location: class Location {
        range: vscode.Range;

        constructor(
          public uri: vscode.Uri,
          rangeOrPosition: vscode.Position | vscode.Range
        ) {}
      },
      Position: class Position {
        readonly isBefore: vscode.Position["isBefore"];

        readonly isBeforeOrEqual: vscode.Position["isBeforeOrEqual"];

        readonly isAfter: vscode.Position["isAfter"];

        readonly isAfterOrEqual: vscode.Position["isAfterOrEqual"];

        readonly isEqual: vscode.Position["isEqual"];

        readonly compareTo: vscode.Position["compareTo"];

        readonly translate: vscode.Position["translate"];

        readonly with: vscode.Position["with"];

        // eslint-disable-next-line no-useless-constructor
        constructor(public line: number, public character: number) {}
      },
      Range: class Range {
        readonly start: vscode.Range["start"];

        readonly end: vscode.Range["end"];

        constructor(start: vscode.Position, end: vscode.Position) {
          this.start = start;
          this.end = end;
        }

        /**
         * `true` if `start` and `end` are equal.
         */
        isEmpty: vscode.Range["isEmpty"];

        /**
         * `true` if `start.line` and `end.line` are equal.
         */
        isSingleLine: vscode.Range["isSingleLine"];

        /**
         * Check if a position or a range is contained in this range.
         *
         * @param positionOrRange A position or a range.
         * @return `true` if the position or range is inside or equal
         * to this range.
         */
        contains(positionOrRange: vscode.Position | vscode.Range): boolean {}

        /**
         * Check if `other` equals this range.
         *
         * @param other A range.
         * @return `true` when start and end are {@link Position.isEqual equal} to
         * start and end of this range.
         */
        isEqual(other: vscode.Range): boolean;

        /**
         * Intersect `range` with this range and returns a new range or `undefined`
         * if the ranges have no overlap.
         *
         * @param range A range.
         * @return A range of the greater start and smaller end positions. Will
         * return undefined when there is no overlap.
         */
        intersection(range: vscode.Range): vscode.Range | undefined;

        /**
         * Compute the union of `other` with this range.
         *
         * @param other A range.
         * @return A range of smaller start position and the greater end position.
         */
        union(other: vscode.Range): Range;

        with(start?: vscode.Position, end?: vscode.Position): Range;
      },
      SemanticTokens: class SemanticTokens {
        resultId: string | undefined;

        constructor(public data: Uint32Array, resultId?: string) {
          this.resultId = resultId;
        }
      },
      SemanticTokensLegend: class SemanticTokensLegend {
        readonly tokenTypes: Array<string>;

        readonly tokenModifiers: Array<string>;

        constructor(tokenTypes: Array<string>, tokenModifiers?: Array<string>) {
          this.tokenTypes = tokenTypes;
          this.tokenModifiers =
            tokenModifiers === undefined ? [] : tokenModifiers;
        }
      },
      TextEdit: class TextEdit {
        /**
         * Utility to create a replace edit.
         *
         * @param range A range.
         * @param newText A string.
         * @return A new text edit object.
         */
        static replace(range: Range, newText: string): TextEdit;

        /**
         * Utility to create an insert edit.
         *
         * @param position A position, will become an empty range.
         * @param newText A string.
         * @return A new text edit object.
         */
        static insert(position: Position, newText: string): TextEdit;

        /**
         * Utility to create a delete edit.
         *
         * @param range A range.
         * @return A new text edit object.
         */
        static delete(range: Range): TextEdit;

        /**
         * Utility to create an eol-edit.
         *
         * @param eol An eol-sequence
         * @return A new text edit object.
         */
        static setEndOfLine(eol: EndOfLine): TextEdit;

        /**
         * The range this edit applies to.
         */
        range: Range;

        /**
         * The string this edit will insert.
         */
        newText: string;

        /**
         * The eol-sequence used in the document.
         *
         * *Note* that the eol-sequence will be applied to the
         * whole document.
         */
        newEol?: EndOfLine;

        /**
         * Create a new TextEdit.
         *
         * @param range A range.
         * @param newText A string.
         */
        constructor(range: vscode.Range, newText: string) {}
      },
      Uri: class Uri {
        static parse(value: string, strict?: boolean): Uri;

        static file(path: string): Uri;

        static joinPath(base: Uri, ...pathSegments: Array<string>): Uri;

        static from(components: {
          readonly scheme: string;
          readonly authority?: string;
          readonly path?: string;
          readonly query?: string;
          readonly fragment?: string;
        }): Uri;

        /**
         * Use the `file` and `parse` factory functions to create new `Uri` objects.
         */
        private constructor(
          scheme: string,
          authority: string,
          path: string,
          query: string,
          fragment: string
        );

        /**
         * Scheme is the `http` part of `http://www.example.com/some/path?query#fragment`.
         * The part before the first colon.
         */
        readonly scheme: string;

        /**
         * Authority is the `www.example.com` part of `http://www.example.com/some/path?query#fragment`.
         * The part between the first double slashes and the next slash.
         */
        readonly authority: string;

        /**
         * Path is the `/some/path` part of `http://www.example.com/some/path?query#fragment`.
         */
        readonly path: string;

        /**
         * Query is the `query` part of `http://www.example.com/some/path?query#fragment`.
         */
        readonly query: string;

        /**
         * Fragment is the `fragment` part of `http://www.example.com/some/path?query#fragment`.
         */
        readonly fragment: string;

        /**
         * The string representing the corresponding file system path of this Uri.
         *
         * Will handle UNC paths and normalize windows drive letters to lower-case. Also
         * uses the platform specific path separator.
         *
         * * Will *not* validate the path for invalid characters and semantics.
         * * Will *not* look at the scheme of this Uri.
         * * The resulting string shall *not* be used for display purposes but
         * for disk operations, like `readFile` et al.
         *
         * The *difference* to the {@linkcode Uri.path path}-property is the use of the platform specific
         * path separator and the handling of UNC paths. The sample below outlines the difference:
         * ```ts
         * const u = URI.parse('file://server/c$/folder/file.txt')
         * u.authority === 'server'
         * u.path === '/shares/c$/file.txt'
         * u.fsPath === '\\server\c$\folder\file.txt'
         * ```
         */
        readonly fsPath: string;

        /**
         * Derive a new Uri from this Uri.
         *
         * ```ts
         * let file = Uri.parse('before:some/file/path');
         * let other = file.with({ scheme: 'after' });
         * assert.ok(other.toString() === 'after:some/file/path');
         * ```
         *
         * @param change An object that describes a change to this Uri. To unset components use `null` or
         *  the empty string.
         * @return A new Uri that reflects the given change. Will return `this` Uri if the change
         *  is not changing anything.
         */
        with(change: {
          scheme?: string;
          authority?: string;
          path?: string;
          query?: string;
          fragment?: string;
        }): vscode.Uri {}

        toString(skipEncoding?: boolean) {
          return "wip";
        }

        toJSON() {
          return undefined;
        }
      },
      languages: {
        createDiagnosticCollection: (
          name: string | undefined
        ): vscode.DiagnosticCollection => {
          return {
            name: name === undefined ? "" : name,
            set() {},
            delete() {},
            clear() {},
            forEach() {},
            get() {
              return undefined;
            },
            has() {
              return false;
            },
            dispose() {},
          };
        },
        registerHoverProvider: () => {
          return { dispose() {} };
        },
        registerDocumentFormattingEditProvider: () => {
          return { dispose() {} };
        },
        registerDocumentSemanticTokensProvider: () => {
          return { dispose() {} };
        },
      },
      workspace: {
        onDidChangeTextDocument: () => {
          return { dispose() {} };
        },
      },
    };
  }
};
const vscodeModule = getVscodeModule();

export const newRange =
  (start: vscode.Position) =>
  (end: vscode.Position): vscode.Range => {
    return new vscodeModule.Range(start, end);
  };

export const rangeGetStart = (range: vscode.Range): vscode.Position => {
  return range.start;
};

export const rangeGetEnd = (range: vscode.Range): vscode.Position => {
  return range.end;
};

export const rangeContains =
  (position: vscode.Position) =>
  (range: vscode.Range): boolean => {
    return range.contains(position);
  };

export const rangeEqual =
  (a: vscode.Range) =>
  (b: vscode.Range): boolean => {
    return a.isEqual(b);
  };

export const newPosition =
  (line: number) =>
  (character: number): vscode.Position => {
    return new vscodeModule.Position(line, character);
  };

export const positionGetLine = (position: vscode.Position): number => {
  return position.line;
};

export const positionGetCharacter = (position: vscode.Position): number => {
  return position.character;
};

export const positionTranslateCharacter =
  (characterDelta: number) =>
  (position: vscode.Position): vscode.Position => {
    return position.translate(0, characterDelta);
  };

export const languagesCreateDiagnosticCollection =
  (name: string) => (): vscode.DiagnosticCollection => {
    return vscodeModule.languages.createDiagnosticCollection(name);
  };

export const diagnosticCollectionSet =
  (
    diagnosticsData: ReadonlyArray<{
      readonly uri: vscode.Uri;
      readonly diagnosticList: ReadonlyArray<vscode.Diagnostic>;
    }>
  ) =>
  (diagnosticCollection: vscode.DiagnosticCollection): void => {
    diagnosticCollection.set(
      diagnosticsData.map(({ uri, diagnosticList }) => [uri, diagnosticList])
    );
  };

export const newDiagnostic =
  (range: vscode.Range) =>
  (message: string) =>
  (
    relatedInformation: ReadonlyArray<vscode.DiagnosticRelatedInformation>
  ): vscode.Diagnostic => {
    const diagnostic = new vscodeModule.Diagnostic(
      range,
      message,
      vscodeModule.DiagnosticSeverity.Error
    );
    diagnostic.relatedInformation = [...relatedInformation];
    return diagnostic;
  };

export const newDiagnosticRelatedInformation =
  (location: vscode.Location) =>
  (message: string): vscode.DiagnosticRelatedInformation => {
    return new vscodeModule.DiagnosticRelatedInformation(location, message);
  };

export const newLocation =
  (uri: vscode.Uri) =>
  (range: vscode.Range): vscode.Location => {
    return new vscodeModule.Location(uri, range);
  };

export const languagesRegisterDocumentFormattingEditProvider =
  (option: {
    readonly languageId: string;
    readonly formatFunc: (code: string) => string;
  }) =>
  (): void => {
    vscodeModule.languages.registerDocumentFormattingEditProvider(
      option.languageId,
      {
        provideDocumentFormattingEdits(document) {
          const fullText = document.getText();
          return [
            vscodeModule.TextEdit.replace(
              document.validateRange(
                new vscodeModule.Range(
                  new vscodeModule.Position(0, 0),
                  new vscodeModule.Position(document.lineCount, 0)
                )
              ),
              option.formatFunc(fullText)
            ),
          ];
        },
      }
    );
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
    vscodeModule.languages.registerDocumentSemanticTokensProvider(
      option.languageId,
      {
        provideDocumentSemanticTokens(document) {
          return new vscodeModule.SemanticTokens(
            new Uint32Array(
              option.semanticTokensProviderFunc(document.getText())
            )
          );
        },
      },
      new vscodeModule.SemanticTokensLegend([
        ...option.semanticTokensProviderLegend,
      ])
    );
  };

export const languagesRegisterHoverProvider =
  (option: {
    readonly languageId: string;
    readonly func: (funcInput: {
      readonly code: string;
      readonly position: vscode.Position;
    }) => {
      readonly contents: string;
      readonly range: vscode.Range;
    } | null;
  }) =>
  () => {
    vscodeModule.languages.registerHoverProvider(option.languageId, {
      provideHover(document, position) {
        const result = option.func({ code: document.getText(), position });
        if (result === null) {
          return undefined;
        }
        return new vscodeModule.Hover(result.contents, result.range);
      },
    });
  };

export const workspaceOnDidChangeTextDocument =
  (
    callback: (data: {
      readonly languageId: string;
      readonly uri: vscode.Uri;
      readonly code: string;
    }) => void
  ) =>
  () => {
    vscodeModule.workspace.onDidChangeTextDocument(
      (textDocumentChangeEvent) => {
        callback({
          languageId: textDocumentChangeEvent.document.languageId,
          uri: textDocumentChangeEvent.document.uri,
          code: textDocumentChangeEvent.document.getText(),
        });
      }
    );
  };
