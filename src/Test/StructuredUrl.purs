module Test.StructuredUrl
  ( test
  ) where

import Prelude
import Data.Map as Map
import Data.String.NonEmpty as NonEmptyString
import Data.Tuple as Tuple
import Effect as Effect
import StructuredUrl as StructuredUrl
import Test.Assert as Assert
import Type.Proxy (Proxy(..))

test :: Effect.Effect Unit
test = do
  rootEmpty
  rootSlash
  pathOne
  pathOneSlash
  pathTwo
  searchParamsRemoveEmpty
  searchParamsSpace

rootEmpty :: Effect.Effect Unit
rootEmpty =
  Assert.assertEqual
    { actual: StructuredUrl.nodeHttpUrlToPathAndSearchParams ""
    , expected:
        StructuredUrl.PathAndSearchParams
          { path: [], searchParams: Map.empty }
    }

rootSlash :: Effect.Effect Unit
rootSlash =
  Assert.assertEqual
    { actual: StructuredUrl.nodeHttpUrlToPathAndSearchParams "/"
    , expected:
        StructuredUrl.PathAndSearchParams
          { path: [], searchParams: Map.empty }
    }

pathOne :: Effect.Effect Unit
pathOne =
  Assert.assertEqual
    { actual: StructuredUrl.nodeHttpUrlToPathAndSearchParams "/abc"
    , expected:
        StructuredUrl.PathAndSearchParams
          { path: [ NonEmptyString.nes (Proxy :: _ "abc") ], searchParams: Map.empty }
    }

pathOneSlash :: Effect.Effect Unit
pathOneSlash =
  Assert.assertEqual
    { actual: StructuredUrl.nodeHttpUrlToPathAndSearchParams "/def/"
    , expected:
        StructuredUrl.PathAndSearchParams
          { path: [ NonEmptyString.nes (Proxy :: _ "def") ], searchParams: Map.empty }
    }

pathTwo :: Effect.Effect Unit
pathTwo =
  Assert.assertEqual
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

searchParamsRemoveEmpty :: Effect.Effect Unit
searchParamsRemoveEmpty =
  Assert.assertEqual
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

searchParamsSpace :: Effect.Effect Unit
searchParamsSpace =
  Assert.assertEqual
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
