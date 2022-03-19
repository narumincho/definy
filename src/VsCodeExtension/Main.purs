module VsCodeExtension.Main
  ( ActivateType
  , DeactivateType
  , activate
  , deactivate
  ) where

import VsCodeExtension.ToString as ToString
import VsCodeExtension.Evaluate as Evaluate
import VsCodeExtension.Parser as Parser
import VsCodeExtension.SimpleToken as SimpleToken
import VsCodeExtension.Tokenize as Tokenize

foreign import data ActivateType :: Type

foreign import data DeactivateType :: Type

foreign import activateFunc :: { formatFunc :: String -> String } -> ActivateType

foreign import deactivateFunc :: DeactivateType

activate :: ActivateType
activate =
  activateFunc
    { formatFunc:
        \code ->
          ToString.evaluatedTreeToString
            ( Evaluate.codeTreeToEvaluatedTreeIContextNormal
                ( Parser.parse
                    (SimpleToken.tokenListToSimpleTokenList (Tokenize.tokenize code))
                )
            )
    }

deactivate :: DeactivateType
deactivate = deactivateFunc
