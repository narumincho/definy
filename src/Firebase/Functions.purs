module Firebase.Functions
  ( HttpsFunction
  , Response(..)
  , Status(..)
  , onRequest
  ) where

import Prelude
import Data.Maybe (Maybe)
import Data.String.NonEmpty as NonEmptyString
import Effect (Effect)
import Effect.Uncurried as EffectUncurried
import MediaType as MediaType
import StructuredUrl as StructuredUrl

data Response
  = Response
    { body :: String, mediaTypeMaybe :: Maybe MediaType.MediaType, status :: Status }

data Status
  = Ok
  | NotFound

onRequest :: (StructuredUrl.PathAndSearchParams -> Effect Response) -> HttpsFunction
onRequest responseEffect =
  onRequestJs
    ( EffectUncurried.mkEffectFn1
        ( \str -> do
            (Response res) <- responseEffect (StructuredUrl.pathAndSearchParamsFromString str)
            pure
              { body: res.body
              , mimeType: NonEmptyString.toString (MediaType.toMimeType res.mediaTypeMaybe)
              , status:
                  case res.status of
                    Ok -> 200
                    NotFound -> 404
              }
        )
    )

-- | Cloud Functions for Firebase で公開する Function. この型の値を export する必要がある. 
data HttpsFunction

foreign import onRequestJs ::
  EffectUncurried.EffectFn1
    String
    { body :: String, mimeType :: String, status :: Int } ->
  HttpsFunction
