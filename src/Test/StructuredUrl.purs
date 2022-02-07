module Test.StructuredUrl
  ( test
  ) where

import Prelude
import Data.Map as Map
import Data.String.NonEmpty as NonEmptyString
import Data.Tuple as Tuple
import StructuredUrl as StructuredUrl
import Test.Unit as TestUnit
import Type.Proxy (Proxy(..))
import Test.Util (assertEqual)

test :: TestUnit.Test
test = do
  rootEmpty
  rootSlash
  pathOne
  pathOneSlash
  pathTwo
  searchParamsRemoveEmpty
  searchParamsSpace

rootEmpty :: TestUnit.Test
rootEmpty =
  assertEqual
    "rootEmpty"
    { actual: StructuredUrl.nodeHttpUrlToPathAndSearchParams ""
    , expected:
        StructuredUrl.PathAndSearchParams
          { path: [], searchParams: Map.empty }
    }

rootSlash :: TestUnit.Test
rootSlash =
  assertEqual
    "rootSlash"
    { actual: StructuredUrl.nodeHttpUrlToPathAndSearchParams "/"
    , expected:
        StructuredUrl.PathAndSearchParams
          { path: [], searchParams: Map.empty }
    }

pathOne :: TestUnit.Test
pathOne =
  assertEqual
    "pathOne"
    { actual: StructuredUrl.nodeHttpUrlToPathAndSearchParams "/abc"
    , expected:
        StructuredUrl.PathAndSearchParams
          { path: [ NonEmptyString.nes (Proxy :: _ "abc") ], searchParams: Map.empty }
    }

pathOneSlash :: TestUnit.Test
pathOneSlash =
  assertEqual
    "pathOneSlash"
    { actual: StructuredUrl.nodeHttpUrlToPathAndSearchParams "/def/"
    , expected:
        StructuredUrl.PathAndSearchParams
          { path: [ NonEmptyString.nes (Proxy :: _ "def") ], searchParams: Map.empty }
    }

pathTwo :: TestUnit.Test
pathTwo =
  assertEqual
    "pathTwo"
    { actual: StructuredUrl.nodeHttpUrlToPathAndSearchParams "/apple/orange"
    , expected:
        StructuredUrl.PathAndSearchParams
          { path:
              [ NonEmptyString.nes (Proxy :: _ "apple")
              , NonEmptyString.nes (Proxy :: _ "orange")
              ]
          , searchParams: Map.empty
          }
    }

searchParamsRemoveEmpty :: TestUnit.Test
searchParamsRemoveEmpty =
  assertEqual
    "searchParamsRemoveEmpty"
    { actual: StructuredUrl.nodeHttpUrlToPathAndSearchParams "/apple/orange?a=32&empty=&=99"
    , expected:
        StructuredUrl.PathAndSearchParams
          { path:
              [ NonEmptyString.nes (Proxy :: _ "apple")
              , NonEmptyString.nes (Proxy :: _ "orange")
              ]
          , searchParams:
              Map.fromFoldable
                [ Tuple.Tuple (NonEmptyString.nes (Proxy :: _ "a")) "32"
                , Tuple.Tuple (NonEmptyString.nes (Proxy :: _ "empty")) ""
                ]
          }
    }

searchParamsSpace :: TestUnit.Test
searchParamsSpace =
  assertEqual
    "searchParamsSpace"
    { actual: StructuredUrl.nodeHttpUrlToPathAndSearchParams "/apple/orange?query=sample+value"
    , expected:
        StructuredUrl.PathAndSearchParams
          { path:
              [ NonEmptyString.nes (Proxy :: _ "apple")
              , NonEmptyString.nes (Proxy :: _ "orange")
              ]
          , searchParams:
              Map.singleton
                (NonEmptyString.nes (Proxy :: _ "query"))
                "sample value"
          }
    }
