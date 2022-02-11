module VsCodeExtension.Lsp where

import Prelude
import Data.Argonaut.Core as ArgonautCore
import Data.String as String
import Data.Tuple as Tuple
import Effect as Effect
import Effect.Uncurried as EffectUncurried
import Node.Buffer as Buffer
import Node.Encoding as Encoding
import Node.Process as Process
import Node.Stream as Stream
import Util as Util

main :: Effect.Effect Unit
main = sendJsonRpcMessage (WindowLogMessage "テスト")

-- receiveJsonRpcMessage (\_ -> pure unit)
data JsonRpcRequestOrParseError
  = JsonRpcRequestOrParseError

receiveJsonRpcMessage :: (JsonRpcRequestOrParseError -> Effect.Effect Unit) -> Effect.Effect Unit
receiveJsonRpcMessage handler =
  Stream.onData Process.stdin
    ( \buffer -> do
        stdin <- Buffer.toString Encoding.UTF8 buffer
        handler JsonRpcRequestOrParseError
    )

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
    jsonValueAsString = ArgonautCore.stringify (jsonRpcResponseToJson response)
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

jsonRpcResponseToJson :: JsonRpcResponse -> ArgonautCore.Json
jsonRpcResponseToJson = case _ of
  WindowLogMessage message ->
    Util.tupleListToJson
      [ Tuple.Tuple "method" (ArgonautCore.fromString "window/logMessage")
      , Tuple.Tuple "params"
          ( Util.tupleListToJson
              [ Tuple.Tuple "type" (ArgonautCore.fromNumber 3.0)
              , Tuple.Tuple "message" (ArgonautCore.fromString message)
              ]
          )
      ]

foreign import appendChunk :: EffectUncurried.EffectFn1 Buffer.Buffer Unit

foreign import getChunk :: Effect.Effect Buffer.Buffer

foreign import deleteChunk :: Effect.Effect Unit
