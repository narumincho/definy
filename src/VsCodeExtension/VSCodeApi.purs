-- | vscode の拡張機能の環境内でのみ動作するモジュール
module VsCodeExtension.VSCodeApi
  ( CompletionItemKind
  , Diagnostic
  , DiagnosticCollection
  , DiagnosticRelatedInformation
  , Location
  , Position
  , Range
  , Uri
  , completionItemKindFunction
  , completionItemKindModule
  , diagnosticCollectionSet
  , languageRegisterSignatureHelpProvider
  , languagesCreateDiagnosticCollection
  , languagesRegisterCompletionItemProvider
  , languagesRegisterDocumentFormattingEditProvider
  , languagesRegisterDocumentSemanticTokensProvider
  , languagesRegisterHoverProvider
  , newDiagnostic
  , newDiagnosticRelatedInformation
  , newLocation
  , newPosition
  , newRange
  , positionGetCharacter
  , positionGetLine
  , rangeContains
  , rangeGetEnd
  , rangeGetStart
  , workspaceOnDidChangeTextDocument
  ) where

import Prelude
import Data.Nullable (Nullable)
import Data.String.NonEmpty (NonEmptyString)
import Data.UInt as UInt
import Effect as Effect
import Effect.Uncurried (EffectFn1)

-- | 文章中の文字の位置の範囲
-- | LSP の仕様により, UTF16 での offset になる
-- | https://microsoft.github.io/language-server-protocol/specifications/specification-3-16/#textDocuments
foreign import data Range :: Type

foreign import data Position :: Type

foreign import data DiagnosticCollection :: Type

foreign import newRange :: Position -> Position -> Range

foreign import rangeGetStart :: Range -> Position

foreign import rangeGetEnd :: Range -> Position

foreign import rangeContains :: Position -> Range -> Boolean

foreign import newPosition :: UInt.UInt -> UInt.UInt -> Position

foreign import positionGetLine :: Position -> UInt.UInt

foreign import positionGetCharacter :: Position -> UInt.UInt

foreign import positionTranslateCharacter :: Int -> Position -> Position

foreign import data Uri :: Type

foreign import data Diagnostic :: Type

foreign import data DiagnosticRelatedInformation :: Type

foreign import data Location :: Type

foreign import languagesCreateDiagnosticCollection ::
  String -> Effect.Effect DiagnosticCollection

foreign import diagnosticCollectionSet ::
  Array { uri :: Uri, diagnosticList :: Array Diagnostic } ->
  DiagnosticCollection ->
  Effect.Effect Unit

foreign import newDiagnostic :: Range -> String -> Array DiagnosticRelatedInformation -> Diagnostic

foreign import newDiagnosticRelatedInformation :: Location -> String -> DiagnosticRelatedInformation

foreign import newLocation :: Uri -> Range -> Location

foreign import languagesRegisterDocumentFormattingEditProvider ::
  { languageId :: NonEmptyString, formatFunc :: String -> String } -> Effect.Effect Unit

foreign import languagesRegisterDocumentSemanticTokensProvider ::
  { languageId :: NonEmptyString
  , semanticTokensProviderFunc :: String -> Array Int
  , semanticTokensProviderLegend :: Array String
  } ->
  Effect.Effect Unit

foreign import languagesRegisterHoverProvider ::
  { languageId :: NonEmptyString
  , func ::
      { code :: String, position :: Position } ->
      Nullable { contents :: String, range :: Range }
  } ->
  Effect.Effect Unit

foreign import languagesRegisterCompletionItemProvider ::
  { languageId :: NonEmptyString
  , func ::
      { code :: String, position :: Position } ->
      Array
        { label :: String
        , description :: String
        , detail :: String
        , kind :: CompletionItemKind
        , documentation :: String
        , commitCharacters :: Array String
        , insertText :: String
        }
  , triggerCharacters :: Array String
  } ->
  Effect.Effect Unit

foreign import data CompletionItemKind :: Type

foreign import completionItemKindFunction :: CompletionItemKind

foreign import completionItemKindModule :: CompletionItemKind

foreign import languageRegisterSignatureHelpProvider ::
  { languageId :: NonEmptyString
  , func ::
      { code :: String, position :: Position } ->
      Nullable
        { signatures :: Array { label :: String, documentation :: String }
        , activeSignature :: UInt.UInt
        , activeParameter :: UInt.UInt
        }
  , triggerCharacters :: Array String
  } ->
  Effect.Effect Unit

foreign import workspaceOnDidChangeTextDocument ::
  EffectFn1 { languageId :: String, uri :: Uri, code :: String } Unit ->
  Effect.Effect Unit
