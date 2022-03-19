module VsCodeExtension.Main
  ( ActivateType
  , DeactivateType
  , activate
  , deactivate
  ) where

import Data.Array as Array
import Data.String.NonEmpty as NonEmptyString
import Data.UInt as UInt
import Prelude as Prelude
import VsCodeExtension.Evaluate as Evaluate
import VsCodeExtension.LanguageId as LanguageId
import VsCodeExtension.Parser as Parser
import VsCodeExtension.Range as Range
import VsCodeExtension.SemanticToken as SemanticToken
import VsCodeExtension.SimpleToken as SimpleToken
import VsCodeExtension.ToString as ToString
import VsCodeExtension.TokenType as TokenType
import VsCodeExtension.Tokenize as Tokenize

foreign import data ActivateType :: Type

foreign import data DeactivateType :: Type

foreign import activateFunc ::
  { languageId :: String
  , formatFunc :: String -> String
  , semanticTokensProviderFunc :: String -> Array Int
  , semanticTokensProviderLegend :: Array String
  } ->
  ActivateType

foreign import deactivateFunc :: DeactivateType

activate :: ActivateType
activate =
  activateFunc
    { languageId: NonEmptyString.toString LanguageId.languageId
    , formatFunc:
        \code ->
          ToString.evaluatedTreeToString
            ( Evaluate.codeTreeToEvaluatedTreeIContextNormal
                ( Parser.parse
                    (SimpleToken.tokenListToSimpleTokenList (Tokenize.tokenize code))
                )
            )
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

deactivate :: DeactivateType
deactivate = deactivateFunc

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
              , character: UInt.fromInt 0
              }
        , result: []
        }
        tokenDataList
    )
    .result
