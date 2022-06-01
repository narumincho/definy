module Definy.ModuleName
  ( originAndVersion
  , productionOrDevelopment
  , staticResource
  ) where

import Data.Array.NonEmpty as NonEmptyArray
import Data.String.NonEmpty (NonEmptyString)
import Data.String.NonEmpty as NonEmptyString
import PureScript.Data as PureScriptData
import Type.Prelude (Proxy(..))

definyModuleName :: NonEmptyString
definyModuleName =
  NonEmptyString.nes
    (Proxy :: _ "Definy")

staticResource :: PureScriptData.ModuleName
staticResource =
  PureScriptData.ModuleName
    ( NonEmptyArray.cons' definyModuleName
        [ NonEmptyString.nes (Proxy :: _ "StaticResource") ]
    )

productionOrDevelopment :: PureScriptData.ModuleName
productionOrDevelopment =
  PureScriptData.ModuleName
    ( NonEmptyArray.singleton
        (NonEmptyString.nes (Proxy :: _ "ProductionOrDevelopment"))
    )

originAndVersion :: PureScriptData.ModuleName
originAndVersion =
  PureScriptData.ModuleName
    ( NonEmptyArray.cons' definyModuleName
        [ NonEmptyString.nes
            (Proxy :: _ "OriginAndVersion")
        ]
    )
