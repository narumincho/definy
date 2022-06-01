module Definy.Version
  ( Version(..)
  , getVersion
  , toExpr
  , toProductionOrDevelopment
  , toSimpleString
  , versionType
  ) where

import Prelude
import Data.Array.NonEmpty as NonEmptyArray
import Data.Maybe (Maybe(..))
import Data.String.NonEmpty (NonEmptyString)
import Data.String.NonEmpty as NonEmptyString
import Effect (Effect)
import Effect.Aff as Aff
import Effect.Class as EffectClass
import Node.Process as Process
import ProductionOrDevelopment as ProductionOrDevelopment
import PureScript.Data as P
import PureScript.Wellknown as Pw
import Type.Prelude (Proxy(..))

data Version
  = Production NonEmptyString
  | Development String

toSimpleString :: Version -> String
toSimpleString = case _ of
  Production sha -> append "Production: " (NonEmptyString.toString sha)
  Development dateTime -> append "Development: " dateTime

definyVersionModuleName :: P.ModuleName
definyVersionModuleName =
  P.ModuleName
    ( NonEmptyArray.cons'
        (NonEmptyString.nes (Proxy :: _ "Definy"))
        [ NonEmptyString.nes (Proxy :: _ "Version") ]
    )

versionType :: Pw.PType Version
versionType =
  Pw.pTypeFrom
    { moduleName: definyVersionModuleName
    , name: NonEmptyString.nes (Proxy :: _ "Version")
    }

toExpr :: Version -> Pw.Expr Version
toExpr = case _ of
  Production githubSha ->
    Pw.call
      ( Pw.tag
          { moduleName: definyVersionModuleName
          , name: NonEmptyString.nes (Proxy :: _ "Production")
          }
      )
      (Pw.nonEmptyStringLiteral githubSha)
  Development dateTime ->
    Pw.call
      ( Pw.tag
          { moduleName: definyVersionModuleName
          , name: NonEmptyString.nes (Proxy :: _ "Development")
          }
      )
      (Pw.stringLiteral dateTime)

getVersion :: ProductionOrDevelopment.ProductionOrDevelopment -> Aff.Aff Version
getVersion = case _ of
  ProductionOrDevelopment.Production -> do
    sha <- readGithubSha
    pure (Production sha)
  ProductionOrDevelopment.Development -> do
    now <- EffectClass.liftEffect simpleGetNow
    pure (Development now)

readGithubSha :: Aff.Aff NonEmptyString
readGithubSha =
  EffectClass.liftEffect
    ( bind
        (Process.lookupEnv "GITHUB_SHA")
        ( case _ of
            Just githubShaValue -> case NonEmptyString.fromString githubShaValue of
              Just githubShaAsNonEmptyString -> pure githubShaAsNonEmptyString
              Nothing -> Aff.throwError (Aff.error "GITHUB_SHA is empty")
            Nothing -> Aff.throwError (Aff.error "can not read GITHUB_SHA")
        )
    )

toProductionOrDevelopment :: Version -> ProductionOrDevelopment.ProductionOrDevelopment
toProductionOrDevelopment = case _ of
  Production _ -> ProductionOrDevelopment.Production
  Development _ -> ProductionOrDevelopment.Development

foreign import simpleGetNow :: Effect String
