module VsCodeExtension.SignatureHelp
  ( getSignatureHelp
  , triggerCharacters
  ) where

import Data.Array as Array
import Data.Maybe (Maybe(..))
import Data.String.NonEmpty (NonEmptyString)
import Data.String.NonEmpty as NonEmptyString
import Data.UInt as UInt
import Markdown as Markdown
import VsCodeExtension.Evaluate as Evaluate
import VsCodeExtension.Range as Range

triggerCharacters :: Array String
triggerCharacters = [ "(", " " ]

getSignatureHelp ::
  { tree :: Evaluate.EvaluatedTree, position :: Range.Position } ->
  Maybe
    { label :: String
    , documentation :: Markdown.Markdown
    , parameters :: Array { label :: String, documentation :: String }
    , activeParameter :: UInt.UInt
    }
getSignatureHelp { tree: Evaluate.EvaluatedTree { children }, position } = case Array.findMap
    (\(Evaluate.EvaluatedTreeChild { child }) -> getData position child)
    children of
  Just name ->
    Just
      { label: NonEmptyString.toString name
      , documentation: Markdown.Markdown []
      , parameters: [ { label: "パラメーター名", documentation: "パラメーターの説明" } ]
      , activeParameter: UInt.fromInt 0
      }
  Nothing -> Nothing

getData :: Range.Position -> Evaluate.EvaluatedTree -> Maybe NonEmptyString
getData position (Evaluate.EvaluatedTree { name, nameRange, children }) =
  if Range.isPositionInsideRange nameRange position then
    Just name
  else
    Array.findMap (\(Evaluate.EvaluatedTreeChild { child }) -> getData position child) children
