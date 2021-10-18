module CreativeRecord.Start where

import Prelude
import CreativeRecord.Build as Build
import Data.Either as Either
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
            runFirebaseEmulator
        )
    )

runFirebaseEmulator :: Aff.Aff Unit
runFirebaseEmulator = do
  lsSample
  EffectClass.liftEffect (Console.log "ここで Firebase のエミュレーター を起動するようにする")

lsSample :: Aff.Aff Unit
lsSample =
  Aff.makeAff
    ( \callback -> do
        lsEffect (callback (Either.Right unit))
        pure (Aff.effectCanceler (Console.log "ls をキャンセルしようとした?"))
    )

lsEffect :: Effect.Effect Unit -> Effect.Effect Unit
lsEffect callback = do
  childProcess <-
    Shell.spawn
      ( NonEmptyString.nes
          (Proxy.Proxy :: Proxy.Proxy "npx firebase emulators:start --project definy-lang --config ./distribution/creative-record/firebase.json")
      )
      Shell.defaultSpawnOptions
  Stream.onData
    (Shell.stdout childProcess)
    ( \buffer -> do
        stdout <- (Buffer.toString Encoding.UTF8 buffer)
        Console.log (append "firebase emulator の ログ: " stdout)
        callback
    )
