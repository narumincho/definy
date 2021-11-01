module Console (logValue, logValueAsAff) where

import Effect as Effect
import Effect.Aff as Aff
import Prelude as Prelude
import Effect.Class as EffectClass

-- | 値をコンソールに表示する. Effect.Console.log との違いは一旦文字列にしないこと
foreign import logValue :: forall a. String -> a -> Effect.Effect Prelude.Unit

logValueAsAff :: forall a. String -> a -> Aff.Aff Prelude.Unit
logValueAsAff message value = EffectClass.liftEffect (logValue message value)
