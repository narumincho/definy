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
import Util as Util
import VsCodeExtension.Error as Error
import VsCodeExtension.Evaluate as Evaluate
import VsCodeExtension.LanguageServerLib as Lib
import VsCodeExtension.Parser as Parser
import VsCodeExtension.Range as Range
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
  , codeDict :: Map.Map Uri.Uri Parser.CodeTree
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
            codeTree = stringToCodeTree text
          in
            do
              Ref.modify_
                ( \(State stateRec) ->
                    State
                      ( stateRec
                          { codeDict = Map.insert uri codeTree stateRec.codeDict }
                      )
                )
                state
              sendError uri codeTree
        Either.Right (Lib.TextDocumentDidChange { uri, text }) ->
          let
            codeTree = stringToCodeTree text
          in
            do
              Ref.modify_
                ( \(State stateRec) ->
                    State
                      ( stateRec
                          { codeDict =
                            Map.insert uri (stringToCodeTree text)
                              stateRec.codeDict
                          }
                      )
                )
                state
              sendError uri codeTree
        Either.Right (Lib.TextDocumentDidSave { uri }) -> do
          (State { codeDict }) <- Ref.read state
          case Map.lookup uri codeDict of
            Just codeTree -> do
              Aff.runAff_
                ( \result ->
                    Lib.sendNotificationWindowLogMessage
                      (append "書き込み完了した " (show result))
                )
                ( Aff.attempt
                    ( Write.writeTextFilePathFileProtocol uri
                        (ToString.codeTreeToString codeTree)
                    )
                )
              Lib.sendNotificationWindowLogMessage
                "フォーマットした内容で書き込みます"
            Nothing -> Lib.sendNotificationWindowLogMessage "ファイルの情報が1度も来ていない..?"
        Either.Right (Lib.TextDocumentSemanticTokensFull { id, uri }) -> do
          (State { tokenTypeDict, codeDict }) <- Ref.read state
          case Map.lookup uri codeDict of
            Just code ->
              Lib.responseTextDocumentSemanticTokensFull
                { id
                , tokenTypeDict
                , tokenDataList: SemanticToken.evaluateTreeToTokenData (Evaluate.codeTreeToEvaluatedTreeIContextNormal code)
                }
            Nothing -> Lib.sendNotificationWindowLogMessage "TextDocumentSemanticTokensFullされた けどコードを取得できていない..."
        Either.Right (Lib.TextDocumentCodeLens { uri, id }) -> do
          (State { codeDict }) <- Ref.read state
          case Map.lookup uri codeDict of
            Just code -> do
              Lib.responseTextDocumentCodeLens
                { id
                , codeLensList:
                    calculateCodeLens
                      (Evaluate.codeTreeToEvaluatedTreeIContextNormal code)
                }
            Nothing -> Lib.sendNotificationWindowLogMessage "codelens取得内でコードを取得できていない..."
        Either.Right (Lib.TextDocumentHover { id, position, uri }) -> do
          (State { codeDict }) <- Ref.read state
          case Map.lookup uri codeDict of
            Just code ->
              Lib.responseHover
                { id
                , hover:
                    Lib.Hover
                      { contents:
                          Lib.MarkupContent
                            { kind: Lib.Markdown
                            , value: Util.unknownValueToString (Evaluate.codeTreeToEvaluatedTreeIContextNormal code)
                            }
                      , range: Range.Range { start: position, end: position }
                      }
                }
            Nothing -> Lib.sendNotificationWindowLogMessage "hover のコードを受け取っていない..."
        Either.Left message -> Lib.sendNotificationWindowLogMessage message
    )

stringToCodeTree :: String -> Parser.CodeTree
stringToCodeTree code =
  Parser.parse
    (SimpleToken.tokenListToSimpleTokenList (Tokenize.tokenize code))

calculateCodeLens :: Evaluate.EvaluatedTree -> Array Lib.CodeLens
calculateCodeLens (Evaluate.EvaluatedTree { item, range, children }) = case item of
  Evaluate.Part (Evaluate.PartialPart { value }) ->
    Array.cons
      ( Lib.CodeLens
          { command: calculateCodeLensCommand value
          , range: range
          }
      )
      (bind children calculateCodeLens)
  _ -> bind children calculateCodeLens

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

sendError :: Uri.Uri -> Parser.CodeTree -> Effect.Effect Unit
sendError uri codeTree =
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
          (Error.getErrorList (Evaluate.codeTreeToEvaluatedTreeIContextNormal codeTree))
    , uri
    }
