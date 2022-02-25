module VsCodeExtension.Evaluate
  ( evaluate
  ) where

import Prelude
import Data.Array as Array
import Data.Maybe (Maybe(..))
import Data.String.NonEmpty as NonEmptyString
import Data.Tuple as Tuple
import Data.UInt as UInt
import Type.Proxy (Proxy(..))
import VsCodeExtension.Parser as Parser

evaluate :: Parser.CodeTree -> Maybe UInt.UInt
evaluate (Parser.CodeTree { name, children }) =
  if eq name (NonEmptyString.nes (Proxy :: _ "add")) then case Tuple.Tuple (Array.index children 0) (Array.index children 1) of
    Tuple.Tuple (Just a) (Just b) -> case Tuple.Tuple (evaluate a) (evaluate b) of
      Tuple.Tuple (Just aValue) (Just bValue) -> Just (add aValue bValue)
      Tuple.Tuple _ _ -> Nothing
    Tuple.Tuple _ _ -> Nothing
  else
    UInt.fromString (NonEmptyString.toString name)
