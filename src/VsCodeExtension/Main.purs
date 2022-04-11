module VsCodeExtension.Main
  ( activate
  , deactivate
  ) where

import Prelude
import Data.Array as Array
import Data.Maybe (Maybe(..))
import Data.Nullable as Nullable
import Data.String.NonEmpty as NonEmptyString
import Data.UInt as UInt
import Effect (Effect)
import Effect.Uncurried as EffectUncurried
import Markdown as Markdown
import Prelude as Prelude
import VsCodeExtension.Completion as Completion
import VsCodeExtension.Definition as Definition
import VsCodeExtension.Error as Error
import VsCodeExtension.Evaluate as Evaluate
import VsCodeExtension.Hover as Hover
import VsCodeExtension.LanguageId as LanguageId
import VsCodeExtension.Parser as Parser
import VsCodeExtension.Range as Range
import VsCodeExtension.Reference as Reference
import VsCodeExtension.SemanticToken as SemanticToken
import VsCodeExtension.SignatureHelp as SignatureHelp
import VsCodeExtension.SimpleToken as SimpleToken
import VsCodeExtension.Symbol as Symbol
import VsCodeExtension.ToString as ToString
import VsCodeExtension.TokenType as TokenType
import VsCodeExtension.Tokenize as Tokenize
import VsCodeExtension.VSCodeApi as VSCodeApi

activate :: Effect Unit
activate = do
  diagnosticCollection <- VSCodeApi.languagesCreateDiagnosticCollection "definy-error"
  VSCodeApi.languagesRegisterDocumentFormattingEditProvider
    { languageId: LanguageId.languageId
    , formatFunc:
        \code ->
          ToString.evaluatedTreeToString
            ( Evaluate.codeTreeToEvaluatedTreeIContextNormal
                ( Parser.parse
                    (SimpleToken.tokenListToSimpleTokenList (Tokenize.tokenize code))
                )
            )
    }
  VSCodeApi.languagesRegisterDocumentSemanticTokensProvider
    { languageId: LanguageId.languageId
    , semanticTokensProviderFunc:
        \code ->
          tokenDataListToDataList
            ( SemanticToken.evaluateTreeToTokenData
                ( Evaluate.codeTreeToEvaluatedTreeIContextNormal
                    ( Parser.parse
                        (SimpleToken.tokenListToSimpleTokenList (Tokenize.tokenize code))
                    )
                )
            )
    , semanticTokensProviderLegend: TokenType.useTokenTypesAsStringArray
    }
  VSCodeApi.languagesRegisterHoverProvider
    { languageId: LanguageId.languageId
    , func:
        \{ code, position } ->
          hoverToVscodeHover
            ( Hover.getHoverData (vsCodePositionToPosition position)
                ( Evaluate.codeTreeToEvaluatedTreeIContextNormal
                    ( Parser.parse
                        (SimpleToken.tokenListToSimpleTokenList (Tokenize.tokenize code))
                    )
                )
            )
    }
  VSCodeApi.languagesRegisterCompletionItemProvider
    { languageId: LanguageId.languageId
    , func:
        \{ code, position } ->
          Prelude.map
            completionItemToVsCodeCompletionItem
            ( Completion.getCompletionList
                { tree:
                    Evaluate.codeTreeToEvaluatedTreeIContextNormal
                      ( Parser.parse
                          (SimpleToken.tokenListToSimpleTokenList (Tokenize.tokenize code))
                      )
                , position: vsCodePositionToPosition position
                }
            )
    , triggerCharacters: Completion.triggerCharacters
    }
  VSCodeApi.languageRegisterSignatureHelpProvider
    { languageId: LanguageId.languageId
    , func:
        \{ code, position } -> case SignatureHelp.getSignatureHelp
            { tree:
                Evaluate.codeTreeToEvaluatedTreeIContextNormal
                  ( Parser.parse
                      (SimpleToken.tokenListToSimpleTokenList (Tokenize.tokenize code))
                  )
            , position: vsCodePositionToPosition position
            } of
          Just result ->
            Nullable.notNull
              { signatures:
                  [ { label: result.label
                    , documentation: Markdown.toMarkdownString result.documentation
                    , parameters: result.parameters
                    }
                  ]
              , activeSignature: UInt.fromInt 0
              , activeParameter: result.activeParameter
              }
          Nothing -> Nullable.null
    , triggerCharacters: SignatureHelp.triggerCharacters
    }
  VSCodeApi.languageRegisterDefinitionProvider
    { languageId: LanguageId.languageId
    , func:
        \{ code, uri, position } ->
          Nullable.toNullable
            ( Prelude.map
                (\range -> VSCodeApi.newLocation uri (rangeToVsCodeRange range))
                ( Definition.getDefinitionLocation
                    (vsCodePositionToPosition position)
                    ( Evaluate.codeTreeToEvaluatedTreeIContextNormal
                        ( Parser.parse
                            (SimpleToken.tokenListToSimpleTokenList (Tokenize.tokenize code))
                        )
                    )
                )
            )
    }
  VSCodeApi.languagesRegisterDocumentSymbolProvider
    { languageId: LanguageId.languageId
    , func:
        \{ code, uri } ->
          Prelude.map
            ( \{ name, range } ->
                { name
                , location: VSCodeApi.newLocation uri (rangeToVsCodeRange range)
                }
            )
            ( Symbol.getSymbolAndRangeList
                ( Evaluate.codeTreeToEvaluatedTreeIContextNormal
                    ( Parser.parse
                        (SimpleToken.tokenListToSimpleTokenList (Tokenize.tokenize code))
                    )
                )
            )
    }
  VSCodeApi.languagesRegisterReferenceProvider
    { languageId: LanguageId.languageId
    , func:
        \{ code, uri, position } ->
          Prelude.map
            ( \range ->
                VSCodeApi.newLocation uri (rangeToVsCodeRange range)
            )
            ( Reference.getReference
                (vsCodePositionToPosition position)
                ( Evaluate.codeTreeToEvaluatedTreeIContextNormal
                    ( Parser.parse
                        (SimpleToken.tokenListToSimpleTokenList (Tokenize.tokenize code))
                    )
                )
            )
    }
  VSCodeApi.workspaceOnDidChangeTextDocument
    (getWorkspaceTextDocumentsAndSendError diagnosticCollection)
  VSCodeApi.workspaceOnDidOpenTextDocument
    (getWorkspaceTextDocumentsAndSendError diagnosticCollection)
  getWorkspaceTextDocumentsAndSendError diagnosticCollection

getWorkspaceTextDocumentsAndSendError :: VSCodeApi.DiagnosticCollection -> Effect Unit
getWorkspaceTextDocumentsAndSendError diagnosticCollection =
  VSCodeApi.workspaceTextDocuments
    ( EffectUncurried.mkEffectFn1 \codeDataList ->
        sendError
          diagnosticCollection
          codeDataList
    )

sendError ::
  VSCodeApi.DiagnosticCollection ->
  Array { languageId :: String, uri :: VSCodeApi.Uri, code :: String } ->
  Effect Unit
sendError diagnosticCollection codeDataList =
  VSCodeApi.diagnosticCollectionSet
    (Array.mapMaybe codeDataToDiagnosticList codeDataList)
    diagnosticCollection

codeDataToDiagnosticList ::
  { languageId :: String, uri :: VSCodeApi.Uri, code :: String } ->
  Maybe { diagnosticList ∷ Array VSCodeApi.Diagnostic, uri ∷ VSCodeApi.Uri }
codeDataToDiagnosticList { languageId, uri, code } =
  if eq languageId (NonEmptyString.toString LanguageId.languageId) then
    Just
      { diagnosticList:
          evaluatedTreeToDiagnosticList uri
            ( Evaluate.codeTreeToEvaluatedTreeIContextNormal
                ( Parser.parse
                    (SimpleToken.tokenListToSimpleTokenList (Tokenize.tokenize code))
                )
            )
      , uri
      }
  else
    Nothing

deactivate :: Effect Unit
deactivate = pure unit

tokenDataListToDataList ::
  Array TokenType.TokenData ->
  Array Int
tokenDataListToDataList tokenDataList =
  ( Array.foldl
        ( \{ beforePosition, result } item@(TokenType.TokenData { start }) ->
            { beforePosition: start
            , result:
                Prelude.append result
                  ( TokenType.tokenDataToData beforePosition
                      item
                  )
            }
        )
        { beforePosition:
            Range.Position
              { line: UInt.fromInt 0
              , character:
                  UInt.fromInt 0
              }
        , result: []
        }
        tokenDataList
    )
    .result

evaluatedTreeToDiagnosticList :: VSCodeApi.Uri -> Evaluate.EvaluatedTree -> Array VSCodeApi.Diagnostic
evaluatedTreeToDiagnosticList uri tree =
  map
    ( \(Error.ErrorWithRange { error, range }) ->
        VSCodeApi.newDiagnostic
          (rangeToVsCodeRange range)
          (Error.errorToString error)
          ( case error of
              Error.SuperfluousParameter { name, nameRange } ->
                [ VSCodeApi.newDiagnosticRelatedInformation
                    (VSCodeApi.newLocation uri (rangeToVsCodeRange nameRange))
                    name
                ]
              Error.NeedParameter { name, nameRange } ->
                [ VSCodeApi.newDiagnosticRelatedInformation
                    (VSCodeApi.newLocation uri (rangeToVsCodeRange nameRange))
                    name
                ]
              _ -> []
          )
    )
    (Error.getErrorList tree)

rangeToVsCodeRange :: Range.Range -> VSCodeApi.Range
rangeToVsCodeRange range =
  VSCodeApi.newRange
    (positionToVsCodePosition (Range.rangeStart range))
    (positionToVsCodePosition (Range.rangeEnd range))

positionToVsCodePosition :: Range.Position -> VSCodeApi.Position
positionToVsCodePosition position =
  VSCodeApi.newPosition
    (Range.positionLine position)
    (Range.positionCharacter position)

vsCodePositionToPosition :: VSCodeApi.Position -> Range.Position
vsCodePositionToPosition position =
  Range.Position
    { line: VSCodeApi.positionGetLine position
    , character: VSCodeApi.positionGetCharacter position
    }

hoverToVscodeHover :: Maybe Hover.Hover -> Nullable.Nullable { contents :: String, range :: VSCodeApi.Range }
hoverToVscodeHover = case _ of
  Just (Hover.Hover { contents, range }) ->
    Nullable.notNull
      { contents: Markdown.toMarkdownString contents
      , range: rangeToVsCodeRange range
      }
  Nothing -> Nullable.null

completionItemToVsCodeCompletionItem ::
  Completion.CompletionItem ->
  { label :: String
  , description :: String
  , detail :: String
  , kind :: VSCodeApi.CompletionItemKind
  , documentation :: String
  , commitCharacters :: Array String
  , insertText :: String
  }
completionItemToVsCodeCompletionItem (Completion.CompletionItem rec) =
  { label: rec.label
  , description: rec.description
  , detail: rec.detail
  , kind:
      case rec.kind of
        Completion.Function -> VSCodeApi.completionItemKindFunction
        Completion.Module -> VSCodeApi.completionItemKindModule
  , documentation: Markdown.toMarkdownString rec.documentation
  , commitCharacters: rec.commitCharacters
  , insertText: rec.insertText
  }
