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
import Test.StructuredUrl as StructuredUrlTest
import Test.TypeScript as TypeScriptTest
import Test.VsCodeExtension as VsCodeExtensionTest
import Test.Unit as TestUnit
import Test.Unit.Main as TestUnitMain
import Test.Util (assertEqual)
import Type.Proxy (Proxy(..))
import Util as Util

main :: Effect.Effect Unit
main =
  TestUnitMain.runTest do
    TestUnit.test "util" do
      listUpdateAtOverAutoCreateInline
      listUpdateAtOverAutoCreateFirst
      listUpdateAtOverAutoCreateLast
      listUpdateAtOverAutoCreateAutoCreate
      groupBySize2
      fileNameParse
      fileNameWithExtensionParse
      pureScriptCodeGenerate
      nonEmptyArrayGetAtLoop
    TestUnit.test "StructuredUrlTest"
      StructuredUrlTest.test
    TestUnit.test "TypeScriptTest"
      TypeScriptTest.test
    TestUnit.test "VsCodeExtensionTest"
      VsCodeExtensionTest.test

listUpdateAtOverAutoCreateInline :: TestUnit.Test
listUpdateAtOverAutoCreateInline =
  assertEqual "listUpdateAtOverAutoCreateInline"
    { actual:
        Util.listUpdateAtOverAutoCreate
          [ "zero", "one", "two", "three" ]
          (UInt.fromInt 1)
          ( case _ of
              Maybe.Just item -> append item "!"
              Maybe.Nothing -> "new"
          )
          "fill"
    , expected:
        [ "zero", "one!", "two", "three" ]
    }

listUpdateAtOverAutoCreateFirst :: TestUnit.Test
listUpdateAtOverAutoCreateFirst =
  assertEqual "listUpdateAtOverAutoCreateFirst"
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

listUpdateAtOverAutoCreateLast :: TestUnit.Test
listUpdateAtOverAutoCreateLast =
  assertEqual "listUpdateAtOverAutoCreateLast"
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

listUpdateAtOverAutoCreateAutoCreate :: TestUnit.Test
listUpdateAtOverAutoCreateAutoCreate =
  assertEqual "listUpdateAtOverAutoCreateAutoCreate"
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

groupBySize2 :: TestUnit.Test
groupBySize2 =
  assertEqual
    "groupBySize2"
    { actual: Util.groupBySize (UInt.fromInt 2) [ 0, 1, 2, 3, 4 ]
    , expected: [ [ 0, 1 ], [ 2, 3 ], [ 4 ] ]
    }

fileNameParse :: TestUnit.Test
fileNameParse =
  assertEqual
    "fileNameParse"
    { actual: Name.toNonEmptyString (Name.fromSymbolProxy (Proxy :: _ "sampleFileName"))
    , expected: (NonEmptyString.nes (Proxy :: _ "sampleFileName"))
    }

fileNameWithExtensionParse :: TestUnit.Test
fileNameWithExtensionParse =
  assertEqual
    "fileNameWithExtensionParse"
    { actual: FileSystemPath.fileNameWithExtensionParse "sample.test.js"
    , expected:
        ( Maybe.Just
            { fileName:
                Name.fromSymbolProxy (Proxy :: _ "sample.test")
            , fileType: Maybe.Just FileType.JavaScript
            }
        )
    }

pureScriptCodeGenerate :: TestUnit.Test
pureScriptCodeGenerate =
  assertEqual
    "pureScriptCodeGenerate"
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

nonEmptyArrayGetAtLoop :: TestUnit.Test
nonEmptyArrayGetAtLoop = do
  nonEmptyArrayGetAtLoopZero
  nonEmptyArrayGetAtLoopOne
  nonEmptyArrayGetAtLoopLoopOne
  nonEmptyArrayGetAtLoopLoopTwo
  nonEmptyArrayGetAtLoopOneElement

nonEmptyArrayGetAtLoopZero :: TestUnit.Test
nonEmptyArrayGetAtLoopZero =
  assertEqual
    "nonEmptyArrayGetAtLoopZero"
    { actual:
        ( Util.nonEmptyArrayGetAtLoop
            (NonEmptyArray.cons' "a" [ "b", "c" ])
            (UInt.fromInt 0)
        )
    , expected: "a"
    }

nonEmptyArrayGetAtLoopOne :: TestUnit.Test
nonEmptyArrayGetAtLoopOne =
  assertEqual
    "nonEmptyArrayGetAtLoopOne"
    { actual:
        Util.nonEmptyArrayGetAtLoop
          (NonEmptyArray.cons' "a" [ "b", "c" ])
          (UInt.fromInt 1)
    , expected: "b"
    }

nonEmptyArrayGetAtLoopLoopOne :: TestUnit.Test
nonEmptyArrayGetAtLoopLoopOne =
  assertEqual
    "nonEmptyArrayGetAtLoopLoopOne"
    { actual:
        Util.nonEmptyArrayGetAtLoop
          (NonEmptyArray.cons' "a" [ "b", "c" ])
          (UInt.fromInt 4)
    , expected: "b"
    }

nonEmptyArrayGetAtLoopLoopTwo :: TestUnit.Test
nonEmptyArrayGetAtLoopLoopTwo =
  assertEqual
    "nonEmptyArrayGetAtLoopLoopTwo"
    { actual:
        Util.nonEmptyArrayGetAtLoop
          (NonEmptyArray.cons' "a" [ "b", "c" ])
          (UInt.fromInt 6)
    , expected: "a"
    }

nonEmptyArrayGetAtLoopOneElement :: TestUnit.Test
nonEmptyArrayGetAtLoopOneElement =
  assertEqual
    "nonEmptyArrayGetAtLoopOneElement"
    { actual:
        Util.nonEmptyArrayGetAtLoop
          (NonEmptyArray.cons' "a" [])
          (UInt.fromInt 99)
    , expected: "a"
    }
