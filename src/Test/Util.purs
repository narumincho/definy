module Test.Util
  ( assertEqual
  , includeString
  ) where

import Prelude
import Data.Maybe (Maybe(..))
import Data.String as String
import Test.Unit as TestUnit

includeString :: String -> String -> String.Pattern -> TestUnit.Test
includeString reason target pattern = case String.indexOf pattern target of
  Just _ -> TestUnit.success
  Nothing ->
    TestUnit.failure
      ( String.joinWith ""
          [ reason
          , "not include! \ntarget =\""
          , target
          , "\"\n pattern"
          , show pattern
          ]
      )

assertEqual :: forall a. (Eq a) => (Show a) => String -> { actual :: a, expected :: a } -> TestUnit.Test
assertEqual reason { actual, expected } =
  if eq actual expected then
    TestUnit.success
  else
    TestUnit.failure
      ( String.joinWith ""
          [ reason
          , "\nExpected: "
          , show expected
          , "\nActual:   "
          , show actual
          ]
      )
