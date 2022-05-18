module VsCodeExtension.Main
  ( activate
  , deactivate
  ) where

import Prelude
import Data.Array as Array
import Data.Maybe (Maybe(..))
import Data.Maybe as Maybe
import Data.Nullable as Nullable
import Data.String as String
import Data.String.NonEmpty as NonEmptyString
import Data.UInt as UInt
import Effect (Effect)
import Effect as Effect
import Effect.Uncurried as EffectUncurried
import Markdown as Markdown
import VsCodeExtension.CodeGen as CodeGen
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
  workspaceFolders <- VSCodeApi.workspaceWorkspaceFolders
  VSCodeApi.languagesRegisterDocumentFormattingEditProvider
    { languageId: LanguageId.languageId
    , formatFunc:
        \code ->
          ToString.evaluatedTreeToString
            (codeStringToEvaluatedTree code)
    }
  VSCodeApi.languagesRegisterDocumentSemanticTokensProvider
    { languageId: LanguageId.languageId
    , semanticTokensProviderFunc:
        \code ->
          tokenDataListToDataList
            ( SemanticToken.evaluateTreeToTokenData
                (codeStringToEvaluatedTree code)
            )
    , semanticTokensProviderLegend: TokenType.useTokenTypesAsStringArray
    }
  VSCodeApi.languagesRegisterHoverProvider
    { languageId: LanguageId.languageId
    , func:
        \{ code, position } ->
          hoverToVscodeHover
            ( Hover.getHoverData (vsCodePositionToPosition position)
                (codeStringToEvaluatedTree code)
            )
    }
  VSCodeApi.languagesRegisterCompletionItemProvider
    { languageId: LanguageId.languageId
    , func:
        \{ code, position } ->
          map
            completionItemToVsCodeCompletionItem
            ( Completion.getCompletionList
                { tree: codeStringToEvaluatedTree code
                , position: vsCodePositionToPosition position
                }
            )
    , triggerCharacters: Completion.triggerCharacters
    }
  VSCodeApi.languageRegisterSignatureHelpProvider
    { languageId: LanguageId.languageId
    , func:
        \{ code, position } -> case SignatureHelp.getSignatureHelp
            { tree: codeStringToEvaluatedTree code
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
            ( map
                (\range -> VSCodeApi.newLocation uri (rangeToVsCodeRange range))
                ( Definition.getDefinitionLocation
                    (vsCodePositionToPosition position)
                    (codeStringToEvaluatedTree code)
                )
            )
    }
  VSCodeApi.languagesRegisterDocumentSymbolProvider
    { languageId: LanguageId.languageId
    , func:
        \{ code, uri } ->
          map
            ( \{ name, range } ->
                { name
                , location: VSCodeApi.newLocation uri (rangeToVsCodeRange range)
                }
            )
            ( Symbol.getSymbolAndRangeList
                (codeStringToEvaluatedTree code)
            )
    }
  VSCodeApi.languagesRegisterReferenceProvider
    { languageId: LanguageId.languageId
    , func:
        \{ code, uri, position } ->
          map
            ( \range ->
                VSCodeApi.newLocation uri (rangeToVsCodeRange range)
            )
            ( Reference.getReference
                (vsCodePositionToPosition position)
                (codeStringToEvaluatedTree code)
            )
    }
  VSCodeApi.workspaceOnDidChangeTextDocument
    (getWorkspaceTextDocumentsAndSendErrorAndOutputCode workspaceFolders diagnosticCollection)
  VSCodeApi.workspaceOnDidOpenTextDocument
    (getWorkspaceTextDocumentsAndSendErrorAndOutputCode workspaceFolders diagnosticCollection)
  getWorkspaceTextDocumentsAndSendErrorAndOutputCode workspaceFolders diagnosticCollection

codeStringToEvaluatedTree :: String -> Evaluate.EvaluatedTree
codeStringToEvaluatedTree code =
  Evaluate.codeTreeToEvaluatedTreeIContextNormal
    ( Parser.parse
        (SimpleToken.tokenListToSimpleTokenList (Tokenize.tokenize code))
    )

getWorkspaceTextDocumentsAndSendErrorAndOutputCode ::
  (Array { index ∷ Int, name ∷ String, uri ∷ VSCodeApi.Uri }) ->
  VSCodeApi.DiagnosticCollection ->
  Effect Unit
getWorkspaceTextDocumentsAndSendErrorAndOutputCode workspaceFolders diagnosticCollection =
  VSCodeApi.workspaceTextDocuments
    ( EffectUncurried.mkEffectFn1 \codeDataList -> do
        case Array.find (\workspaceFolde -> eq workspaceFolde.index 0) workspaceFolders of
          Just workspaceFolderUri ->
            outputCode
              workspaceFolderUri.uri
              ( Array.mapMaybe
                  ( \codeData ->
                      if eq codeData.languageId (NonEmptyString.toString LanguageId.languageId) then
                        Just { code: codeData.code, uri: codeData.uri }
                      else
                        Nothing
                  )
                  codeDataList
              )
          Nothing -> pure unit
        sendError
          diagnosticCollection
          codeDataList
    )

outputCode :: VSCodeApi.Uri -> Array { code :: String, uri :: VSCodeApi.Uri } -> Effect Unit
outputCode workspaceFolderUri codeDataList =
  Effect.foreachE
    codeDataList
    ( \codeData -> case String.stripPrefix
          ( String.Pattern
              ( VSCodeApi.uriToString
                  ( VSCodeApi.uriJoinPath
                      { uri: workspaceFolderUri
                      , relativePath: "definy-input"
                      }
                  )
              )
          )
          (VSCodeApi.uriToString codeData.uri) of
        Just fileName ->
          let
            fileNameWithoutExtension =
              Maybe.fromMaybe
                fileName
                ( String.stripSuffix (String.Pattern ".definy")
                    fileName
                )

            evaluatedTree = codeStringToEvaluatedTree codeData.code
          in
            do
              VSCodeApi.workspaceFsWriteFile
                { uri:
                    VSCodeApi.uriJoinPath
                      { uri: workspaceFolderUri
                      , relativePath:
                          append
                            (append "definy-output/typescript/" fileNameWithoutExtension)
                            ".ts"
                      }
                , content: CodeGen.codeAsBinary evaluatedTree true
                }
              VSCodeApi.workspaceFsWriteFile
                { uri:
                    VSCodeApi.uriJoinPath
                      { uri: workspaceFolderUri
                      , relativePath:
                          append
                            (append "definy-output/javascript/" fileNameWithoutExtension)
                            ".js"
                      }
                , content: CodeGen.codeAsBinary evaluatedTree false
                }
        Nothing -> pure unit
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
                append result
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

evaluatedTreeToDiagnosticList ::
  VSCodeApi.Uri ->
  Evaluate.EvaluatedTree ->
  Array VSCodeApi.Diagnostic
evaluatedTreeToDiagnosticList uri tree =
  map
    ( \(Error.ErrorWithRange { error, range }) ->
        VSCodeApi.newDiagnostic
          (rangeToVsCodeRange range)
          (NonEmptyString.toString (Error.errorToString error))
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
