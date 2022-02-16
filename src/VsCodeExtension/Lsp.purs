module VsCodeExtension.Lsp
  ( main
  ) where

import Prelude
import Data.Either as Either
import Data.Map as Map
import Effect as Effect
import Effect.Ref as Ref
import VsCodeExtension.TokenType as TokenType
import VsCodeExtension.LspLib as LspLib

newtype State
  = State
  { supportPublishDiagnostics :: Boolean
  , tokenTypeDict :: TokenType.TokenTypeDict
  , codeDict :: Map.Map String String
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
          LspLib.sendJsonRpcMessage (LspLib.WindowLogMessage "Initializeされた!")
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
        Either.Right LspLib.Initialized ->
          LspLib.sendJsonRpcMessage
            (LspLib.WindowLogMessage "Initializedされた!")
        Either.Right (LspLib.TextDocumentDidOpen { uri, text }) -> do
          Ref.modify_
            ( \(State stateRec) ->
                State
                  (stateRec { codeDict = Map.insert uri text stateRec.codeDict })
            )
            state
          LspLib.sendJsonRpcMessage
            (LspLib.WindowLogMessage "TextDocumentDidOpenされた!")
        Either.Right (LspLib.TextDocumentDidChange _) ->
          LspLib.sendJsonRpcMessage
            (LspLib.WindowLogMessage "TextDocumentDidChangeされた!")
        Either.Right (LspLib.TextDocumentSemanticTokensFull { id }) -> do
          (State { tokenTypeDict }) <- Ref.read state
          LspLib.sendJsonRpcMessage
            (LspLib.ResponseTextDocumentSemanticTokensFull { id, tokenTypeDict, data: [] })
          LspLib.sendJsonRpcMessage
            (LspLib.WindowLogMessage "TextDocumentSemanticTokensFullされた!")
        Either.Left message -> LspLib.sendJsonRpcMessage (LspLib.WindowLogMessage message)
    )
