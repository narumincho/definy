module Test.Main (main) where

import Prelude
import Data.Array.NonEmpty as NonEmptyArray
import Data.Maybe as Maybe
import Data.String.NonEmpty as NonEmptyString
import Data.UInt as UInt
import Effect as Effect
import FileSystem.FileType as FileType
import FileSystem.Name as Name
import FileSystem.Path as FileSystemPath
import PureScript.Data as PureScriptData
import PureScript.ToString as PureScriptToString
import PureScript.Wellknown as PureScriptWellknown
import Test.Assert as Assert
import Type.Proxy (Proxy(..))
import Util as Util

main :: Effect.Effect Unit
main = do
  listUpdateAtOverAutoCreateInline
  listUpdateAtOverAutoCreateFirst
  listUpdateAtOverAutoCreateLast
  listUpdateAtOverAutoCreateAutoCreate
  groupBySize2
  fileNameParse
  fileNameWithExtensionParse
  pureScriptCodeGenerate

listUpdateAtOverAutoCreateInline :: Effect.Effect Unit
listUpdateAtOverAutoCreateInline =
  Assert.assertEqual
    { actual:
        Util.listUpdateAtOverAutoCreate
          [ "zero", "one", "two", "three" ]
          (UInt.fromInt 1)
          ( case _ of
              Maybe.Just item -> append item "!"
              Maybe.Nothing -> "new"
          )
          "fill"
    , expected: [ "zero", "one!", "two", "three" ]
    }

listUpdateAtOverAutoCreateFirst :: Effect.Effect Unit
listUpdateAtOverAutoCreateFirst =
  Assert.assertEqual
    { actual:
        Util.listUpdateAtOverAutoCreate
          [ "zero", "one", "two", "three" ]
          (UInt.fromInt 0)
          ( case _ of
              Maybe.Just item -> append item "!"
              Maybe.Nothing -> "new"
          )
          "fill"
    , expected: [ "zero!", "one", "two", "three" ]
    }

listUpdateAtOverAutoCreateLast :: Effect.Effect Unit
listUpdateAtOverAutoCreateLast =
  Assert.assertEqual
    { actual:
        Util.listUpdateAtOverAutoCreate
          [ "zero", "one", "two", "three" ]
          (UInt.fromInt 3)
          ( case _ of
              Maybe.Just item -> append item "!"
              Maybe.Nothing -> "new"
          )
          "fill"
    , expected: [ "zero", "one", "two", "three!" ]
    }

listUpdateAtOverAutoCreateAutoCreate :: Effect.Effect Unit
listUpdateAtOverAutoCreateAutoCreate =
  Assert.assertEqual
    { actual:
        Util.listUpdateAtOverAutoCreate
          [ "zero", "one", "two", "three" ]
          (UInt.fromInt 6)
          ( case _ of
              Maybe.Just item -> append item "!"
              Maybe.Nothing -> "new"
          )
          "fill"
    , expected: [ "zero", "one", "two", "three", "fill", "fill", "new" ]
    }

groupBySize2 :: Effect.Effect Unit
groupBySize2 =
  Assert.assertEqual
    { actual: Util.groupBySize (UInt.fromInt 2) [ 0, 1, 2, 3, 4 ]
    , expected: [ [ 0, 1 ], [ 2, 3 ], [ 4 ] ]
    }

fileNameParse :: Effect.Effect Unit
fileNameParse =
  Assert.assertEqual
    { actual:
        Name.toNonEmptyString (Name.fromSymbolProxy (Proxy :: _ "sampleFileName"))
    , expected:
        NonEmptyString.nes (Proxy :: _ "sampleFileName")
    }

fileNameWithExtensionParse :: Effect.Effect Unit
fileNameWithExtensionParse =
  Assert.assertEqual
    { actual:
        FileSystemPath.fileNameWithExtensionParse "sample.test.js"
    , expected:
        Maybe.Just
          { fileName:
              Name.fromSymbolProxy (Proxy :: _ "sample.test")
          , fileType: Maybe.Just FileType.JavaScript
          }
    }

pureScriptCodeGenerate :: Effect.Effect Unit
pureScriptCodeGenerate =
  Assert.assertEqual
    { actual:
        PureScriptToString.toString
          ( PureScriptData.Module
              { name:
                  PureScriptData.ModuleName
                    ( NonEmptyArray.singleton
                        (NonEmptyString.nes (Proxy :: _ "Sample"))
                    )
              , definitionList:
                  [ PureScriptWellknown.definition
                      { name: NonEmptyString.nes (Proxy :: _ "origin")
                      , document: "オリジン"
                      , pType: PureScriptWellknown.primString
                      , expr: PureScriptWellknown.stringLiteral "http://narumincho.com"
                      , isExport: true
                      }
                  , PureScriptWellknown.definition
                      { name: NonEmptyString.nes (Proxy :: _ "sample")
                      , document: "サンプルデータ\n改行付きのドキュメント"
                      , pType: PureScriptWellknown.primString
                      , expr: PureScriptWellknown.stringLiteral "改行も\nしっかりエスケープされてるかな?"
                      , isExport: false
                      }
                  ]
              }
          )
    , expected:
        """-- generated by definy. Do not edit!
module Sample (origin) where

import Prim as M0

-- | オリジン
origin :: M0.String
origin = "http://narumincho.com"

-- | サンプルデータ
-- | 改行付きのドキュメント
sample :: M0.String
sample = "改行も\nしっかりエスケープされてるかな?"

"""
    }
