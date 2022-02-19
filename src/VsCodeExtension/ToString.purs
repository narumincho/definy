module VsCodeExtension.ToString
  ( tokenWithRangeArrayToString
  ) where

import Prelude
import Data.String.NonEmpty as NonEmptyString
import Data.String as String
import VsCodeExtension.Tokenize as Tokenize

-- | トークンの列を整形された文字列に変換する
tokenWithRangeArrayToString :: Array Tokenize.TokenWithRange -> String
tokenWithRangeArrayToString tokenWithRangeArray =
  String.joinWith ""
    ( map (\(Tokenize.TokenWithRange { token }) -> tokenToString token)
        tokenWithRangeArray
    )

tokenToString :: Tokenize.Token -> String
tokenToString = case _ of
  Tokenize.Comma -> ", "
  Tokenize.ParenthesisStart -> "("
  Tokenize.ParenthesisEnd -> ")"
  Tokenize.Name name -> NonEmptyString.toString name
