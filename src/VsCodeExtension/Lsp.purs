module VsCodeExtension.Lsp
  ( main
  , parseContentLengthHeader
  ) where

import Prelude
import Binary as Binary
import Data.Argonaut as Argonaut
import Data.Array as Array
import Data.Either as Either
import Data.Generic.Rep (class Generic)
import Data.Maybe (Maybe(..))
import Data.String as String
import Data.Tuple as Tuple
import Data.UInt as UInt
import Effect as Effect
import Effect.Ref as Ref
import Foreign.Object as Object
import Node.Buffer as Buffer
import Node.Encoding as Encoding
import Node.Process as Process
import Node.Stream as Stream

newtype State
  = State { supportPublishDiagnostics :: Boolean }

stateSetSupportPublishDiagnostics :: Boolean -> State -> State
stateSetSupportPublishDiagnostics supportPublishDiagnostics (State rec) = State (rec { supportPublishDiagnostics = supportPublishDiagnostics })

main :: Effect.Effect Unit
main = do
  parseState <-
    Ref.new
      ( JsonRpcRequestListParseState
          { readContentLength: Nothing
          , rest: Binary.empty
          }
      )
  state <- Ref.new (State { supportPublishDiagnostics: false })
  receiveJsonRpcMessage
    parseState
    ( case _ of
        Either.Right (Initialize { id, supportPublishDiagnostics }) -> do
          sendJsonRpcMessage (WindowLogMessage "Initializeされた!")
          Ref.modify_ (stateSetSupportPublishDiagnostics supportPublishDiagnostics) state
          sendJsonRpcMessage (ResponseInitialize { id })
        Either.Right Initialized ->
          sendJsonRpcMessage
            (WindowLogMessage "Initializedされた!")
        Either.Right (TextDocumentDidOpen { uri }) -> do
          (State { supportPublishDiagnostics }) <- Ref.read state
          sendJsonRpcMessage
            (WindowLogMessage "TextDocumentDidOpenされた!")
          if supportPublishDiagnostics then
            sendJsonRpcMessage
              ( PublishDiagnostics
                  { uri
                  , diagnostics:
                      [ Diagnostic
                          { range:
                              Range
                                { start:
                                    Position
                                      { line: UInt.fromInt 0
                                      , character: UInt.fromInt 0
                                      }
                                , end:
                                    Position
                                      { line: UInt.fromInt 0
                                      , character: UInt.fromInt 2
                                      }
                                }
                          , message: "テストエラーメッセージ!"
                          }
                      ]
                  }
              )
          else
            pure unit
        Either.Right (TextDocumentDidChange _) ->
          sendJsonRpcMessage
            (WindowLogMessage "TextDocumentDidChangeされた!")
        Either.Left message -> sendJsonRpcMessage (WindowLogMessage message)
    )

data JsonRpcRequest
  = Initialize { id :: JsonRpcId, supportPublishDiagnostics :: Boolean }
  | Initialized
  | TextDocumentDidOpen { uri :: String }
  | TextDocumentDidChange { uri :: String }

data JsonRpcId
  = JsonRpcId Int

receiveJsonRpcMessage ::
  Ref.Ref JsonRpcRequestListParseState ->
  (Either.Either String JsonRpcRequest -> Effect.Effect Unit) ->
  Effect.Effect Unit
receiveJsonRpcMessage stateRef handler =
  Stream.onData Process.stdin
    ( \buffer -> do
        state <- Ref.read stateRef
        stdin <- Buffer.toString Encoding.UTF8 buffer
        sendJsonRpcMessage (WindowLogMessage (append "request:" stdin))
        let
          (JsonRpcRequestListParseData { resultList, readContentLength, rest }) =
            jsonRpcRequestListParse state
              ( Binary.fromNodeBuffer
                  buffer
              )
        Ref.write
          ( JsonRpcRequestListParseState
              { readContentLength, rest }
          )
          stateRef
        Effect.foreachE
          resultList
          handler
    )

newtype JsonRpcRequestListParseData
  = JsonRpcRequestListParseData
  { resultList :: Array (Either.Either String JsonRpcRequest)
  , readContentLength :: Maybe UInt.UInt
  , rest :: Binary.Binary
  }

newtype JsonRpcRequestListParseState
  = JsonRpcRequestListParseState
  { readContentLength :: Maybe UInt.UInt
  , rest :: Binary.Binary
  }

jsonRpcRequestListParse ::
  JsonRpcRequestListParseState ->
  Binary.Binary ->
  JsonRpcRequestListParseData
jsonRpcRequestListParse (JsonRpcRequestListParseState state) request =
  jsonRpcRequestListParseLoop
    ( JsonRpcRequestListParseData
        { resultList: []
        , readContentLength: state.readContentLength
        , rest: Binary.append state.rest request
        }
    )

jsonRpcRequestListParseLoop :: JsonRpcRequestListParseData -> JsonRpcRequestListParseData
jsonRpcRequestListParseLoop (JsonRpcRequestListParseData rec) =
  if Binary.isEmpty rec.rest then
    JsonRpcRequestListParseData rec
  else case rec.readContentLength of
    Just contentLength ->
      let
        { before, after } = Binary.separateAt rec.rest contentLength
      in
        jsonRpcRequestListParseLoop
          ( JsonRpcRequestListParseData
              { resultList:
                  Array.snoc rec.resultList
                    ( case Binary.toStringReadAsUtf8 before of
                        Just jsonAsString -> jsonRpcRequestParse jsonAsString
                        Nothing -> Either.Left "UTF8のデコードに失敗"
                    )
              , readContentLength: Nothing
              , rest: after
              }
          )
    Nothing -> case Binary.toStringReadAsUtf8 rec.rest of
      Just restAsString -> case String.indexOf (String.Pattern "\r\n\r\n") restAsString of
        Just headerEndIndex ->
          let
            { before, after } = String.splitAt headerEndIndex restAsString

            rest = String.drop 4 after
          in
            jsonRpcRequestListParseLoop
              ( JsonRpcRequestListParseData
                  { resultList: rec.resultList
                  , readContentLength:
                      Array.foldl
                        ( \_ headerItem ->
                            parseContentLengthHeader headerItem
                        )
                        Nothing
                        (String.split (String.Pattern "\r\n") before)
                  , rest: Binary.fromStringWriteAsUtf8 rest
                  }
              )
        Nothing -> JsonRpcRequestListParseData rec
      Nothing -> JsonRpcRequestListParseData rec

parseContentLengthHeader :: String -> Maybe UInt.UInt
parseContentLengthHeader headerItem =
  let
    keyAndValue = String.split (String.Pattern ":") headerItem

    keyMaybe = Array.index keyAndValue 0

    valueMaybe = Array.index keyAndValue 1
  in
    case Tuple.Tuple keyMaybe valueMaybe of
      Tuple.Tuple (Just key) (Just value) ->
        if eq (String.toLower key) "content-length" then
          UInt.fromString value
        else
          Nothing
      Tuple.Tuple _ _ -> Nothing

jsonRpcRequestParse :: String -> Either.Either String JsonRpcRequest
jsonRpcRequestParse jsonAsString = case Argonaut.jsonParser jsonAsString of
  Either.Right json -> jsonToJsonRpcRequestResult json
  Either.Left parseError ->
    Either.Left
      (append "JSON のパースに失敗した " parseError)

jsonToJsonRpcRequestResult :: Argonaut.Json -> Either.Either String JsonRpcRequest
jsonToJsonRpcRequestResult json = case Argonaut.toObject json of
  Just jsonAsObj -> case jsonObjectToJsonRpcRequestResult jsonAsObj of
    Either.Right r -> Either.Right r
    Either.Left l -> Either.Left (Argonaut.printJsonDecodeError l)
  Nothing -> Either.Left "json のルートの値が object ではなかった"

jsonObjectToJsonRpcRequestResult ::
  Object.Object Argonaut.Json ->
  Either.Either Argonaut.JsonDecodeError JsonRpcRequest
jsonObjectToJsonRpcRequestResult jsonObject = do
  (method :: String) <- Argonaut.getField jsonObject "method"
  ( case method of
      "initialize" -> do
        (id :: Int) <- Argonaut.getField jsonObject "id"
        (params :: { capabilities :: { textDocument :: Object.Object Argonaut.Json } }) <- Argonaut.getField jsonObject "params"
        (publishDiagnosticsMaybe :: Maybe (Object.Object Argonaut.Json)) <- Argonaut.getFieldOptional params.capabilities.textDocument "publishDiagnostics"
        Either.Right
          ( Initialize
              { id: JsonRpcId id
              , supportPublishDiagnostics:
                  case publishDiagnosticsMaybe of
                    Just _ -> true
                    Nothing -> false
              }
          )
      "Initialized" -> do
        Either.Right Initialized
      "textDocument/didOpen" -> do
        params <- getParam jsonObject
        (textDocument :: { uri :: String }) <- Argonaut.getField params "textDocument"
        Either.Right (TextDocumentDidOpen { uri: textDocument.uri })
      "textDocument/didChange" -> do
        params <- getParam jsonObject
        (textDocument :: { uri :: String }) <- Argonaut.getField params "textDocument"
        Either.Right (TextDocumentDidOpen { uri: textDocument.uri })
      _ ->
        Either.Left
          (Argonaut.TypeMismatch (append "unknown method " method))
  )

getParam ::
  Object.Object Argonaut.Json ->
  Either.Either Argonaut.JsonDecodeError (Object.Object Argonaut.Json)
getParam jsonObject = Argonaut.getField jsonObject "params"

data JsonRpcResponse
  = WindowLogMessage String
  | ResponseInitialize { id :: JsonRpcId }
  | PublishDiagnostics { uri :: String, diagnostics :: Array Diagnostic }

newtype Diagnostic
  = Diagnostic { range :: Range, message :: String }

derive instance genericDiagnostic :: Generic Diagnostic _

instance encodeJsonDiagnostic :: Argonaut.EncodeJson Diagnostic where
  encodeJson :: Diagnostic -> Argonaut.Json
  encodeJson (Diagnostic rec) = Argonaut.encodeJson rec

newtype Range
  = Range { start :: Position, end :: Position }

instance encodeJsonRange :: Argonaut.EncodeJson Range where
  encodeJson :: Range -> Argonaut.Json
  encodeJson (Range rec) = Argonaut.encodeJson rec

newtype Position
  = Position { line :: UInt.UInt, character :: UInt.UInt }

instance encodeJsonPosition :: Argonaut.EncodeJson Position where
  encodeJson :: Position -> Argonaut.Json
  encodeJson (Position rec) =
    Argonaut.encodeJson
      { line: UInt.toInt rec.line
      , character: UInt.toInt rec.character
      }

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
      { jsonrpc: "2.0"
      , method: "window/logMessage"
      , params: { type: 3.0, message }
      }
  ResponseInitialize { id: JsonRpcId id } ->
    Argonaut.encodeJson
      { jsonrpc: "2.0"
      , id
      , result: { capabilities: { textDocumentSync: 1 } }
      }
  PublishDiagnostics value ->
    Argonaut.encodeJson
      { jsonrpc: "2.0"
      , method: "textDocument/publishDiagnostics"
      , params: value
      }
