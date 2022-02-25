module VsCodeExtension.LanguageServer
  ( main
  ) where

import Prelude
import Data.Argonaut as Argonaut
import Data.Array as Array
import Data.Either as Either
import Data.Map as Map
import Data.Maybe (Maybe(..))
import Data.UInt as UInt
import Effect as Effect
import Effect.Aff as Aff
import Effect.Ref as Ref
import FileSystem.Write as Write
import VsCodeExtension.Evaluate as Evaluate
import VsCodeExtension.LanguageServerLib as Lib
import VsCodeExtension.Parser as Parser
import VsCodeExtension.Range as Range
import VsCodeExtension.SimpleToken as SimpleToken
import VsCodeExtension.ToString as ToString
import VsCodeExtension.TokenType as TokenType
import VsCodeExtension.Tokenize as Tokenize
import VsCodeExtension.Uri as Uri

newtype State
  = State
  { supportPublishDiagnostics :: Boolean
  , tokenTypeDict :: TokenType.TokenTypeDict
  , codeDict :: Map.Map Uri.Uri String
  }

main :: Effect.Effect Unit
main = do
  parseStateRef <-
    Lib.createJsonRpcRequestListParseStateRef
  state <-
    Ref.new
      ( State
          { supportPublishDiagnostics: false
          , tokenTypeDict: TokenType.dictEmpty
          , codeDict: Map.empty
          }
      )
  Lib.receiveJsonRpcMessage
    parseStateRef
    ( case _ of
        Either.Right (Lib.Initialize rec) -> do
          let
            { tokenTypeDict, supportTokenType } = TokenType.createTokenTypeDictAndSupportTokenList rec.supportTokenTypes
          Ref.modify_
            ( \(State stateRec) ->
                State
                  ( stateRec
                      { supportPublishDiagnostics = rec.supportPublishDiagnostics
                      , tokenTypeDict = tokenTypeDict
                      }
                  )
            )
            state
          Lib.sendJsonRpcMessage
            ( Lib.ResponseInitialize
                { id: rec.id
                , semanticTokensProviderLegendTokenTypes: supportTokenType
                }
            )
            true
        Either.Right Lib.Initialized -> Lib.sendNotificationWindowLogMessage "Initializedされた!"
        Either.Right (Lib.TextDocumentDidOpen { uri, text }) -> do
          Ref.modify_
            ( \(State stateRec) ->
                State
                  (stateRec { codeDict = Map.insert uri text stateRec.codeDict })
            )
            state
        Either.Right (Lib.TextDocumentDidChange { uri, text }) -> do
          Ref.modify_
            ( \(State stateRec) ->
                State
                  (stateRec { codeDict = Map.insert uri text stateRec.codeDict })
            )
            state
        Either.Right (Lib.TextDocumentDidSave { uri }) -> do
          (State { codeDict }) <- Ref.read state
          case Map.lookup uri codeDict of
            Just code -> do
              Aff.runAff_
                ( \result ->
                    Lib.sendNotificationWindowLogMessage
                      (append "書き込み完了した " (show result))
                )
                ( Aff.attempt
                    ( Write.writeTextFilePathFileProtocol uri
                        ( ToString.codeTreeToString
                            ( Parser.parse
                                (SimpleToken.tokenListToSimpleTokenList (Tokenize.tokenize code))
                            )
                        )
                    )
                )
              Lib.sendNotificationWindowLogMessage
                "フォーマットした内容で書き込みます"
            Nothing -> Lib.sendNotificationWindowLogMessage "ファイルの情報が1度も来ていない..?"
        Either.Right (Lib.TextDocumentSemanticTokensFull { id, uri }) -> do
          (State { tokenTypeDict, codeDict }) <- Ref.read state
          case Map.lookup uri codeDict of
            Just code ->
              let
                tokenList = Tokenize.tokenize code
              in
                do
                  Lib.sendNotificationWindowLogMessage (append "tokenList: " (show tokenList))
                  Lib.sendJsonRpcMessage
                    ( Lib.ResponseTextDocumentSemanticTokensFull
                        { id
                        , tokenTypeDict
                        , tokenDataList:
                            Array.mapMaybe
                              Tokenize.tokenWithRangeToTokenTypeAndRangeTuple
                              tokenList
                        }
                    )
                    true
            Nothing -> Lib.sendNotificationWindowLogMessage "TextDocumentSemanticTokensFullされた けどコードを取得できていない..."
        Either.Right (Lib.TextDocumentCodeLens { uri, id }) -> do
          (State { codeDict }) <- Ref.read state
          case Map.lookup uri codeDict of
            Just code ->
              let
                tokenList = Tokenize.tokenize code
              in
                do
                  Lib.sendNotificationWindowLogMessage (append "tokenList: " (show tokenList))
                  Lib.sendJsonRpcMessage
                    ( Lib.ResponseTextDocumentCodeLens
                        { id
                        , codeLensList:
                            [ Lib.CodeLens
                                { command:
                                    showEvaluatedValue
                                      ( Evaluate.evaluate
                                          ( Parser.parse
                                              (SimpleToken.tokenListToSimpleTokenList (Tokenize.tokenize code))
                                          )
                                      )
                                , range:
                                    Range.Range
                                      { start:
                                          Range.Position
                                            { line: UInt.fromInt 0
                                            , character: UInt.fromInt 0
                                            }
                                      , end:
                                          Range.Position
                                            { line: UInt.fromInt 0
                                            , character: UInt.fromInt 1
                                            }
                                      }
                                }
                            ]
                        }
                    )
                    true
            Nothing -> Lib.sendNotificationWindowLogMessage "codelens取得内でコードを取得できていない..."
        Either.Left message -> Lib.sendNotificationWindowLogMessage message
    )

showEvaluatedValue :: Maybe UInt.UInt -> Lib.Command
showEvaluatedValue valueMaybe =
  let
    result :: String
    result = case valueMaybe of
      Just value -> UInt.toString value
      Nothing -> "エラー"
  in
    Lib.Command
      { title:
          append "評価結果を通知に表示. 評価結果: " result
      , command: "definy.showEvaluatedValue"
      , arguments: [ Argonaut.fromString result ]
      }
