module VsCodeExtension.VSCodeApi
  ( DiagnosticCollection
  , Position
  , Range
  , languagesCreateDiagnosticCollection
  , languagesRegisterDocumentFormattingEditProvider
  , languagesRegisterDocumentSemanticTokensProvider
  , languagesRegisterHoverProvider
  , newPosition
  , newRange
  , workspaceOnDidChangeTextDocument
  ) where

import Prelude
import Effect as Effect
import Effect.Uncurried (EffectFn1)

foreign import data Range :: Type

foreign import data Position :: Type

foreign import data DiagnosticCollection :: Type

foreign import newRange :: Position -> Position -> Range

foreign import newPosition :: Int -> Int -> Position

foreign import languagesCreateDiagnosticCollection ::
  String -> Effect.Effect DiagnosticCollection

foreign import languagesRegisterDocumentFormattingEditProvider ::
  { languageId :: String, formatFunc :: String -> String } -> Effect.Effect Unit

foreign import languagesRegisterDocumentSemanticTokensProvider ::
  { languageId :: String
  , semanticTokensProviderFunc :: String -> Array Int
  , semanticTokensProviderLegend :: Array String
  } ->
  Effect.Effect Unit

foreign import languagesRegisterHoverProvider ::
  { languageId :: String
  , func ::
      { code :: String, position :: Position } ->
      { markdown :: String, range :: Range }
  } ->
  Effect.Effect Unit

foreign import workspaceOnDidChangeTextDocument ::
  { callback ::
      EffectFn1 { languageId :: String, code :: String } Unit
  } ->
  Effect.Effect Unit
