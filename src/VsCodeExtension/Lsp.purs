module VsCodeExtension.Lsp where

import Prelude
import Data.Argonaut as Argonaut
import Data.Array as Array
import Data.Either as Either
import Data.Maybe (Maybe(..))
import Data.String as String
import Data.Tuple as Tuple
import Effect as Effect
import Effect.Uncurried as EffectUncurried
import Foreign.Object as Object
import Node.Buffer as Buffer
import Node.Encoding as Encoding
import Node.Process as Process
import Node.Stream as Stream
import Util as Util

main :: Effect.Effect Unit
main =
  receiveJsonRpcMessage
    ( case _ of
        Either.Right (Initialize _) -> sendJsonRpcMessage (WindowLogMessage "Initializeされた!")
        Either.Right (Initialized _) -> sendJsonRpcMessage (WindowLogMessage "Initializedされた!")
        Either.Right (TextDocumentDidOpen _) ->
          sendJsonRpcMessage
            (WindowLogMessage "TextDocumentDidOpenされた!")
        Either.Right (TextDocumentDidChange _) ->
          sendJsonRpcMessage
            (WindowLogMessage "TextDocumentDidChangeされた!")
        Either.Left message -> sendJsonRpcMessage (WindowLogMessage message)
    )

-- receiveJsonRpcMessage (\_ -> pure unit)
data JsonRpcRequest
  = Initialize JsonRpcId
  | Initialized JsonRpcId
  | TextDocumentDidOpen { uri :: String }
  | TextDocumentDidChange { uri :: String }

data JsonRpcId
  = JsonRpcId Int

receiveJsonRpcMessage ::
  (Either.Either String JsonRpcRequest -> Effect.Effect Unit) ->
  Effect.Effect Unit
receiveJsonRpcMessage handler =
  Stream.onData Process.stdin
    ( \buffer -> do
        stdin <- Buffer.toString Encoding.UTF8 buffer
        sendJsonRpcMessage (WindowLogMessage (append "request:" stdin))
        handler (jsonRpcRequestParse stdin)
    )

jsonRpcRequestParse :: String -> Either.Either String JsonRpcRequest
jsonRpcRequestParse request = case Array.index
    (String.split (String.Pattern "\r\n\r\n") request)
    1 of
  Just jsonAsString -> case Argonaut.jsonParser jsonAsString of
    Either.Right json -> jsonToJsonRpcRequestResult json
    Either.Left parseError ->
      Either.Left
        (append "JSON のパースに失敗した 一度に送られなかった?" parseError)
  Nothing -> Either.Left "一度に送られなかった?"

jsonToJsonRpcRequestResult :: Argonaut.Json -> Either.Either String JsonRpcRequest
jsonToJsonRpcRequestResult json = case Argonaut.toObject json of
  Just jsonAsObj -> case Tuple.Tuple
      (Object.lookup "id" jsonAsObj)
      (Object.lookup "method" jsonAsObj) of
    Tuple.Tuple (Just idJson) (Just methodJson) -> case Tuple.Tuple (Argonaut.toNumber idJson) (Argonaut.toString methodJson) of
      Tuple.Tuple _ _ -> Either.Left "wip...."
    Tuple.Tuple _ _ -> Either.Left "wip"
  Nothing -> Either.Left "json のルートの値が object ではなかった"

data JsonRpcResponse
  = WindowLogMessage String

sendJsonRpcMessage :: JsonRpcResponse -> Effect.Effect Unit
sendJsonRpcMessage response = do
  binary <- jsonRpcResponseToBinary response
  _ <-
    Stream.writeString
      Process.stdout
      Encoding.UTF8
      binary
      (pure unit)
  pure unit

jsonRpcResponseToBinary :: JsonRpcResponse -> Effect.Effect String
jsonRpcResponseToBinary response =
  let
    jsonValueAsString :: String
    jsonValueAsString = Argonaut.stringify (jsonRpcResponseToJson response)
  in
    do
      jsonValueAsBuffer <- (Buffer.fromString jsonValueAsString Encoding.UTF8) :: Effect.Effect Buffer.Buffer
      jsonValueBinaryLength <- Buffer.size jsonValueAsBuffer
      pure
        ( String.joinWith ""
            [ "Content-Length: "
            , show jsonValueBinaryLength
            , "\r\n\r\n"
            , jsonValueAsString
            ]
        )

jsonRpcResponseToJson :: JsonRpcResponse -> Argonaut.Json
jsonRpcResponseToJson = case _ of
  WindowLogMessage message ->
    Util.tupleListToJson
      [ Tuple.Tuple "method" (Argonaut.fromString "window/logMessage")
      , Tuple.Tuple "params"
          ( Util.tupleListToJson
              [ Tuple.Tuple "type" (Argonaut.fromNumber 3.0)
              , Tuple.Tuple "message" (Argonaut.fromString message)
              ]
          )
      ]

foreign import appendChunk :: EffectUncurried.EffectFn1 Buffer.Buffer Unit

foreign import getChunk :: Effect.Effect Buffer.Buffer

foreign import deleteChunk :: Effect.Effect Unit
