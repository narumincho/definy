module VsCodeExtension.Lsp
  ( main
  ) where

import Prelude
import Data.Argonaut as Argonaut
import Data.Array as Array
import Data.Either as Either
import Data.Maybe (Maybe(..))
import Data.String as String
import Effect as Effect
import Effect.Uncurried as EffectUncurried
import Foreign.Object as Object
import Node.Buffer as Buffer
import Node.Encoding as Encoding
import Node.Process as Process
import Node.Stream as Stream

main :: Effect.Effect Unit
main =
  receiveJsonRpcMessage
    ( case _ of
        Either.Right (Initialize id) -> do
          sendJsonRpcMessage (WindowLogMessage "Initializeされた!")
          sendJsonRpcMessage (ResponseInitialize { id })
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
  Nothing -> Either.Left "一度に送られなかった? ヘッダーとJSONの区切りが見つからなかった"

jsonToJsonRpcRequestResult :: Argonaut.Json -> Either.Either String JsonRpcRequest
jsonToJsonRpcRequestResult json = case Argonaut.toObject json of
  Just jsonAsObj -> case jsonObjectToJsonRpcRequestResult jsonAsObj of
    Either.Right r -> Either.Right r
    Either.Left l -> Either.Left (Argonaut.printJsonDecodeError l)
  Nothing -> Either.Left "json のルートの値が object ではなかった"

jsonObjectToJsonRpcRequestResult :: Object.Object Argonaut.Json -> Either.Either Argonaut.JsonDecodeError JsonRpcRequest
jsonObjectToJsonRpcRequestResult jsonObject = do
  (method :: String) <- Argonaut.getField jsonObject "method"
  ( case method of
      "initialize" -> do
        (id :: Int) <- Argonaut.getField jsonObject "id"
        Either.Right (Initialize (JsonRpcId id))
      "Initialized" -> do
        (id :: Int) <- Argonaut.getField jsonObject "id"
        Either.Right (Initialized (JsonRpcId id))
      "textDocument/didOpen" -> do
        (textDocument :: Object.Object Argonaut.Json) <- Argonaut.getField jsonObject "textDocument"
        (uri :: String) <- Argonaut.getField textDocument "uri"
        Either.Right (TextDocumentDidOpen { uri })
      "textDocument/didChange" -> do
        (textDocument :: Object.Object Argonaut.Json) <- Argonaut.getField jsonObject "textDocument"
        (uri :: String) <- Argonaut.getField textDocument "uri"
        Either.Right (TextDocumentDidOpen { uri })
      _ ->
        Either.Left
          (Argonaut.TypeMismatch (append "unknown method " method))
  )

data JsonRpcResponse
  = WindowLogMessage String
  | ResponseInitialize { id :: JsonRpcId }

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
    Argonaut.encodeJson
      { method: "window/logMessage"
      , params: { type: 3.0, message }
      }
  ResponseInitialize { id: JsonRpcId id } ->
    Argonaut.encodeJson
      { id
      , result: { capabilities: { textDocumentSync: 1 } }
      }

foreign import appendChunk :: EffectUncurried.EffectFn1 Buffer.Buffer Unit

foreign import getChunk :: Effect.Effect Buffer.Buffer

foreign import deleteChunk :: Effect.Effect Unit
