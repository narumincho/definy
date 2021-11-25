module Console (logValue, logValueAsAff) where

import Effect as Effect
import Effect.Aff as Aff
import Effect.Class as EffectClass
import Effect.Uncurried as EffectUncurried
import Prelude as Prelude

foreign import logValueRaw :: forall a. EffectUncurried.EffectFn2 String a Prelude.Unit

-- | 値をコンソールに表示する. Effect.Console.log との違いは一旦文字列にしないこと
logValue :: forall a. String -> a -> Effect.Effect Prelude.Unit
logValue = EffectUncurried.runEffectFn2 logValueRaw

-- | 値をコンソールに表示する. Effect.Console.log との違いは一旦文字列にしないこと
logValueAsAff :: forall a. String -> a -> Aff.Aff Prelude.Unit
logValueAsAff message value = EffectClass.liftEffect (logValue message value)
