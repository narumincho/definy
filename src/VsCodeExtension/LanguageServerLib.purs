module VsCodeExtension.LanguageServerLib
  ( ClientToServerMessage(..)
  , ClientToServerMessageParseState
  , CodeLens(..)
  , Command(..)
  , Diagnostic(..)
  , ServerToClientMessage(..)
  , createJsonRpcRequestListParseStateRef
  , parseContentLengthHeader
  , receiveJsonRpcMessage
  , sendJsonRpcMessage
  , sendNotificationPublishDiagnostics
  , sendNotificationWindowLogMessage
  ) where

import Prelude
import Binary as Binary
import Data.Argonaut as Argonaut
import Data.Array as Array
import Data.Either as Either
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
import VsCodeExtension.JsonRpc as JsonRpc
import VsCodeExtension.Range as Range
import VsCodeExtension.TokenType as TokenType
import VsCodeExtension.Uri as Uri

data ClientToServerMessage
  = Initialize
    { id :: JsonRpc.Id
    , supportPublishDiagnostics :: Boolean
    , supportTokenTypes :: Array TokenType.TokenTypeOrNotSupportTokenType
    }
  | Initialized
  | TextDocumentDidOpen { uri :: Uri.Uri, text :: String }
  | TextDocumentDidChange { uri :: Uri.Uri, text :: String }
  | TextDocumentDidSave { uri :: Uri.Uri }
  | TextDocumentSemanticTokensFull { id :: JsonRpc.Id, uri :: Uri.Uri }
  | TextDocumentCodeLens { id :: JsonRpc.Id, uri :: Uri.Uri }

createJsonRpcRequestListParseStateRef :: Effect.Effect (Ref.Ref ClientToServerMessageParseState)
createJsonRpcRequestListParseStateRef =
  Ref.new
    ( ClientToServerMessageParseState
        { readContentLength: Nothing
        , rest: Binary.empty
        }
    )

receiveJsonRpcMessage ::
  Ref.Ref ClientToServerMessageParseState ->
  (Either.Either String ClientToServerMessage -> Effect.Effect Unit) ->
  Effect.Effect Unit
receiveJsonRpcMessage stateRef handler =
  Stream.onData Process.stdin
    ( \buffer -> do
        state <- Ref.read stateRef
        stdin <- Buffer.toString Encoding.UTF8 buffer
        sendNotificationWindowLogMessage (append "● client → server: " stdin)
        let
          (JsonRpcRequestListParseData { resultList, readContentLength, rest }) =
            jsonRpcRequestListParse state
              ( Binary.fromNodeBuffer
                  buffer
              )
        Ref.write
          ( ClientToServerMessageParseState
              { readContentLength, rest }
          )
          stateRef
        Effect.foreachE
          resultList
          handler
    )

newtype JsonRpcRequestListParseData
  = JsonRpcRequestListParseData
  { resultList :: Array (Either.Either String ClientToServerMessage)
  , readContentLength :: Maybe UInt.UInt
  , rest :: Binary.Binary
  }

newtype ClientToServerMessageParseState
  = ClientToServerMessageParseState
  { readContentLength :: Maybe UInt.UInt
  , rest :: Binary.Binary
  }

jsonRpcRequestListParse ::
  ClientToServerMessageParseState ->
  Binary.Binary ->
  JsonRpcRequestListParseData
jsonRpcRequestListParse (ClientToServerMessageParseState state) request =
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

jsonRpcRequestParse :: String -> Either.Either String ClientToServerMessage
jsonRpcRequestParse jsonAsString = case Argonaut.jsonParser jsonAsString of
  Either.Right json -> case jsonToJsonRpcRequestResult json of
    Either.Right message -> Either.Right message
    Either.Left error -> Either.Left (Argonaut.printJsonDecodeError error)
  Either.Left parseError ->
    Either.Left
      (append "JSON のパースに失敗した " parseError)

jsonToJsonRpcRequestResult :: Argonaut.Json -> Either.Either Argonaut.JsonDecodeError ClientToServerMessage
jsonToJsonRpcRequestResult json = do
  (notificationMessageOrRequestMessage :: JsonRpc.NotificationMessageOrRequestMessage) <- Argonaut.decodeJson json
  case notificationMessageOrRequestMessage of
    JsonRpc.DecodeResultRequestMessage request -> notificationMessageToLanguageClientToServerRequest request
    JsonRpc.DecodeResultNotificationMessage notification -> notificationMessageToLanguageClientToServerNotification notification

notificationMessageToLanguageClientToServerRequest :: JsonRpc.RequestMessage -> Either.Either Argonaut.JsonDecodeError ClientToServerMessage
notificationMessageToLanguageClientToServerRequest (JsonRpc.RequestMessage { id, method, params }) = case method of
  "initialize" -> case params of
    Just (JsonRpc.ParamsObject paramsObj) -> do
      (capabilities :: { textDocument :: Object.Object Argonaut.Json }) <- Argonaut.getField paramsObj "capabilities"
      (publishDiagnosticsMaybe :: Maybe (Object.Object Argonaut.Json)) <-
        Argonaut.getFieldOptional
          capabilities.textDocument
          "publishDiagnostics"
      (semanticTokens :: Maybe ({ tokenTypes :: Array TokenType.TokenTypeOrNotSupportTokenType })) <-
        Argonaut.getFieldOptional
          capabilities.textDocument
          "semanticTokens"
      Either.Right
        ( Initialize
            { id
            , supportPublishDiagnostics:
                case publishDiagnosticsMaybe of
                  Just _ -> true
                  Nothing -> false
            , supportTokenTypes:
                case semanticTokens of
                  Nothing -> []
                  Just { tokenTypes } -> tokenTypes
            }
        )
    _ -> Either.Left (Argonaut.TypeMismatch "expect initialize params type object")
  "textDocument/semanticTokens/full" -> case params of
    Just (JsonRpc.ParamsObject paramsObj) -> do
      (textDocument :: { uri :: Uri.Uri }) <- Argonaut.getField paramsObj "textDocument"
      Either.Right
        ( TextDocumentSemanticTokensFull
            { id, uri: textDocument.uri }
        )
    _ -> Either.Left (Argonaut.TypeMismatch "expect textDocument/semanticTokens/full params type object")
  "textDocument/codeLens" -> case params of
    Just (JsonRpc.ParamsObject paramsObj) -> do
      (textDocument :: { uri :: Uri.Uri }) <- Argonaut.getField paramsObj "textDocument"
      Either.Right
        ( TextDocumentCodeLens
            { id, uri: textDocument.uri }
        )
    _ -> Either.Left (Argonaut.TypeMismatch "expect textDocument/codeLens params type object")
  _ ->
    Either.Left
      (Argonaut.TypeMismatch (append "unknown request method " method))

notificationMessageToLanguageClientToServerNotification :: JsonRpc.NotificationMessage -> Either.Either Argonaut.JsonDecodeError ClientToServerMessage
notificationMessageToLanguageClientToServerNotification (JsonRpc.NotificationMessage { method, params }) = case method of
  "initialized" -> do
    Either.Right Initialized
  "textDocument/didOpen" -> case params of
    Just (JsonRpc.ParamsObject paramsObj) -> do
      (textDocument :: { uri :: Uri.Uri, text :: String }) <- Argonaut.getField paramsObj "textDocument"
      Either.Right (TextDocumentDidOpen textDocument)
    _ -> Either.Left (Argonaut.TypeMismatch "expect textDocument/didOpen params type object")
  "textDocument/didChange" -> case params of
    Just (JsonRpc.ParamsObject paramsObj) -> do
      (textDocument :: { uri :: Uri.Uri }) <- Argonaut.getField paramsObj "textDocument"
      (contentChanges :: Array { text :: String }) <- Argonaut.getField paramsObj "contentChanges"
      Either.Right
        ( TextDocumentDidChange
            { uri: textDocument.uri
            , text:
                case Array.last contentChanges of
                  Just contentChange -> contentChange.text
                  Nothing -> ""
            }
        )
    _ -> Either.Left (Argonaut.TypeMismatch "expect textDocument/didChange params type object")
  "textDocument/didSave" -> case params of
    Just (JsonRpc.ParamsObject paramsObj) -> do
      (textDocument :: { uri :: Uri.Uri }) <- Argonaut.getField paramsObj "textDocument"
      Either.Right
        ( TextDocumentDidSave
            { uri: textDocument.uri }
        )
    _ -> Either.Left (Argonaut.TypeMismatch "expect textDocument/didSave params type object")
  _ ->
    Either.Left
      (Argonaut.TypeMismatch (append "unknown notification method " method))

data ServerToClientMessage
  = WindowLogMessage String
  | ResponseInitialize
    { id :: JsonRpc.Id
    , semanticTokensProviderLegendTokenTypes :: Array String
    }
  | PublishDiagnostics { uri :: Uri.Uri, diagnostics :: Array Diagnostic }
  | ResponseTextDocumentSemanticTokensFull
    { id :: JsonRpc.Id
    , tokenDataList :: Array TokenType.TokenData
    , tokenTypeDict :: TokenType.TokenTypeDict
    }
  | ResponseTextDocumentCodeLens { id :: JsonRpc.Id, codeLensList :: Array CodeLens }

newtype Diagnostic
  = Diagnostic { range :: Range.Range, message :: String }

instance encodeJsonDiagnostic :: Argonaut.EncodeJson Diagnostic where
  encodeJson :: Diagnostic -> Argonaut.Json
  encodeJson (Diagnostic rec) = Argonaut.encodeJson rec

newtype CodeLens
  = CodeLens { range :: Range.Range, command :: Command }

instance encodeJsonCodeLens :: Argonaut.EncodeJson CodeLens where
  encodeJson (CodeLens rec) = Argonaut.encodeJson rec

newtype Command
  = Command
  { title :: String
  , command :: String
  , arguments :: Array Argonaut.Json
  }

instance encodeJsonCommand :: Argonaut.EncodeJson Command where
  encodeJson (Command rec) = Argonaut.encodeJson rec

sendJsonRpcMessage :: ServerToClientMessage -> Boolean -> Effect.Effect Unit
sendJsonRpcMessage response isLog = do
  binary <- jsonRpcResponseToBinary response isLog
  _ <-
    Stream.writeString
      Process.stdout
      Encoding.UTF8
      binary
      (pure unit)
  pure unit

sendNotificationPublishDiagnostics ::
  { uri :: Uri.Uri, diagnostics :: Array Diagnostic } ->
  Effect.Effect Unit
sendNotificationPublishDiagnostics result =
  sendJsonRpcMessage
    (PublishDiagnostics result)
    true

sendNotificationWindowLogMessage :: String -> Effect.Effect Unit
sendNotificationWindowLogMessage message =
  sendJsonRpcMessage
    (WindowLogMessage message)
    false

jsonRpcResponseToBinary :: ServerToClientMessage -> Boolean -> Effect.Effect String
jsonRpcResponseToBinary response isLog =
  let
    jsonValueAsString :: String
    jsonValueAsString = Argonaut.stringify (jsonRpcResponseToJson response)
  in
    do
      if isLog then
        sendNotificationWindowLogMessage (append "○ client ← server: " jsonValueAsString)
      else
        pure unit
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

jsonRpcResponseToJson :: ServerToClientMessage -> Argonaut.Json
jsonRpcResponseToJson = case _ of
  WindowLogMessage message ->
    Argonaut.encodeJson
      ( JsonRpc.NotificationMessage
          { method: "window/logMessage"
          , params: Just (JsonRpc.paramsFromRecord { type: 3.0, message })
          }
      )
  ResponseInitialize { id, semanticTokensProviderLegendTokenTypes } ->
    Argonaut.encodeJson
      ( JsonRpc.ResponseMessageSuccess
          { id
          , result:
              Argonaut.encodeJson
                { capabilities:
                    { textDocumentSync: 1
                    , semanticTokensProvider:
                        { legend:
                            { tokenTypes: semanticTokensProviderLegendTokenTypes
                            , tokenModifiers: [] :: Array String
                            }
                        , range: false
                        , full: true
                        }
                    , codeLensProvider: { resolveProvider: true }
                    }
                }
          }
      )
  PublishDiagnostics value ->
    Argonaut.encodeJson
      ( JsonRpc.NotificationMessage
          { method: "textDocument/publishDiagnostics"
          , params: Just (JsonRpc.paramsFromRecord value)
          }
      )
  ResponseTextDocumentSemanticTokensFull { id, tokenDataList, tokenTypeDict } ->
    Argonaut.encodeJson
      ( JsonRpc.ResponseMessageSuccess
          { id
          , result:
              Argonaut.encodeJson
                { data: tokenDataListToDataList tokenTypeDict tokenDataList }
          }
      )
  ResponseTextDocumentCodeLens { id, codeLensList } ->
    Argonaut.encodeJson
      (JsonRpc.ResponseMessageSuccess { id, result: Argonaut.encodeJson codeLensList })

tokenDataListToDataList ::
  TokenType.TokenTypeDict ->
  Array TokenType.TokenData ->
  Array Int
tokenDataListToDataList tokenTypeDict tokenDataList =
  ( Array.foldl
        ( \{ beforePosition, result } item@(TokenType.TokenData { start }) ->
            { beforePosition: start
            , result:
                append result
                  ( TokenType.tokenDataToData
                      tokenTypeDict
                      beforePosition
                      item
                  )
            }
        )
        { beforePosition:
            Range.Position
              { line: UInt.fromInt 0
              , character: UInt.fromInt 0
              }
        , result: []
        }
        tokenDataList
    )
    .result
