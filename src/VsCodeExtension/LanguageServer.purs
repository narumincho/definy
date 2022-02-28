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
import VsCodeExtension.Range as Range
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
        Either.Right (Lib.TextDocumentHover { id, position, uri }) -> do
          (State { codeDict }) <- Ref.read state
          case Map.lookup uri codeDict of
            Just _ ->
              Lib.responseHover
                { id
                , hover:
                    Lib.Hover
                      { contents:
                          Lib.MarkupContent
                            { kind: Lib.Markdown
                            , value:
                                """# ホバーテスト

```definy
module(それな def(part(partName description add(1 add(2) ))))
```

[ナルミンチョの創作記録](https://narumincho.com "タイトル")

| Left align | Right align | Center align |
| :--------- | ----------: | :----------: |
| a          |           d |      g       |
| b          |           e |      h       |
| c          |           f |      i       |


![dataURLテスト](data:image/png;base64,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)
```
"""
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
