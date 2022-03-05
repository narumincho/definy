module Definy.Version
  ( Version(..)
  , getVersion
  , toExpr
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
  = Release NonEmptyString
  | Development String

toSimpleString :: Version -> String
toSimpleString = case _ of
  Release sha -> append "Release: " (NonEmptyString.toString sha)
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
  Release githubSha ->
    Pw.call
      ( Pw.tag
          { moduleName: definyVersionModuleName
          , name: NonEmptyString.nes (Proxy :: _ "Release")
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
    pure (Release sha)
  ProductionOrDevelopment.Development -> do
    now <- EffectClass.liftEffect simpleGetNow
    pure (Development now)

readGithubSha :: Aff.Aff NonEmptyString
readGithubSha =
  EffectClass.liftEffect
    ( map
        ( case _ of
            Just githubShaValue -> case NonEmptyString.fromString githubShaValue of
              Just githubShaAsNonEmptyString -> githubShaAsNonEmptyString
              Nothing -> NonEmptyString.nes (Proxy :: _ "GITHUB_SHA is empty")
            Nothing -> NonEmptyString.nes (Proxy :: _ "can not read GITHUB_SHA")
        )
        (Process.lookupEnv "GITHUB_SHA")
    )

foreign import simpleGetNow :: Effect String
