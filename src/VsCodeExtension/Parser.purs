module VsCodeExtension.Parser
  ( CodeTree(..)
  , parse
  ) where

import Data.UInt as UInt
import Data.Array as Array
import Data.Array.NonEmpty (NonEmptyArray)
import Data.Array.NonEmpty as NonEmptyArray
import Data.Generic.Rep as GenericRep
import Data.Maybe (Maybe(..))
import Data.Show.Generic as ShowGeneric
import Data.String.NonEmpty (NonEmptyString)
import Data.String.NonEmpty as NonEmptyString
import Prelude as Prelude
import Type.Proxy (Proxy(..))
import VsCodeExtension.SimpleToken as SimpleToken
import VsCodeExtension.VSCodeApi as VSCodeApi

newtype CodeTree
  = CodeTree
  { name :: NonEmptyString
  , nameRange :: VSCodeApi.Range
  , children :: Array CodeTree
  , range :: VSCodeApi.Range
  }

derive instance eqCodeTree :: Prelude.Eq CodeTree

derive instance genericCodeTree :: GenericRep.Generic CodeTree _

instance showCodeTree :: Prelude.Show CodeTree where
  show codeTree = ShowGeneric.genericShow codeTree

parse :: Array SimpleToken.SimpleTokenWithRange -> CodeTree
parse simpleTokenList = case Array.uncons simpleTokenList of
  Just { head: SimpleToken.SimpleTokenWithRange { simpleToken, range }, tail } -> case simpleToken of
    SimpleToken.Start { name } -> case NonEmptyArray.fromArray tail of
      Just tailNonEmpty ->
        let
          firstItem = simpleTokenListToCodeTreeListWithRest tailNonEmpty
        in
          CodeTree
            { name
            , nameRange: range
            , children: firstItem.codeTreeList
            , range:
                VSCodeApi.newRange
                  (VSCodeApi.rangeGetStart range)
                  firstItem.endPosition
            }
      Nothing ->
        CodeTree
          { name
          , nameRange: range
          , children: []
          , range: range
          }
    SimpleToken.End -> parse tail
  Nothing -> emptyCodeTree

emptyCodeTree :: CodeTree
emptyCodeTree =
  CodeTree
    { name: NonEmptyString.nes (Proxy :: Proxy "module")
    , nameRange:
        VSCodeApi.newRange
          (VSCodeApi.newPosition (UInt.fromInt 0) (UInt.fromInt 0))
          (VSCodeApi.newPosition (UInt.fromInt 0) (UInt.fromInt 0))
    , children: []
    , range:
        VSCodeApi.newRange
          (VSCodeApi.newPosition (UInt.fromInt 0) (UInt.fromInt 0))
          (VSCodeApi.newPosition (UInt.fromInt 0) (UInt.fromInt 0))
    }

-- | `a(), b())` をパースする` 
simpleTokenListToCodeTreeListWithRest ::
  NonEmptyArray SimpleToken.SimpleTokenWithRange ->
  { codeTreeList :: Array CodeTree
  , endPosition :: VSCodeApi.Position
  , rest :: Array SimpleToken.SimpleTokenWithRange
  }
simpleTokenListToCodeTreeListWithRest simpleTokenList =
  let
    { head: SimpleToken.SimpleTokenWithRange { range, simpleToken }, tail } =
      NonEmptyArray.uncons
        simpleTokenList
  in
    case simpleToken of
      SimpleToken.Start { name } ->
        nameAndSimpleTokenListToCodeTreeListWithRest
          { name
          , nameRange: range
          , simpleTokenList: tail
          }
      SimpleToken.End ->
        { codeTreeList: []
        , endPosition: VSCodeApi.rangeGetEnd range
        , rest: tail
        }

-- | {`a` と `(), b())`} をパースする` 
nameAndSimpleTokenListToCodeTreeListWithRest ::
  { name :: NonEmptyString
  , nameRange :: VSCodeApi.Range
  , simpleTokenList :: Array SimpleToken.SimpleTokenWithRange
  } ->
  { codeTreeList :: Array CodeTree
  , endPosition :: VSCodeApi.Position
  , rest :: Array SimpleToken.SimpleTokenWithRange
  }
nameAndSimpleTokenListToCodeTreeListWithRest { name, nameRange, simpleTokenList } = case NonEmptyArray.fromArray simpleTokenList of
  Just tailNonEmpty ->
    let
      firstItem = simpleTokenListToCodeTreeListWithRest tailNonEmpty
    in
      case NonEmptyArray.fromArray firstItem.rest of
        Just firstItemRestNonEmpty ->
          let
            tailItem = simpleTokenListToCodeTreeListWithRest firstItemRestNonEmpty
          in
            { codeTreeList:
                Array.cons
                  ( CodeTree
                      { name
                      , nameRange
                      , children: firstItem.codeTreeList
                      , range:
                          VSCodeApi.newRange
                            (VSCodeApi.rangeGetStart nameRange)
                            (firstItem.endPosition)
                      }
                  )
                  tailItem.codeTreeList
            , endPosition: tailItem.endPosition
            , rest: tailItem.rest
            }
        Nothing ->
          { codeTreeList:
              [ CodeTree
                  { name
                  , nameRange
                  , children: firstItem.codeTreeList
                  , range: nameRange
                  }
              ]
          , endPosition: firstItem.endPosition
          , rest: []
          }
  Nothing ->
    { codeTreeList:
        [ CodeTree
            { name
            , nameRange
            , children: []
            , range: nameRange
            }
        ]
    , rest: []
    , endPosition: VSCodeApi.rangeGetEnd nameRange
    }
