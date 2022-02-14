module Test.VsCodeExtension
  ( test
  ) where

import Prelude
import Data.Maybe (Maybe(..))
import Data.UInt as UInt
import Test.Unit as TestUnit
import Test.Util (assertEqual)
import VsCodeExtension.Lsp as Lsp

test :: TestUnit.Test
test = parseContentLengthHeaderTest

parseContentLengthHeaderTest :: TestUnit.Test
parseContentLengthHeaderTest = do
  assertEqual
    "parseContentLengthHeader lowercase"
    { actual: Lsp.parseContentLengthHeader "content-length: 234"
    , expected: Just (UInt.fromInt 234)
    }
  assertEqual
    "parseContentLengthHeader uppercase"
    { actual: Lsp.parseContentLengthHeader "Content-Length: 3"
    , expected: Just (UInt.fromInt 3)
    }
  assertEqual
    "parseContentLengthHeader separator"
    { actual: Lsp.parseContentLengthHeader "Content-LEngth:99999"
    , expected: Just (UInt.fromInt 99999)
    }
  assertEqual
    "parseContentLengthHeader separator nothing"
    { actual: Lsp.parseContentLengthHeader "Content-Length+742"
    , expected: Nothing
    }
