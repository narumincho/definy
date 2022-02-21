module VsCodeExtension.ToString
  ( simpleTokenWithRangeArrayToString
  ) where

import Prelude
import Data.String as String
import Data.String.NonEmpty as NonEmptyString
import VsCodeExtension.SimpleToken as SimpleToken

-- | シンプルなトークンの列を整形された文字列に変換する
simpleTokenWithRangeArrayToString :: Array SimpleToken.SimpleTokenWithRange -> String
simpleTokenWithRangeArrayToString tokenWithRangeArray =
  String.joinWith ", "
    ( map
        ( \(SimpleToken.SimpleTokenWithRange { simpleToken }) ->
            simpleTokenToString simpleToken
        )
        tokenWithRangeArray
    )

simpleTokenToString :: SimpleToken.SimpleToken -> String
simpleTokenToString = case _ of
  SimpleToken.Start { name } -> append (NonEmptyString.toString name) "("
  SimpleToken.End -> ")"
