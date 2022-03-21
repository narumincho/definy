module VsCodeExtension.VSCodeApi
  ( Diagnostic
  , DiagnosticCollection
  , DiagnosticRelatedInformation
  , Location
  , Position
  , Range
  , Uri
  , diagnosticCollectionSet
  , languagesCreateDiagnosticCollection
  , languagesRegisterDocumentFormattingEditProvider
  , languagesRegisterDocumentSemanticTokensProvider
  , languagesRegisterHoverProvider
  , newDiagnostic
  , newDiagnosticRelatedInformation
  , newLocation
  , newPosition
  , newRange
  , positionAdd1Character
  , positionGetCharacter
  , positionGetLine
  , positionSub1Character
  , rangeContains
  , rangeGetEnd
  , rangeGetStart
  , workspaceOnDidChangeTextDocument
  ) where

import Prelude
import Data.Nullable (Nullable)
import Data.String as String
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

foreign import rangeEqual :: Range -> Range -> Boolean

instance eqRange :: Eq Range where
  eq a b = rangeEqual a b

instance showRange :: Show Range where
  show range =
    String.joinWith "→"
      [ show (rangeGetStart range), show (rangeGetEnd range) ]

foreign import newPosition :: UInt.UInt -> UInt.UInt -> Position

foreign import positionGetLine :: Position -> UInt.UInt

foreign import positionGetCharacter :: Position -> UInt.UInt

foreign import positionTranslateCharacter :: Int -> Position -> Position

foreign import data Uri :: Type

foreign import data Diagnostic :: Type

foreign import data DiagnosticRelatedInformation :: Type

foreign import data Location :: Type

positionAdd1Character :: Position -> Position
positionAdd1Character = positionTranslateCharacter 1

positionSub1Character :: Position -> Position
positionSub1Character = positionTranslateCharacter (-1)

instance showPosition :: Show Position where
  show position =
    String.joinWith ""
      [ "("
      , UInt.toString (positionGetLine position)
      , ","
      , UInt.toString (positionGetCharacter position)
      , ")"
      ]

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

foreign import workspaceOnDidChangeTextDocument ::
  EffectFn1 { languageId :: String, uri :: Uri, code :: String } Unit ->
  Effect.Effect Unit
