-- | vscode の拡張機能の環境内でのみ動作するモジュール
module VsCodeExtension.VSCodeApi
  ( CompletionItemKind
  , Diagnostic
  , DiagnosticCollection
  , DiagnosticRelatedInformation
  , ExtensionContext(..)
  , Location
  , Position
  , Range
  , Uri
  , commandsRegisterCommand
  , completionItemKindFunction
  , completionItemKindModule
  , diagnosticCollectionSet
  , languageRegisterDefinitionProvider
  , languageRegisterSignatureHelpProvider
  , languagesCreateDiagnosticCollection
  , languagesRegisterCompletionItemProvider
  , languagesRegisterDocumentFormattingEditProvider
  , languagesRegisterDocumentSemanticTokensProvider
  , languagesRegisterDocumentSymbolProvider
  , languagesRegisterHoverProvider
  , languagesRegisterReferenceProvider
  , newDiagnostic
  , newDiagnosticRelatedInformation
  , newLocation
  , newPosition
  , newRange
  , openTextDocument
  , positionGetCharacter
  , positionGetLine
  , rangeContains
  , rangeGetEnd
  , rangeGetStart
  , uriJoinPath
  , uriToPath
  , uriToString
  , webviewCreateOrShow
  , windowShowInformationMessage
  , workspaceFsWriteFile
  , workspaceOnDidChangeTextDocument
  , workspaceOnDidOpenTextDocument
  , workspaceTextDocuments
  , workspaceWorkspaceFolders
  ) where

import Prelude
import Binary as Binary
import Data.Nullable (Nullable)
import Data.String.NonEmpty (NonEmptyString)
import Data.String.NonEmpty as NonEmptyString
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

instance showUri :: Show Uri where
  show uri = uriToString uri

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
  { context :: ExtensionContext
  , languageId :: NonEmptyString
  , formatFunc :: String -> String
  } ->
  Effect.Effect Unit

foreign import languagesRegisterDocumentSemanticTokensProvider ::
  { context :: ExtensionContext
  , languageId :: NonEmptyString
  , semanticTokensProviderFunc :: String -> Array Int
  , semanticTokensProviderLegend :: Array String
  } ->
  Effect.Effect Unit

foreign import languagesRegisterHoverProvider ::
  { context :: ExtensionContext
  , languageId :: NonEmptyString
  , func ::
      { code :: String, position :: Position } ->
      Nullable { contents :: String, range :: Range }
  } ->
  Effect.Effect Unit

foreign import languagesRegisterCompletionItemProvider ::
  { context :: ExtensionContext
  , languageId :: NonEmptyString
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
  { context :: ExtensionContext
  , languageId :: NonEmptyString
  , func ::
      { code :: String, position :: Position } ->
      Nullable
        { signatures ::
            Array
              { label :: String
              , documentation :: String
              , parameters :: Array { label :: String, documentation :: String }
              }
        , activeSignature :: UInt.UInt
        , activeParameter :: UInt.UInt
        }
  , triggerCharacters :: Array String
  } ->
  Effect.Effect Unit

foreign import languageRegisterDefinitionProvider ::
  { context :: ExtensionContext
  , languageId :: NonEmptyString
  , func ::
      { code :: String, uri :: Uri, position :: Position } -> Nullable Location
  } ->
  Effect.Effect Unit

foreign import languagesRegisterDocumentSymbolProvider ::
  { context :: ExtensionContext
  , languageId :: NonEmptyString
  , func ::
      { code :: String, uri :: Uri } -> Array { name :: NonEmptyString, location :: Location }
  } ->
  Effect.Effect Unit

foreign import languagesRegisterReferenceProvider ::
  { context :: ExtensionContext
  , languageId :: NonEmptyString
  , func ::
      { code :: String, uri :: Uri, position :: Position } -> Array Location
  } ->
  Effect.Effect Unit

foreign import workspaceOnDidChangeTextDocument ::
  { context :: ExtensionContext, callback :: Effect.Effect Unit } ->
  Effect.Effect Unit

foreign import workspaceOnDidOpenTextDocument ::
  { context :: ExtensionContext, callback :: Effect.Effect Unit } ->
  Effect.Effect Unit

foreign import workspaceTextDocuments ::
  EffectFn1 (Array { languageId :: String, uri :: Uri, code :: String }) Unit ->
  Effect.Effect Unit

foreign import workspaceWorkspaceFolders ::
  Effect.Effect
    (Array { index :: Int, name :: String, uri :: Uri })

foreign import workspaceFsWriteFile ::
  { uri :: Uri, content :: Binary.Binary } ->
  Effect.Effect Unit

foreign import uriJoinPath ::
  { uri :: Uri, relativePath :: String } -> Uri

foreign import uriToString ::
  Uri -> String

foreign import uriToPath ::
  Uri -> String

foreign import windowShowInformationMessage ::
  String -> Effect.Effect Unit

data ExtensionContext

foreign import webviewCreateOrShow :: ExtensionContext -> Effect.Effect Unit

foreign import commandsRegisterCommandRaw ::
  { context :: ExtensionContext
  , command :: String
  , callback :: String -> Effect.Effect Unit
  } ->
  Effect.Effect Unit

commandsRegisterCommand ::
  { context :: ExtensionContext
  , command :: NonEmptyString
  , callback :: String -> Effect.Effect Unit
  } ->
  Effect.Effect Unit
commandsRegisterCommand option =
  commandsRegisterCommandRaw
    { context: option.context
    , command: NonEmptyString.toString option.command
    , callback: option.callback
    }

foreign import openTextDocumentRaw :: { content :: String, language :: String } -> Effect.Effect Unit

openTextDocument :: { content :: String, language :: NonEmptyString } -> Effect.Effect Unit
openTextDocument option =
  openTextDocumentRaw
    { content: option.content
    , language: NonEmptyString.toString option.language
    }
