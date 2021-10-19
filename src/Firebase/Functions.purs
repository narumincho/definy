module Firebase.Functions (onRequest, HttpsFunction) where

import Effect as Effect

onRequest :: Effect.Effect String -> HttpsFunction
onRequest = onRequestJs

data HttpsFunction

foreign import onRequestJs :: Effect.Effect String -> HttpsFunction
