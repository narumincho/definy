module EsBuild (build, Option) where

import Effect.Aff as Aff
import Effect.Aff.Compat as AffCompat
import Prelude as Prelude

type Option
  = { entryPoints :: String
    , outdir :: String
    , sourcemap :: Boolean
    , target :: Array String
    }

foreign import buildAsEffectFnAff ::
  Option ->
  AffCompat.EffectFnAff Prelude.Unit

build :: Option -> Aff.Aff Prelude.Unit
build option = AffCompat.fromEffectFnAff (buildAsEffectFnAff option)
