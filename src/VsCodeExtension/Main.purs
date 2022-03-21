module VsCodeExtension.Main
  ( activate
  , deactivate
  ) where

import Prelude
import Data.Array as Array
import Data.Nullable as Nullable
import Data.String.NonEmpty as NonEmptyString
import Data.UInt as UInt
import Effect (Effect)
import Effect.Uncurried as EffectUncurried
import Prelude as Prelude
import VsCodeExtension.Evaluate as Evaluate
import VsCodeExtension.Hover as Hover
import VsCodeExtension.LanguageId as LanguageId
import VsCodeExtension.Parser as Parser
import VsCodeExtension.SemanticToken as SemanticToken
import VsCodeExtension.SimpleToken as SimpleToken
import VsCodeExtension.ToString as ToString
import VsCodeExtension.TokenType as TokenType
import VsCodeExtension.Tokenize as Tokenize
import VsCodeExtension.VSCodeApi as VSCodeApi
import VsCodeExtension.Error as Error

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
          Nullable.toNullable
            ( Hover.getHoverData position
                ( Evaluate.codeTreeToEvaluatedTreeIContextNormal
                    ( Parser.parse
                        (SimpleToken.tokenListToSimpleTokenList (Tokenize.tokenize code))
                    )
                )
            )
    }
  VSCodeApi.workspaceOnDidChangeTextDocument
    ( EffectUncurried.mkEffectFn1 \{ code, languageId, uri } ->
        if eq languageId (NonEmptyString.toString LanguageId.languageId) then
          VSCodeApi.diagnosticCollectionSet
            [ { diagnosticList:
                  evaluatedTreeToDiagnosticList uri
                    ( Evaluate.codeTreeToEvaluatedTreeIContextNormal
                        ( Parser.parse
                            (SimpleToken.tokenListToSimpleTokenList (Tokenize.tokenize code))
                        )
                    )
              , uri
              }
            ]
            diagnosticCollection
        else
          pure unit
    )

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
            VSCodeApi.newPosition
              (UInt.fromInt 0)
              (UInt.fromInt 0)
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
          range
          (Error.errorToString error)
          ( case error of
              Error.SuperfluousParameter { name, nameRange } ->
                [ VSCodeApi.newDiagnosticRelatedInformation
                    (VSCodeApi.newLocation uri nameRange)
                    (NonEmptyString.toString name)
                ]
              Error.NeedParameter { name, nameRange } ->
                [ VSCodeApi.newDiagnosticRelatedInformation
                    (VSCodeApi.newLocation uri nameRange)
                    (NonEmptyString.toString name)
                ]
              _ -> []
          )
    )
    (Error.getErrorList tree)
