module Definy.Version where

import Data.Maybe as Maybe
import Data.String.NonEmpty as NonEmptyString
import Definy.Mode as Mode
import Effect as Effect
import Node.Process as Process
import Prelude as Prelude
import Type.Proxy as Proxy

data Version
  = Release NonEmptyString.NonEmptyString
  | Development

generateVersion :: Mode.Mode -> Effect.Effect Version
generateVersion = case _ of
  Mode.Develpment -> Prelude.pure Development
  Mode.Release ->
    Prelude.map
      Release
      ( Prelude.map
          ( case _ of
              Maybe.Just githubShaValue -> case NonEmptyString.fromString githubShaValue of
                Maybe.Just githubShaAsNonEmptyString -> githubShaAsNonEmptyString
                Maybe.Nothing -> NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "GITHUB_SHA is empty")
              Maybe.Nothing -> NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "can not read GITHUB_SHA")
          )
          (Process.lookupEnv "GITHUB_SHA")
      )
