module CreativeRecord.Start where

import Prelude
import Console as Console
import CreativeRecord.Build as Build
import Data.String.NonEmpty as NonEmptyString
import Effect as Effect
import Effect.Aff as Aff
import Effect.Class as EffectClass
import Node.Buffer as Buffer
import Node.Encoding as Encoding
import Node.Stream as Stream
import ProductionOrDevelopment as ProductionOrDevelopment
import Shell as Shell
import Type.Proxy as Proxy

main :: Effect.Effect Unit
main =
  Aff.runAff_ (Console.logValue "start aff result")
    ( Aff.attempt
        ( do
            Build.build ProductionOrDevelopment.Develpment
            EffectClass.liftEffect runFirebaseEmulator
        )
    )

runFirebaseEmulator :: Effect.Effect Unit
runFirebaseEmulator = do
  childProcess <-
    Shell.spawn
      ( NonEmptyString.nes
          (Proxy.Proxy :: Proxy.Proxy "npx firebase emulators:start --project definy-lang --config ./distribution/creative-record/firebase.json")
      )
  Stream.onData
    (Shell.stdout childProcess)
    ( \buffer -> do
        stdout <- (Buffer.toString Encoding.UTF8 buffer)
        Console.logValue "firebase emulator の ログ:" stdout
    )
