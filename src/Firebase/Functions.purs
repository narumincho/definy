module Firebase.Functions (onRequest, HttpsFunction) where

import Effect as Effect

type Response
  = { body :: String, mimeType :: String }

onRequest :: Effect.Effect Response -> HttpsFunction
onRequest = onRequestJs

-- | Cloud Functions for Firebase で公開する Function. この型の値を export する必要がある. 
data HttpsFunction

foreign import onRequestJs :: Effect.Effect Response -> HttpsFunction
