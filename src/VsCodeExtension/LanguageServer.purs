module VsCodeExtension.LanguageServer
  ( main
  ) where

import Prelude
import Data.Argonaut as Argonaut
import Data.Array as Array
import Data.Either as Either
import Data.Map as Map
import Data.Maybe (Maybe(..))
import Data.String.NonEmpty as NonEmptyString
import Data.UInt as UInt
import Effect as Effect
import Effect.Aff as Aff
import Effect.Ref as Ref
import FileSystem.Write as Write
import VsCodeExtension.Error as Error
import VsCodeExtension.Evaluate as Evaluate
import VsCodeExtension.Hover as Hover
import VsCodeExtension.LanguageServerLib as Lib
import VsCodeExtension.Parser as Parser
import VsCodeExtension.SemanticToken as SemanticToken
import VsCodeExtension.SimpleToken as SimpleToken
import VsCodeExtension.ToString as ToString
import VsCodeExtension.TokenType as TokenType
import VsCodeExtension.Tokenize as Tokenize
import VsCodeExtension.Uri as Uri

newtype State
  = State
  { supportPublishDiagnostics :: Boolean
  , tokenTypeDict :: TokenType.TokenTypeDict
  , codeDict :: Map.Map Uri.Uri Evaluate.EvaluatedTree
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
          Lib.responseInitialize
            { id: rec.id
            , semanticTokensProviderLegendTokenTypes: supportTokenType
            }
        Either.Right Lib.Initialized -> Lib.sendNotificationWindowLogMessage "Initializedされた!"
        Either.Right (Lib.TextDocumentDidOpen { uri, text }) ->
          let
            evaluatedTree = stringToEvaluatedTree text
          in
            do
              Ref.modify_
                ( \(State stateRec) ->
                    State
                      ( stateRec
                          { codeDict = Map.insert uri evaluatedTree stateRec.codeDict }
                      )
                )
                state
              sendError uri evaluatedTree
        Either.Right (Lib.TextDocumentDidChange { uri, text }) ->
          let
            evaluatedTree = stringToEvaluatedTree text
          in
            do
              Ref.modify_
                ( \(State stateRec) ->
                    State
                      ( stateRec
                          { codeDict =
                            Map.insert uri evaluatedTree
                              stateRec.codeDict
                          }
                      )
                )
                state
              sendError uri evaluatedTree
        Either.Right (Lib.TextDocumentDidSave {}) -> do
          pure unit
        Either.Right (Lib.TextDocumentSemanticTokensFull { id, uri }) -> do
          (State { tokenTypeDict, codeDict }) <- Ref.read state
          case Map.lookup uri codeDict of
            Just evaluatedTree ->
              Lib.responseTextDocumentSemanticTokensFull
                { id
                , tokenTypeDict
                , tokenDataList: SemanticToken.evaluateTreeToTokenData evaluatedTree
                }
            Nothing -> Lib.sendNotificationWindowLogMessage "TextDocumentSemanticTokensFullされた けどコードを取得できていない..."
        Either.Right (Lib.TextDocumentCodeLens { uri, id }) -> do
          (State { codeDict }) <- Ref.read state
          case Map.lookup uri codeDict of
            Just evaluatedTree -> do
              Lib.responseTextDocumentCodeLens
                { id
                , codeLensList:
                    calculateCodeLens evaluatedTree
                }
            Nothing -> Lib.sendNotificationWindowLogMessage "codelens取得内でコードを取得できていない..."
        Either.Right (Lib.TextDocumentHover { id, position, uri }) -> do
          (State { codeDict }) <- Ref.read state
          case Map.lookup uri codeDict of
            Just evaluatedTree ->
              Lib.responseHover
                { id
                , hover:
                    Hover.getHoverData position evaluatedTree
                }
            Nothing -> Lib.sendNotificationWindowLogMessage "hover のコードを受け取っていない..."
        Either.Left message -> Lib.sendNotificationWindowLogMessage message
    )

stringToEvaluatedTree :: String -> Evaluate.EvaluatedTree
stringToEvaluatedTree code =
  Evaluate.codeTreeToEvaluatedTreeIContextNormal
    ( Parser.parse
        (SimpleToken.tokenListToSimpleTokenList (Tokenize.tokenize code))
    )

calculateCodeLens :: Evaluate.EvaluatedTree -> Array Lib.CodeLens
calculateCodeLens (Evaluate.EvaluatedTree { item, range, children }) = case item of
  Evaluate.Part (Evaluate.PartialPart { value }) ->
    Array.cons
      ( Lib.CodeLens
          { command: calculateCodeLensCommand value
          , range: range
          }
      )
      (bind children (\(Evaluate.EvaluatedTreeChild { child }) -> calculateCodeLens child))
  _ -> bind children (\(Evaluate.EvaluatedTreeChild { child }) -> calculateCodeLens child)

calculateCodeLensCommand :: Maybe UInt.UInt -> Lib.Command
calculateCodeLensCommand valueMaybe =
  let
    result :: String
    result = case valueMaybe of
      Just value -> UInt.toString value
      Nothing -> "エラー"
  in
    Lib.Command
      { title:
          append (append "評価結果: " result) " 評価結果を新たなファイルとして表示"
      , command: "definy.showEvaluatedValue"
      , arguments: [ Argonaut.fromString result ]
      }

sendError :: Uri.Uri -> Evaluate.EvaluatedTree -> Effect.Effect Unit
sendError uri tree =
  Lib.sendNotificationPublishDiagnostics
    { diagnostics:
        map
          ( \(Error.ErrorWithRange { error, range }) ->
              Lib.Diagnostic
                { message: Error.errorToString error
                , range
                , relatedInformation:
                    ( case error of
                        Error.SuperfluousParameter { name, nameRange } ->
                          [ Lib.DiagnosticRelatedInformation
                              { location:
                                  Lib.Location
                                    { uri
                                    , range: nameRange
                                    }
                              , message: NonEmptyString.toString name
                              }
                          ]
                        Error.NeedParameter { name, nameRange } ->
                          [ Lib.DiagnosticRelatedInformation
                              { location:
                                  Lib.Location
                                    { uri
                                    , range: nameRange
                                    }
                              , message: NonEmptyString.toString name
                              }
                          ]
                        _ -> []
                    )
                }
          )
          (Error.getErrorList tree)
    , uri
    }
