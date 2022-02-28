module VsCodeExtension.LanguageServer
  ( main
  ) where

import Prelude
import Data.Argonaut as Argonaut
import Data.Either as Either
import Data.Map as Map
import Data.Maybe (Maybe(..))
import Data.String.NonEmpty as NonEmptyString
import Data.UInt as UInt
import Effect as Effect
import Effect.Aff as Aff
import Effect.Ref as Ref
import FileSystem.Write as Write
import VsCodeExtension.Evaluate as Evaluate
import VsCodeExtension.LanguageServerLib as Lib
import VsCodeExtension.Parser as Parser
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
                , tokenDataList: Parser.codeTreeToTokenData code
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
                      ( Evaluate.withErrorResultGetValue
                          (Evaluate.evaluateModule code)
                      )
                }
            Nothing -> Lib.sendNotificationWindowLogMessage "codelens取得内でコードを取得できていない..."
        Either.Left message -> Lib.sendNotificationWindowLogMessage message
    )

stringToCodeTree :: String -> Parser.CodeTree
stringToCodeTree code =
  Parser.parse
    (SimpleToken.tokenListToSimpleTokenList (Tokenize.tokenize code))

calculateCodeLens :: Evaluate.PartialModule -> Array Lib.CodeLens
calculateCodeLens partialModule =
  let
    (Evaluate.PartialModule { value }) = partialModule
  in
    map
      ( \(Evaluate.PartialPart { value: partValue, range: partRange }) ->
          Lib.CodeLens
            { command: calculateCodeLensCommand partValue
            , range: partRange
            }
      )
      value

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
          ( \(Evaluate.ErrorWithRange { error, range }) ->
              Lib.Diagnostic
                { message: Evaluate.errorToString error
                , range
                , relatedInformation:
                    ( case error of
                        Evaluate.SuperfluousParameter { name, nameRange } ->
                          [ Lib.DiagnosticRelatedInformation
                              { location:
                                  Lib.Location
                                    { uri
                                    , range: nameRange
                                    }
                              , message: NonEmptyString.toString name
                              }
                          ]
                        Evaluate.NeedParameter { name, nameRange } ->
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
          (Evaluate.withErrorResultGetErrorList (Evaluate.evaluateModule codeTree))
    , uri
    }
