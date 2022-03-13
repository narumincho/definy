module Test.VsCodeExtension
  ( test
  ) where

import Prelude
import Data.Maybe (Maybe(..))
import Data.String.NonEmpty as NonEmptyString
import Data.UInt as UInt
import Test.Unit as TestUnit
import Test.Util (assertEqual)
import Type.Proxy (Proxy(..))
import VsCodeExtension.LanguageServerLib as Lib
import VsCodeExtension.Parser as Parser
import VsCodeExtension.Range as Range
import VsCodeExtension.SimpleToken as SimpleToken
import VsCodeExtension.Tokenize as Tokenize

test :: TestUnit.Test
test = do
  parseContentLengthHeaderTest
  tokenizeTest
  simpleTokenTest
  parserTest
  rangeTest

parseContentLengthHeaderTest :: TestUnit.Test
parseContentLengthHeaderTest = do
  assertEqual
    "parseContentLengthHeader lowercase"
    { actual: Lib.parseContentLengthHeader "content-length: 234"
    , expected: Just (UInt.fromInt 234)
    }
  assertEqual
    "parseContentLengthHeader uppercase"
    { actual: Lib.parseContentLengthHeader "Content-Length: 3"
    , expected: Just (UInt.fromInt 3)
    }
  assertEqual
    "parseContentLengthHeader separator"
    { actual: Lib.parseContentLengthHeader "Content-LEngth:99999"
    , expected: Just (UInt.fromInt 99999)
    }
  assertEqual
    "parseContentLengthHeader separator nothing"
    { actual: Lib.parseContentLengthHeader "Content-Length+742"
    , expected: Nothing
    }

tokenizeTest :: TestUnit.Test
tokenizeTest = do
  assertEqual
    "tokenize empty"
    { actual: Tokenize.tokenize ""
    , expected: []
    }
  assertEqual
    "tokenize sampleValue"
    { actual: Tokenize.tokenize "sampleValue"
    , expected:
        [ Tokenize.TokenWithRange
            { range: rangeFrom 0 0 0 11
            , token: Tokenize.Name (NonEmptyString.nes (Proxy :: _ "sampleValue"))
            }
        ]
    }
  assertEqual
    "tokenize multi"
    { actual: Tokenize.tokenize " abc def  g   "
    , expected:
        [ Tokenize.TokenWithRange
            { range: rangeFrom 0 1 0 4
            , token: Tokenize.Name (NonEmptyString.nes (Proxy :: _ "abc"))
            }
        , Tokenize.TokenWithRange
            { range: rangeFrom 0 5 0 8
            , token: Tokenize.Name (NonEmptyString.nes (Proxy :: _ "def"))
            }
        , Tokenize.TokenWithRange
            { range: rangeFrom 0 10 0 11
            , token: Tokenize.Name (NonEmptyString.nes (Proxy :: _ "g"))
            }
        ]
    }
  assertEqual
    "tokenize withSpace"
    { actual: Tokenize.tokenize " \r\n  a\t   "
    , expected:
        [ Tokenize.TokenWithRange
            { range: rangeFrom 1 2 1 3
            , token: Tokenize.Name (NonEmptyString.nes (Proxy :: _ "a"))
            }
        ]
    }
  assertEqual
    "tokenize withParenthesis"
    { actual:
        Tokenize.tokenize
          """
part(value)
"""
    , expected:
        [ Tokenize.TokenWithRange
            { range: rangeFrom 1 0 1 4
            , token: (Tokenize.Name (NonEmptyString.nes (Proxy :: _ "part")))
            }
        , Tokenize.TokenWithRange
            { range: rangeFrom 1 4 1 5
            , token: Tokenize.ParenthesisStart
            }
        , Tokenize.TokenWithRange
            { range: rangeFrom 1 5 1 10
            , token: Tokenize.Name (NonEmptyString.nes (Proxy :: _ "value"))
            }
        , Tokenize.TokenWithRange
            { range: rangeFrom 1 10 1 11
            , token: Tokenize.ParenthesisEnd
            }
        ]
    }
  assertEqual
    "tokenize check utf16 length"
    { actual:
        Tokenize.tokenize
          """
👨🏽‍🦰
"""
    , expected:
        [ Tokenize.TokenWithRange
            { range: rangeFrom 1 0 1 7
            , token: (Tokenize.Name (NonEmptyString.nes (Proxy :: _ "👨🏽‍🦰")))
            }
        ]
    }

rangeFrom :: Int -> Int -> Int -> Int -> Range.Range
rangeFrom startLine startChar endLine endChar =
  Range.Range
    { start:
        Range.Position
          { line: UInt.fromInt startLine
          , character: UInt.fromInt startChar
          }
    , end:
        Range.Position
          { line: UInt.fromInt endLine
          , character: UInt.fromInt endChar
          }
    }

simpleTokenTest :: TestUnit.Test
simpleTokenTest = do
  assertEqual
    "simpleToken test"
    { actual:
        SimpleToken.tokenListToSimpleTokenList
          ( Tokenize.tokenize
              """
sorena(arena()  oneArg (28))
"""
          )
    , expected:
        [ SimpleToken.SimpleTokenWithRange
            { range: rangeFrom 1 0 1 7
            , simpleToken:
                SimpleToken.Start
                  { name: NonEmptyString.nes (Proxy :: _ "sorena") }
            }
        , SimpleToken.SimpleTokenWithRange
            { range: rangeFrom 1 7 1 13
            , simpleToken:
                ( SimpleToken.Start
                    { name: NonEmptyString.nes (Proxy :: _ "arena") }
                )
            }
        , SimpleToken.SimpleTokenWithRange
            { range: rangeFrom 1 13 1 14, simpleToken: SimpleToken.End }
        , SimpleToken.SimpleTokenWithRange
            { range: rangeFrom 1 16 1 24
            , simpleToken:
                SimpleToken.Start
                  { name: NonEmptyString.nes (Proxy :: _ "oneArg") }
            }
        , SimpleToken.SimpleTokenWithRange
            { range: rangeFrom 1 24 1 26
            , simpleToken:
                SimpleToken.Start
                  { name: NonEmptyString.nes (Proxy :: _ "28") }
            }
        , SimpleToken.SimpleTokenWithRange
            { range: rangeFrom 1 24 1 26, simpleToken: SimpleToken.End }
        , SimpleToken.SimpleTokenWithRange
            { range: rangeFrom 1 26 1 27, simpleToken: SimpleToken.End }
        , SimpleToken.SimpleTokenWithRange
            { range: rangeFrom 1 27 1 28, simpleToken: SimpleToken.End }
        ]
    }

parserTest :: TestUnit.Test
parserTest = do
  assertEqual
    "parser test"
    { actual:
        Parser.parse
          ( SimpleToken.tokenListToSimpleTokenList
              ( Tokenize.tokenize
                  """
sorena(arena()  oneArg (28))
"""
              )
          )
    , expected:
        Parser.CodeTree
          { name: NonEmptyString.nes (Proxy :: _ "sorena")
          , nameRange: rangeFrom 1 0 1 7
          , children:
              [ Parser.CodeTree
                  { name: NonEmptyString.nes (Proxy :: _ "arena")
                  , nameRange: rangeFrom 1 7 1 13
                  , children: []
                  , range: rangeFrom 1 7 1 14
                  }
              , Parser.CodeTree
                  { name: NonEmptyString.nes (Proxy :: _ "oneArg")
                  , nameRange: rangeFrom 1 16 1 24
                  , children:
                      [ Parser.CodeTree
                          { name: NonEmptyString.nes (Proxy :: _ "28")
                          , nameRange: rangeFrom 1 24 1 26
                          , children: []
                          , range: rangeFrom 1 24 1 26
                          }
                      ]
                  , range: rangeFrom 1 16 1 27
                  }
              ]
          , range: rangeFrom 1 0 1 28
          }
    }

rangeTest :: TestUnit.Test
rangeTest = do
  assertEqual
    "range inside"
    { actual:
        Range.isPositionInsideRange
          (rangeFrom 1 0 1 28)
          (Range.Position { line: UInt.fromInt 1, character: UInt.fromInt 15 })
    , expected: true
    }
  assertEqual
    "range inside start"
    { actual:
        Range.isPositionInsideRange
          (rangeFrom 1 0 1 28)
          (Range.Position { line: UInt.fromInt 1, character: UInt.fromInt 0 })
    , expected: true
    }
  assertEqual
    "range inside end"
    { actual:
        Range.isPositionInsideRange
          (rangeFrom 1 0 1 28)
          (Range.Position { line: UInt.fromInt 1, character: UInt.fromInt 28 })
    , expected: true
    }
  assertEqual
    "range outside (line)"
    { actual:
        Range.isPositionInsideRange
          (rangeFrom 1 0 1 28)
          (Range.Position { line: UInt.fromInt 6, character: UInt.fromInt 15 })
    , expected: false
    }
  assertEqual
    "range outside (character)"
    { actual:
        Range.isPositionInsideRange
          (rangeFrom 1 0 1 28)
          (Range.Position { line: UInt.fromInt 1, character: UInt.fromInt 29 })
    , expected: false
    }
