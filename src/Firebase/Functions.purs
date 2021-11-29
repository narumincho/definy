module Firebase.Functions (onRequest, HttpsFunction) where

import Effect (Effect)
import Effect.Uncurried as EffectUncurried
import StructuredUrl as StructuredUrl

type Response
  = { body :: String, mimeType :: String }

onRequest :: (StructuredUrl.PathAndSearchParams -> Effect Response) -> HttpsFunction
onRequest responseEffect =
  onRequestJs
    ( EffectUncurried.mkEffectFn1
        ( \str ->
            responseEffect (StructuredUrl.pathAndSearchParamsFromString str)
        )
    )

-- | Cloud Functions for Firebase で公開する Function. この型の値を export する必要がある. 
data HttpsFunction

foreign import onRequestJs :: EffectUncurried.EffectFn1 String Response -> HttpsFunction
