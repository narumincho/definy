module Test.TypeScript
  ( log100Identifier
  , test
  ) where

import Console as Console
import Data.Array as Array
import Data.Set as Set
import Effect as Effect
import Prelude as Prelude
import TypeScript.Identifier as Identifier
import Test.Unit as TestUnit

test :: TestUnit.Test
test = do
  Prelude.pure Prelude.unit

log100Identifier :: Effect.Effect Prelude.Unit
log100Identifier = Console.logValue "log100Identifier" create10000Identifier

create10000Identifier :: Array Identifier.TsIdentifier
create10000Identifier =
  ( Array.foldl
        ( \value _ ->
            let
              { identifier, nextIdentifierIndex } = Identifier.createIdentifier value.nextIdentifierIndex Set.empty
            in
              { nextIdentifierIndex
              , result: Array.snoc value.result identifier
              }
        )
        ({ nextIdentifierIndex: Identifier.initialIdentifierIndex, result: [] })
        (Array.replicate 10000 Prelude.unit)
    )
    .result
