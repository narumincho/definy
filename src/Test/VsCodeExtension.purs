module Test.VsCodeExtension
  ( test
  ) where

import Prelude
import Data.String.NonEmpty as NonEmptyString
import Data.UInt as UInt
import Test.Unit as TestUnit
import Test.Util (assertEqual)
import Type.Proxy (Proxy(..))
import VsCodeExtension.Parser as Parser
import VsCodeExtension.SimpleToken as SimpleToken
import VsCodeExtension.Tokenize as Tokenize
import VsCodeExtension.VSCodeApi as VSCodeApi

test :: TestUnit.Test
test = do
  tokenizeTest
  simpleTokenTest
  parserTest
  rangeTest

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

rangeFrom :: Int -> Int -> Int -> Int -> VSCodeApi.Range
rangeFrom startLine startChar endLine endChar =
  VSCodeApi.newRange
    ( VSCodeApi.newPosition
        (UInt.fromInt startLine)
        (UInt.fromInt startChar)
    )
    ( VSCodeApi.newPosition
        (UInt.fromInt endLine)
        (UInt.fromInt endChar)
    )

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
        VSCodeApi.rangeContains
          (VSCodeApi.newPosition (UInt.fromInt 1) (UInt.fromInt 15))
          (rangeFrom 1 0 1 28)
    , expected: true
    }
  assertEqual
    "range inside start"
    { actual:
        VSCodeApi.rangeContains
          (VSCodeApi.newPosition (UInt.fromInt 1) (UInt.fromInt 0))
          (rangeFrom 1 0 1 28)
    , expected: true
    }
  assertEqual
    "range inside end"
    { actual:
        VSCodeApi.rangeContains
          (VSCodeApi.newPosition (UInt.fromInt 1) (UInt.fromInt 28))
          (rangeFrom 1 0 1 28)
    , expected: true
    }
  assertEqual
    "range outside (line)"
    { actual:
        VSCodeApi.rangeContains
          (VSCodeApi.newPosition (UInt.fromInt 6) (UInt.fromInt 15))
          (rangeFrom 1 0 1 28)
    , expected: false
    }
  assertEqual
    "range outside (character)"
    { actual:
        VSCodeApi.rangeContains
          (VSCodeApi.newPosition (UInt.fromInt 1) (UInt.fromInt 29))
          (rangeFrom 1 0 1 28)
    , expected: false
    }
