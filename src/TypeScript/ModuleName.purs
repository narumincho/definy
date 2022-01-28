module TypeScript.ModuleName
  ( ModuleName
  , class CheckNonEmpty
  , fromNonEmptyString
  , fromSymbolProxy
  , fromSymbolProxyUnsafe
  , toFileSystemName
  , toNonEmptyString
  ) where

import Prelude as Prelude
import Data.Either as Either
import Data.Maybe (Maybe(..))
import Data.String.NonEmpty (NonEmptyString)
import Data.String.NonEmpty as NonEmptyString
import Data.String.Regex as Regex
import Data.String.Regex.Flags as RegexFlags
import Data.Symbol as Symbol
import FileSystem.Name as FileSystemName
import Prim.TypeError as TypeError
import Type.Proxy (Proxy(..))

newtype ModuleName
  = ModuleName NonEmptyString

derive instance eqModuleName :: Prelude.Eq ModuleName

derive instance ordModuleName :: Prelude.Ord ModuleName

safePatternEither :: Either.Either String Regex.Regex
safePatternEither = Regex.regex "^[a-zA-Z0-9-_]+$" RegexFlags.unicode

-- | 適切なモジュール名か検査する. ファイルシステムに使えない名前も作れない
fromNonEmptyString :: NonEmptyString -> Maybe ModuleName
fromNonEmptyString name = case safePatternEither of
  Either.Right safePattern ->
    if Regex.test safePattern (NonEmptyString.toString name) then case FileSystemName.fromNonEmptyString name of
      Just _ ->
        Just
          (ModuleName name)
      Nothing -> Nothing
    else
      Nothing
  Either.Left _ -> Nothing

toNonEmptyString :: ModuleName -> NonEmptyString
toNonEmptyString (ModuleName str) = str

fromSymbolProxyUnsafe :: forall (symbol :: Symbol). CheckNonEmpty symbol => Proxy symbol -> ModuleName
fromSymbolProxyUnsafe = fromSymbolProxy

class CheckNonEmpty (symbol :: Symbol) where
  fromSymbolProxy :: Proxy symbol -> ModuleName

instance checkNonEmptyEmpty :: (TypeError.Fail (TypeError.Text "empty TypeScript Module Name is Invalid")) => CheckNonEmpty "" where
  fromSymbolProxy _ =
    ModuleName
      (NonEmptyString.nes (Proxy :: Proxy "error empty module name"))
else instance checkNonEmptyNonEmpty :: (Symbol.IsSymbol symbol) => CheckNonEmpty symbol where
  fromSymbolProxy _ =
    ModuleName
      ( case NonEmptyString.fromString (Symbol.reflectSymbol (Proxy :: Proxy symbol)) of
          Just nonEmpty -> nonEmpty
          Nothing -> NonEmptyString.nes (Proxy :: Proxy "error empty module name")
      )

toFileSystemName :: ModuleName -> FileSystemName.Name
toFileSystemName moduleName = FileSystemName.fromNonEmptyStringUnsafe (toNonEmptyString moduleName)
