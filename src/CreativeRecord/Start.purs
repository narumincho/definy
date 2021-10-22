module CreativeRecord.Start where

import Prelude
import CreativeRecord.Build as Build
import Effect as Effect
import Effect.Aff as Aff
import Effect.Class as EffectClass
import Effect.Console as Console
import Node.Buffer as Buffer
import Node.Encoding as Encoding
import Node.Stream as Stream
import Shell as Shell
import Type.Proxy as Proxy
import Data.String.NonEmpty as NonEmptyString

main :: Effect.Effect Unit
main =
  Aff.runAff_ Console.logShow
    ( Aff.attempt
        ( do
            Build.build
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
        Console.log (append "firebase emulator の ログ: " stdout)
    )
