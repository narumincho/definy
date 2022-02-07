module Test.StructuredUrl
  ( test
  ) where

import Prelude
import Data.Map as Map
import Data.String.NonEmpty as NonEmptyString
import Data.Tuple as Tuple
import StructuredUrl as StructuredUrl
import Test.Unit as TestUnit
import Test.Unit.Assert as Assert
import Type.Proxy (Proxy(..))

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
  Assert.equal
    (StructuredUrl.nodeHttpUrlToPathAndSearchParams "")
    ( StructuredUrl.PathAndSearchParams
        { path: [], searchParams: Map.empty }
    )

rootSlash :: TestUnit.Test
rootSlash =
  Assert.equal
    (StructuredUrl.nodeHttpUrlToPathAndSearchParams "/")
    ( StructuredUrl.PathAndSearchParams
        { path: [], searchParams: Map.empty }
    )

pathOne :: TestUnit.Test
pathOne =
  Assert.equal
    (StructuredUrl.nodeHttpUrlToPathAndSearchParams "/abc")
    ( StructuredUrl.PathAndSearchParams
        { path: [ NonEmptyString.nes (Proxy :: _ "abc") ], searchParams: Map.empty }
    )

pathOneSlash :: TestUnit.Test
pathOneSlash =
  Assert.equal
    (StructuredUrl.nodeHttpUrlToPathAndSearchParams "/def/")
    ( StructuredUrl.PathAndSearchParams
        { path: [ NonEmptyString.nes (Proxy :: _ "def") ], searchParams: Map.empty }
    )

pathTwo :: TestUnit.Test
pathTwo =
  Assert.equal
    (StructuredUrl.nodeHttpUrlToPathAndSearchParams "/apple/orange")
    ( StructuredUrl.PathAndSearchParams
        { path:
            [ NonEmptyString.nes (Proxy :: _ "apple")
            , NonEmptyString.nes (Proxy :: _ "orange")
            ]
        , searchParams: Map.empty
        }
    )

searchParamsRemoveEmpty :: TestUnit.Test
searchParamsRemoveEmpty =
  Assert.equal
    (StructuredUrl.nodeHttpUrlToPathAndSearchParams "/apple/orange?a=32&empty=&=99")
    ( StructuredUrl.PathAndSearchParams
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
    )

searchParamsSpace :: TestUnit.Test
searchParamsSpace =
  Assert.equal
    (StructuredUrl.nodeHttpUrlToPathAndSearchParams "/apple/orange?query=sample+value")
    ( StructuredUrl.PathAndSearchParams
        { path:
            [ NonEmptyString.nes (Proxy :: _ "apple")
            , NonEmptyString.nes (Proxy :: _ "orange")
            ]
        , searchParams:
            Map.singleton
              (NonEmptyString.nes (Proxy :: _ "query"))
              "sample value"
        }
    )
