module VsCodeExtension.Main
  ( activate
  , deactivate
  ) where

import Prelude
import Data.Array as Array
import Data.String.NonEmpty as NonEmptyString
import Data.UInt as UInt
import Effect (Effect)
import Prelude as Prelude
import VsCodeExtension.Evaluate as Evaluate
import VsCodeExtension.LanguageId as LanguageId
import VsCodeExtension.Parser as Parser
import VsCodeExtension.SemanticToken as SemanticToken
import VsCodeExtension.SimpleToken as SimpleToken
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
