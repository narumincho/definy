module VsCodeExtension.Lsp
  ( main
  ) where

import Prelude
import Data.Array as Array
import Data.Either as Either
import Data.UInt as UInt
import Data.Map as Map
import Data.Maybe (Maybe(..))
import Effect as Effect
import Effect.Aff as Aff
import Effect.Ref as Ref
import FileSystem.Write as Write
import VsCodeExtension.LspLib as LspLib
import VsCodeExtension.Parser as Parser
import VsCodeExtension.Range as Range
import VsCodeExtension.SimpleToken as SimpleToken
import VsCodeExtension.ToString as ToString
import VsCodeExtension.TokenType as TokenType
import VsCodeExtension.Tokenize as Tokenize

newtype State
  = State
  { supportPublishDiagnostics :: Boolean
  , tokenTypeDict :: TokenType.TokenTypeDict
  , codeDict :: Map.Map LspLib.Uri String
  }

main :: Effect.Effect Unit
main = do
  parseStateRef <-
    LspLib.createJsonRpcRequestListParseStateRef
  state <-
    Ref.new
      ( State
          { supportPublishDiagnostics: false
          , tokenTypeDict: TokenType.dictEmpty
          , codeDict: Map.empty
          }
      )
  LspLib.receiveJsonRpcMessage
    parseStateRef
    ( case _ of
        Either.Right (LspLib.Initialize rec) -> do
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
          LspLib.sendJsonRpcMessage
            ( LspLib.ResponseInitialize
                { id: rec.id
                , semanticTokensProviderLegendTokenTypes: supportTokenType
                }
            )
            true
        Either.Right LspLib.Initialized -> LspLib.sendNotificationWindowLogMessage "Initializedされた!"
        Either.Right (LspLib.TextDocumentDidOpen { uri, text }) -> do
          Ref.modify_
            ( \(State stateRec) ->
                State
                  (stateRec { codeDict = Map.insert uri text stateRec.codeDict })
            )
            state
        Either.Right (LspLib.TextDocumentDidChange { uri, text }) -> do
          Ref.modify_
            ( \(State stateRec) ->
                State
                  (stateRec { codeDict = Map.insert uri text stateRec.codeDict })
            )
            state
        Either.Right (LspLib.TextDocumentDidSave { uri }) -> do
          (State { codeDict }) <- Ref.read state
          case Map.lookup uri codeDict of
            Just code -> do
              Aff.runAff_
                ( \result ->
                    LspLib.sendNotificationWindowLogMessage
                      (append "書き込み完了した " (show result))
                )
                ( Aff.attempt
                    ( Write.writeTextFilePathFileProtocol (LspLib.uriToString uri)
                        ( ToString.codeTreeToString
                            ( Parser.parse
                                (SimpleToken.tokenListToSimpleTokenList (Tokenize.tokenize code))
                            )
                        )
                    )
                )
              LspLib.sendNotificationWindowLogMessage
                "フォーマットした内容で書き込みます"
            Nothing -> LspLib.sendNotificationWindowLogMessage "ファイルの情報が1度も来ていない..?"
        Either.Right (LspLib.TextDocumentSemanticTokensFull { id, uri }) -> do
          (State { tokenTypeDict, codeDict }) <- Ref.read state
          case Map.lookup uri codeDict of
            Just code ->
              let
                tokenList = Tokenize.tokenize code
              in
                do
                  LspLib.sendNotificationWindowLogMessage (append "tokenList: " (show tokenList))
                  LspLib.sendJsonRpcMessage
                    ( LspLib.ResponseTextDocumentSemanticTokensFull
                        { id
                        , tokenTypeDict
                        , tokenDataList:
                            Array.mapMaybe
                              Tokenize.tokenWithRangeToTokenTypeAndRangeTuple
                              tokenList
                        }
                    )
                    true
            Nothing -> LspLib.sendNotificationWindowLogMessage "TextDocumentSemanticTokensFullされた けどコードを取得できていない..."
        Either.Right (LspLib.TextDocumentCodeLens { id }) ->
          LspLib.sendJsonRpcMessage
            ( LspLib.ResponseTextDocumentCodeLens
                { id
                , codeLensList:
                    [ LspLib.CodeLens
                        { command:
                            LspLib.Command
                              { title: "メッセージを表示"
                              , command: testCommandKey
                              }
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
        Either.Left message -> LspLib.sendNotificationWindowLogMessage message
    )

testCommandKey :: String
testCommandKey = "definy.testCommand"
