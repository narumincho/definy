module VsCodeExtension.Parser
  ( CodeTree(..)
  , codeTreeToTokenData
  , parse
  ) where

import Data.Array as Array
import Data.Array.NonEmpty (NonEmptyArray)
import Data.Array.NonEmpty as NonEmptyArray
import Data.Generic.Rep as GenericRep
import Data.Maybe (Maybe(..))
import Data.Show.Generic as ShowGeneric
import Data.String.NonEmpty (NonEmptyString)
import Data.String.NonEmpty as NonEmptyString
import Data.String.NonEmpty.CodeUnits as NonEmptyCodeUnits
import Data.UInt as UInt
import Prelude as Prelude
import Type.Proxy (Proxy(..))
import VsCodeExtension.Range as Range
import VsCodeExtension.SimpleToken as SimpleToken
import VsCodeExtension.TokenType as TokenType

newtype CodeTree
  = CodeTree
  { name :: NonEmptyString
  , nameRange :: Range.Range
  , children :: Array CodeTree
  , range :: Range.Range
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
                Range.Range
                  { start: Range.rangeStart range, end: firstItem.endPosition }
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
        Range.Range
          { start:
              Range.Position
                { line: UInt.fromInt 0
                , character: UInt.fromInt 0
                }
          , end:
              Range.Position
                { line: UInt.fromInt 0
                , character: UInt.fromInt 0
                }
          }
    , children: []
    , range:
        Range.Range
          { start:
              Range.Position
                { line: UInt.fromInt 0
                , character: UInt.fromInt 0
                }
          , end:
              Range.Position
                { line: UInt.fromInt 0
                , character: UInt.fromInt 0
                }
          }
    }

-- | `a(), b())` をパースする` 
simpleTokenListToCodeTreeListWithRest ::
  NonEmptyArray SimpleToken.SimpleTokenWithRange ->
  { codeTreeList :: Array CodeTree
  , endPosition :: Range.Position
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
        , endPosition: Range.rangeEnd range
        , rest: tail
        }

-- | {`a` と `(), b())`} をパースする` 
nameAndSimpleTokenListToCodeTreeListWithRest ::
  { name :: NonEmptyString
  , nameRange :: Range.Range
  , simpleTokenList :: Array SimpleToken.SimpleTokenWithRange
  } ->
  { codeTreeList :: Array CodeTree
  , endPosition :: Range.Position
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
                          Range.Range
                            { start: Range.rangeStart nameRange
                            , end: firstItem.endPosition
                            }
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
    , endPosition: Range.rangeEnd nameRange
    }

codeTreeToTokenData ::
  CodeTree ->
  Array TokenType.TokenData
codeTreeToTokenData (CodeTree { name, nameRange, children }) =
  Array.cons
    ( TokenType.TokenData
        { length: UInt.fromInt (Array.length (NonEmptyCodeUnits.toCharArray name))
        , start: Range.rangeStart nameRange
        , tokenType: TokenType.TokenTypeVariable
        }
    )
    (Prelude.bind children codeTreeToTokenData)
