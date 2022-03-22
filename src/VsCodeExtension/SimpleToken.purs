module VsCodeExtension.SimpleToken
  ( SimpleToken(..)
  , SimpleTokenWithRange(..)
  , tokenListToSimpleTokenList
  ) where

import Prelude
import Data.Array as Array
import Data.Generic.Rep as GenericRep
import Data.Maybe (Maybe(..))
import Data.Show.Generic as ShowGeneric
import Data.String.NonEmpty (NonEmptyString)
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
  = Start { name :: NonEmptyString }
  | End

derive instance eqSimpleToken :: Eq SimpleToken

derive instance genericSimpleToken :: GenericRep.Generic SimpleToken _

instance showSimpleToken :: Show SimpleToken where
  show = ShowGeneric.genericShow

newtype BeforeName
  = BeforeName { name :: NonEmptyString, range :: Range.Range }

tokenListToSimpleTokenList :: Array Tokenize.TokenWithRange -> Array SimpleTokenWithRange
tokenListToSimpleTokenList tokenList =
  let
    { result, beforeName } =
      Array.foldl
        ( \{ result, beforeName } tokenWithRange ->
            let
              { newSimpleTokenList, nameMaybe } = tokenListToSimpleTokenListLoop beforeName tokenWithRange
            in
              { result: append result newSimpleTokenList
              , beforeName: nameMaybe
              }
        )
        { result: [], beforeName: Nothing }
        tokenList
  in
    append result
      ( case beforeName of
          Just (BeforeName { name, range }) ->
            [ SimpleTokenWithRange
                { simpleToken: Start { name }
                , range
                }
            , SimpleTokenWithRange
                { simpleToken: End
                , range
                }
            ]
          Nothing -> []
      )

tokenListToSimpleTokenListLoop ::
  Maybe BeforeName ->
  Tokenize.TokenWithRange ->
  { newSimpleTokenList :: Array SimpleTokenWithRange
  , nameMaybe :: Maybe BeforeName
  }
tokenListToSimpleTokenListLoop beforeNameMaybe (Tokenize.TokenWithRange { token, range }) = case beforeNameMaybe of
  Just (BeforeName { name: beforeName, range: beforeNameRange }) -> case token of
    Tokenize.Name name ->
      { newSimpleTokenList:
          [ SimpleTokenWithRange
              { simpleToken: Start { name: beforeName }
              , range: beforeNameRange
              }
          , SimpleTokenWithRange
              { simpleToken: End
              , range: beforeNameRange
              }
          ]
      , nameMaybe: Just (BeforeName { name, range })
      }
    Tokenize.ParenthesisStart ->
      { newSimpleTokenList:
          [ SimpleTokenWithRange
              { simpleToken: Start { name: beforeName }
              , range:
                  Range.Range
                    { start: Range.rangeStart beforeNameRange
                    , end: Range.rangeEnd range
                    }
              }
          ]
      , nameMaybe: Nothing
      }
    Tokenize.ParenthesisEnd ->
      { newSimpleTokenList:
          [ SimpleTokenWithRange
              { simpleToken: Start { name: beforeName }
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
      , nameMaybe: Nothing
      }
  Nothing -> case token of
    Tokenize.Name name ->
      { newSimpleTokenList: []
      , nameMaybe: Just (BeforeName { name, range })
      }
    Tokenize.ParenthesisStart ->
      { newSimpleTokenList: []
      , nameMaybe: Nothing
      }
    Tokenize.ParenthesisEnd ->
      { newSimpleTokenList:
          [ SimpleTokenWithRange
              { simpleToken: End
              , range: range
              }
          ]
      , nameMaybe: Nothing
      }
