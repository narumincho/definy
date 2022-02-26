module VsCodeExtension.JsonRpc
  ( ErrorCode(..)
  , Id
  , NotificationMessage(..)
  , NotificationMessageOrRequestMessage(..)
  , Params(..)
  , ResponseError(..)
  , ResponseMessage(..)
  , RequestMessage(..)
  , idZero
  , paramsFromRecord
  ) where

import Prelude
import Data.Argonaut as Argonaut
import Data.Argonaut.Encode.Class as ArgonautEncodeClass
import Data.Either as Either
import Data.Int as Int
import Data.Maybe (Maybe(..))
import Foreign.Object (Object)
import Prim.RowList as PrimRowList
import Type.Proxy (Proxy(..))

data Id
  = IdInt Int
  | IdString String

instance decodeId :: Argonaut.DecodeJson Id where
  decodeJson json = do
    case Argonaut.toString json of
      Just str -> Either.Right (IdString str)
      Nothing -> case Argonaut.toNumber json of
        Just num -> case Int.fromNumber num of
          Just int -> Either.Right (IdInt int)
          Nothing -> Either.Left idDecodeError
        Nothing -> Either.Left idDecodeError

idDecodeError :: Argonaut.JsonDecodeError
idDecodeError = Argonaut.TypeMismatch "Expected JsonRpc id of type integer | string"

instance encodeId :: Argonaut.EncodeJson Id where
  encodeJson = case _ of
    IdInt int -> Argonaut.fromNumber (Int.toNumber int)
    IdString str -> Argonaut.fromString str

idZero :: Id
idZero = IdInt 0

data ResponseMessage
  = ResponseMessageSuccess { id :: Id, result :: Argonaut.Json }
  | ResponseMessageError { id :: Id, error :: Maybe ResponseError }

newtype ResponseError
  = ResponseError { code :: ErrorCode, message :: String, data :: Argonaut.Json }

instance encodeResponseError ::
  Argonaut.EncodeJson ResponseError where
  encodeJson (ResponseError rec) = Argonaut.encodeJson rec

data ErrorCode
  = InvalidRequest
  | MethodNotFound
  | InternalError
  | ServerNotInitialized

instance encodeErrorCode :: Argonaut.EncodeJson ErrorCode where
  encodeJson errorCode =
    Argonaut.fromNumber
      ( Int.toNumber case errorCode of
          InvalidRequest -> -32600
          MethodNotFound -> -32601
          InternalError -> -32603
          ServerNotInitialized -> -32002
      )

instance encodeResponseMessage ::
  Argonaut.EncodeJson ResponseMessage where
  encodeJson = case _ of
    ResponseMessageSuccess { id, result } -> Argonaut.encodeJson { jsonrpc: "2.0", id, result }
    ResponseMessageError { id, error } -> Argonaut.encodeJson { jsonrpc: "2.0", id, error }

data NotificationMessageOrRequestMessage
  = DecodeResultRequestMessage RequestMessage
  | DecodeResultNotificationMessage NotificationMessage

newtype RequestMessage
  = RequestMessage { id :: Id, method :: String, params :: Maybe Params }

data Params
  = ParamsArray (Array Argonaut.Json)
  | ParamsObject (Object Argonaut.Json)

instance encodeParams :: Argonaut.EncodeJson Params where
  encodeJson = case _ of
    ParamsArray array -> Argonaut.encodeJson array
    ParamsObject obj -> Argonaut.encodeJson obj

instance decodeParams :: Argonaut.DecodeJson Params where
  decodeJson json = case Argonaut.toObject json of
    Just obj -> Either.Right (ParamsObject obj)
    Nothing -> case Argonaut.toArray json of
      Just array -> Either.Right (ParamsArray array)
      Nothing -> Either.Left (Argonaut.TypeMismatch "Expected JsonRpc (NotificationMessage or RequestMessage) param type object | array")

paramsFromRecord ::
  forall row list.
  (ArgonautEncodeClass.GEncodeJson row list) =>
  (PrimRowList.RowToList row list) =>
  Record row -> Params
paramsFromRecord record =
  ParamsObject
    (ArgonautEncodeClass.gEncodeJson record (Proxy :: Proxy list))

instance decodeNotificationMessageOrRequestMessage :: Argonaut.DecodeJson NotificationMessageOrRequestMessage where
  decodeJson json = case Argonaut.toObject json of
    Just jsonObject -> do
      (_ :: String) <- Argonaut.getField jsonObject "jsonrpc"
      (method :: String) <- Argonaut.getField jsonObject "method"
      (params :: Maybe Params) <- Argonaut.getFieldOptional jsonObject "params"
      (idMaybe :: Maybe Id) <- Argonaut.getFieldOptional jsonObject "id"
      case idMaybe of
        Just id ->
          Either.Right
            ( DecodeResultRequestMessage
                (RequestMessage { id, method, params })
            )
        Nothing ->
          Either.Right
            ( DecodeResultNotificationMessage
                (NotificationMessage { method, params })
            )
    Nothing -> Either.Left (Argonaut.TypeMismatch "Expected JsonRpc NotificationMessage or RequestMessage type object")

newtype NotificationMessage
  = NotificationMessage { method :: String, params :: Maybe Params }

instance encodeNotificationMessage :: Argonaut.EncodeJson NotificationMessage where
  encodeJson (NotificationMessage rec) = Argonaut.encodeJson rec
