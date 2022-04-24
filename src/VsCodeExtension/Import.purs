module VsCodeExtension.Import
  ( sampleCall
  ) where

import Prelude as Prelude
import Control.Monad.Except as Except
import Data.Either as Either
import Data.Maybe (Maybe(..))
import Effect.Aff (Aff)
import Effect.Aff.Compat as AffCompat
import Foreign as Foreign
import Foreign.Object as Object

sampleCall :: Aff String
sampleCall =
  Prelude.map
    ( \object -> case Object.lookup "value" object of
        Just rawValue -> case Except.runExcept (Foreign.readNumber rawValue) of
          Either.Left _ -> "number として読み取れなかった"
          Either.Right value -> Prelude.show value
        Nothing -> "value プロパティを読み取れなかった"
    )
    (AffCompat.fromEffectFnAff (callJavaScriptCode "export const value = 1 + 1;"))

foreign import callJavaScriptCode ::
  String ->
  ( AffCompat.EffectFnAff
      (Object.Object Foreign.Foreign)
  )
