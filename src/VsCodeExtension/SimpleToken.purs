module VsCodeExtension.SimpleToken
  ( SimpleToken(..)
  , SimpleTokenWithRange(..)
  , tokenListToSimpleTokenList
  ) where

import Prelude
import Data.Array as Array
import Data.Generic.Rep as GenericRep
import Data.Show.Generic as ShowGeneric
import VsCodeExtension.Tokenize as Tokenize
import VsCodeExtension.Range as Range

-- | よりシンプルなトークン
newtype SimpleTokenWithRange
  = SimpleTokenWithRange
  { simpleToken :: SimpleToken
  , range :: Range.Range
  }

derive instance eqSimpleTokenWithRange :: Eq SimpleTokenWithRange

derive instance genericSimpleTokenWithRange :: GenericRep.Generic SimpleTokenWithRange _

instance showSimpleTokenWithRange :: Show SimpleTokenWithRange where
  show = ShowGeneric.genericShow

data SimpleToken
  = Start String
  | End

derive instance eqSimpleToken :: Eq SimpleToken

derive instance genericSimpleToken :: GenericRep.Generic SimpleToken _

instance showSimpleToken :: Show SimpleToken where
  show = ShowGeneric.genericShow

data State
  = BeforeName { name :: String, range :: Range.Range }
  | BeforeParenthesisEnd
  | BeforeParenthesisStartOrNeedName

tokenListToSimpleTokenList :: Array Tokenize.TokenWithRange -> Array SimpleTokenWithRange
tokenListToSimpleTokenList tokenList =
  let
    { result, state } =
      Array.foldl
        ( \{ result, state } tokenWithRange ->
            let
              { newSimpleTokenList, nextState } = tokenListToSimpleTokenListLoop state tokenWithRange
            in
              { result: append result newSimpleTokenList
              , state: nextState
              }
        )
        { result: [], state: BeforeParenthesisStartOrNeedName }
        tokenList
  in
    append result
      ( case state of
          BeforeName { name, range } ->
            [ SimpleTokenWithRange
                { simpleToken: Start name
                , range
                }
            , SimpleTokenWithRange
                { simpleToken: End
                , range
                }
            ]
          _ -> []
      )

tokenListToSimpleTokenListLoop ::
  State ->
  Tokenize.TokenWithRange ->
  { newSimpleTokenList :: Array SimpleTokenWithRange
  , nextState :: State
  }
tokenListToSimpleTokenListLoop state (Tokenize.TokenWithRange { token, range }) = case state of
  BeforeName { name: beforeName, range: beforeNameRange } -> case token of
    Tokenize.Name name ->
      { newSimpleTokenList:
          [ SimpleTokenWithRange
              { simpleToken: Start beforeName
              , range: beforeNameRange
              }
          , SimpleTokenWithRange
              { simpleToken: End
              , range: beforeNameRange
              }
          ]
      , nextState: BeforeName { name, range }
      }
    Tokenize.ParenthesisStart ->
      { newSimpleTokenList:
          [ SimpleTokenWithRange
              { simpleToken: Start beforeName
              , range:
                  Range.Range
                    { start: Range.rangeStart beforeNameRange
                    , end: Range.rangeEnd range
                    }
              }
          ]
      , nextState: BeforeParenthesisStartOrNeedName
      }
    Tokenize.ParenthesisEnd ->
      { newSimpleTokenList:
          [ SimpleTokenWithRange
              { simpleToken: Start beforeName
              , range: beforeNameRange
              }
          , SimpleTokenWithRange
              { simpleToken: End
              , range: beforeNameRange
              }
          , SimpleTokenWithRange
              { simpleToken: End
              , range: range
              }
          ]
      , nextState: BeforeParenthesisEnd
      }
    Tokenize.Comma ->
      { newSimpleTokenList:
          [ SimpleTokenWithRange
              { simpleToken: Start beforeName
              , range: beforeNameRange
              }
          , SimpleTokenWithRange
              { simpleToken: End
              , range: beforeNameRange
              }
          ]
      , nextState: BeforeParenthesisStartOrNeedName
      }
  BeforeParenthesisStartOrNeedName -> case token of
    Tokenize.Name name ->
      { newSimpleTokenList: []
      , nextState: BeforeName { name, range }
      }
    Tokenize.ParenthesisStart ->
      { newSimpleTokenList: []
      , nextState: BeforeParenthesisStartOrNeedName
      }
    Tokenize.ParenthesisEnd ->
      { newSimpleTokenList:
          [ SimpleTokenWithRange
              { simpleToken: End
              , range: range
              }
          ]
      , nextState: BeforeParenthesisEnd
      }
    Tokenize.Comma ->
      { newSimpleTokenList:
          [ SimpleTokenWithRange
              { simpleToken: Start ""
              , range: range
              }
          , SimpleTokenWithRange
              { simpleToken: End
              , range: range
              }
          ]
      , nextState: BeforeParenthesisStartOrNeedName
      }
  BeforeParenthesisEnd -> case token of
    Tokenize.Name name ->
      { newSimpleTokenList: []
      , nextState: BeforeName { name, range }
      }
    Tokenize.ParenthesisStart ->
      { newSimpleTokenList: []
      , nextState: BeforeParenthesisStartOrNeedName
      }
    Tokenize.ParenthesisEnd ->
      { newSimpleTokenList:
          [ SimpleTokenWithRange
              { simpleToken: End
              , range: range
              }
          ]
      , nextState: BeforeParenthesisEnd
      }
    Tokenize.Comma ->
      { newSimpleTokenList: []
      , nextState: BeforeParenthesisStartOrNeedName
      }
