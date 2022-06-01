module Definy.BuildCodeGen where

import Prelude as Prelude
import Data.String.NonEmpty (NonEmptyString)
import Data.String.NonEmpty as NonEmptyString
import Definy.ModuleName as ModuleName
import Definy.Version as Version
import ProductionOrDevelopment as ProductionOrDevelopment
import PureScript.Data as PureScriptData
import PureScript.Wellknown as PureScriptWellknown
import Type.Proxy (Proxy(..))

generateNowModeAndOriginPureScriptModule ::
  ProductionOrDevelopment.ProductionOrDevelopment ->
  NonEmptyString ->
  Version.Version ->
  PureScriptData.Module
generateNowModeAndOriginPureScriptModule productionOrDevelopment origin version =
  PureScriptData.Module
    { name: ModuleName.originAndVersion
    , definitionList:
        [ PureScriptWellknown.definition
            { name: NonEmptyString.nes (Proxy :: _ "nowMode")
            , document: "実行モード (ビルド時にコード生成される)"
            , pType:
                PureScriptWellknown.pTypeFrom
                  { moduleName: ModuleName.productionOrDevelopment
                  , name: NonEmptyString.nes (Proxy :: _ "ProductionOrDevelopment")
                  }
            , expr:
                case productionOrDevelopment of
                  ProductionOrDevelopment.Development ->
                    PureScriptWellknown.tag
                      { moduleName: ModuleName.productionOrDevelopment
                      , name: NonEmptyString.nes (Proxy :: _ "Development")
                      }
                  ProductionOrDevelopment.Production ->
                    PureScriptWellknown.tag
                      { moduleName: ModuleName.productionOrDevelopment
                      , name: NonEmptyString.nes (Proxy :: _ "Production")
                      }
            , isExport: true
            }
        , PureScriptWellknown.definition
            { name: NonEmptyString.nes (Proxy :: _ "origin")
            , document: "オリジン (ビルド時にコード生成される)"
            , pType: PureScriptWellknown.nonEmptyString
            , expr: PureScriptWellknown.nonEmptyStringLiteral origin
            , isExport: true
            }
        , createVersionDefinition version
        ]
    }

createVersionDefinition ::
  Version.Version ->
  PureScriptData.Definition
createVersionDefinition version =
  PureScriptWellknown.definition
    { name: NonEmptyString.nes (Proxy :: _ "version")
    , document: Prelude.append "バージョン名 (ビルド時にコード生成される) " (Version.toSimpleString version)
    , pType: Version.versionType
    , expr:
        Version.toExpr version
    , isExport: true
    }
