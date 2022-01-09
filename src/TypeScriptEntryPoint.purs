module TypeScriptEntryPoint
  ( colorFrom
  , createPackageJson
  , definyBuild
  , english
  , esperanto
  , japanese
  , just
  , nothing
  , packageNameFromString
  , pathAndSearchParamsFromPath
  , structuredUrlFromOriginAndPathAndSearchParams
  ) where

-- PureScript で書かれたコードを呼び出すためのモジュール. bundle-module するためにこのモジュール以外から import してはいけない
import Color as Color
import Console as Console
import Data.Argonaut.Core as ArgonautCore
import Data.Function.Uncurried as FnUncurried
import Data.Map as Map
import Data.Maybe (Maybe)
import Data.Maybe as Maybe
import Data.String.NonEmpty (NonEmptyString)
import Data.Tuple as Tuple
import Definy.Build as DefinyBuild
import Effect.Aff as Aff
import Effect.Uncurried as EffectUncurried
import Language as Language
import PackageJson as PackageJson
import Prelude as Prelude
import ProductionOrDevelopment as ProductionOrDevelopment
import StructuredUrl as StructuredUrl

-- | 色の作成
colorFrom :: { r :: Int, g :: Int, b :: Int, a :: Number } -> Color.Color
colorFrom { r, g, b, a } = Color.rgba r g b a

japanese :: Language.Language
japanese = Language.Japanese

english :: Language.Language
english = Language.English

esperanto :: Language.Language
esperanto = Language.Esperanto

just :: forall a. a -> Maybe a
just = Maybe.Just

nothing :: forall a b. b -> Maybe a
nothing _ = Maybe.Nothing

pathAndSearchParamsFromPath :: Array NonEmptyString -> StructuredUrl.PathAndSearchParams
pathAndSearchParamsFromPath = StructuredUrl.fromPath

structuredUrlFromOriginAndPathAndSearchParams ::
  FnUncurried.Fn2
    NonEmptyString
    StructuredUrl.PathAndSearchParams
    StructuredUrl.StructuredUrl
structuredUrlFromOriginAndPathAndSearchParams =
  FnUncurried.mkFn2
    ( \origin pathAndSearchParams ->
        StructuredUrl.StructuredUrl
          { origin, pathAndSearchParams }
    )

packageNameFromString :: NonEmptyString -> PackageJson.Name
packageNameFromString rawName = PackageJson.nameFromNonEmptyStringUnsafe rawName

createPackageJson ::
  { author :: NonEmptyString
  , dependencies :: Array { name :: NonEmptyString, version :: NonEmptyString }
  , description :: NonEmptyString
  , entryPoint :: NonEmptyString
  , gitHubAccountName :: NonEmptyString
  , gitHubRepositoryName :: NonEmptyString
  , homepage :: StructuredUrl.StructuredUrl
  , name :: PackageJson.Name
  , nodeVersion :: NonEmptyString
  , typeFilePath :: Maybe NonEmptyString
  , version :: NonEmptyString
  } ->
  String
createPackageJson option =
  ArgonautCore.stringify
    ( PackageJson.toJson
        ( PackageJson.PackageJsonInput
            { author: option.author
            , dependencies:
                Map.fromFoldable
                  ( Prelude.map
                      (\{ name, version } -> Tuple.Tuple name version)
                      option.dependencies
                  )
            , description: option.description
            , entryPoint: option.entryPoint
            , gitHubAccountName: option.gitHubAccountName
            , gitHubRepositoryName: option.gitHubRepositoryName
            , homepage: option.homepage
            , name: option.name
            , nodeVersion: option.nodeVersion
            , typeFilePath: option.typeFilePath
            , version: option.version
            }
        )
    )

definyBuild ::
  EffectUncurried.EffectFn1
    { isDevelopment :: Boolean, origin :: NonEmptyString }
    Prelude.Unit
definyBuild =
  EffectUncurried.mkEffectFn1
    ( \option ->
        Aff.runAff_ (Console.logValue "definy build by purescript:")
          ( Aff.attempt
              ( DefinyBuild.build
                  ( if option.isDevelopment then
                      ProductionOrDevelopment.Development
                    else
                      ProductionOrDevelopment.Production
                  )
                  option.origin
              )
          )
    )
