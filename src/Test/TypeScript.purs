module Test.TypeScript
  ( log100Identifier
  , test
  ) where

import Prelude
import Console as Console
import Data.Array as Array
import Data.Map as Map
import Data.Maybe (Maybe(..))
import Data.Set as Set
import Data.String as String
import Data.String.NonEmpty as NonEmptyString
import Data.Tuple as Tuple
import Effect as Effect
import Prelude as Prelude
import Test.Unit as TestUnit
import Type.Proxy (Proxy(..))
import TypeScript.Data as Data
import TypeScript.Identifier as Identifier
import TypeScript.ModuleName as ModuleName
import TypeScript.ToString as ToString
import Test.Util as TestUtil
import Test.Util (assertEqual)

test :: TestUnit.Test
test = do
  sampleCodeExpressServerIncludeImportKeyword
  sampleCodeExpressServerIncludePath
  identifierNotCreateReservedWord

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

sampleCodeExpressServerIncludeImportKeyword :: TestUnit.Test
sampleCodeExpressServerIncludeImportKeyword =
  TestUtil.includeString
    "sampleCodeExpressServerIncludeImportKeyword"
    sampleCodeExpressServerAsString
    (String.Pattern "import")

sampleCodeExpressServerIncludePath :: TestUnit.Test
sampleCodeExpressServerIncludePath =
  TestUtil.includeString
    "sampleCodeExpressServerIncludePath"
    sampleCodeExpressServerAsString
    (String.Pattern "\"express\"")

identifierNotCreateReservedWord :: TestUnit.Test
identifierNotCreateReservedWord = do
  assertEqual "new is reserved"
    { actual: Identifier.fromNonEmptyString (NonEmptyString.nes (Proxy :: _ "new"))
    , expected: Nothing
    }
  assertEqual "include invalid char"
    { actual: Identifier.fromNonEmptyString (NonEmptyString.nes (Proxy :: _ "s?re"))
    , expected: Nothing
    }
  assertEqual "safe char"
    { actual: Identifier.fromNonEmptyString (NonEmptyString.nes (Proxy :: _ "safeChar"))
    , expected: Just (Identifier.fromSymbolProxyUnsafe (Proxy :: _ "safeChar"))
    }

sampleCodeExpressServerAsString :: String
sampleCodeExpressServerAsString = case Map.lookup
    (ModuleName.toFileSystemName sampleCodeExpressServerModuleName)
    ( ToString.typeScriptModuleMapToString
        ( Data.TypeScriptModuleMap
            ( Map.fromFoldable
                [ sampleCodeExpressServer ]
            )
        )
    ) of
  Just (ToString.ModuleResult { code }) -> code
  Nothing -> "test module not found"

sampleCodeExpressServerModuleName :: ModuleName.ModuleName
sampleCodeExpressServerModuleName = ModuleName.fromSymbolProxy (Proxy :: _ "expressServer")

sampleCodeExpressServer :: Tuple.Tuple ModuleName.ModuleName Data.TypeScriptModule
sampleCodeExpressServer =
  let
    expressRequest =
      Data.TsTypeImportedType
        ( Data.ImportedType
            { moduleName: ModuleName.fromSymbolProxy (Proxy :: _ "express")
            , typeNameAndTypeParameter:
                Data.TypeNameAndTypeParameter
                  { name: Identifier.fromSymbolProxyUnsafe (Proxy :: _ "Request")
                  , typeParameterList: []
                  }
            }
        )

    expressResponse =
      Data.TsTypeImportedType
        ( Data.ImportedType
            { moduleName: ModuleName.fromSymbolProxy (Proxy :: _ "express")
            , typeNameAndTypeParameter:
                Data.TypeNameAndTypeParameter
                  { name: Identifier.fromSymbolProxyUnsafe (Proxy :: _ "Response")
                  , typeParameterList: []
                  }
            }
        )
  in
    Tuple.Tuple
      sampleCodeExpressServerModuleName
      ( Data.TypeScriptModule
          { exportDefinitionList:
              [ Data.ExportDefinitionFunction
                  ( Data.FunctionDeclaration
                      { name: Identifier.fromSymbolProxyUnsafe (Proxy :: _ "middleware")
                      , document: "ミドルウェア"
                      , parameterList:
                          [ Data.ParameterWithDocument
                              { name: Identifier.fromSymbolProxyUnsafe (Proxy :: _ "request")
                              , document: "expressのリクエスト"
                              , type: expressRequest
                              }
                          , Data.ParameterWithDocument
                              { name: Identifier.fromSymbolProxyUnsafe (Proxy :: _ "response")
                              , document: "expressのレスポンス"
                              , type: expressResponse
                              }
                          ]
                      , returnType: Data.TsTypeVoid
                      , statementList: []
                      , typeParameterList: []
                      , export: true
                      }
                  )
              ]
          }
      )
