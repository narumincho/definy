module CreativeRecord.Build where

import Prelude
import Control.Parallel.Class as ParallelClass
import Data.Either as Either
import Data.Maybe as Mabye
import Data.Maybe as Maybe
import Data.String as String
import Data.String.NonEmpty as NonEmptyString
import Data.UInt as UInt
import Effect as Effect
import Effect.Aff as Aff
import Effect.Class as EffectClass
import Effect.Console as Console
import EsBuild as EsBuild
import FileSystem as FileSystem
import FileType as FileType
import FirebaseJson as FirebaseJson
import Hash as Hash
import Node.Buffer as Buffer
import Node.ChildProcess as ChildProcess
import Node.Encoding as Encoding
import Type.Proxy as Proxy

appName :: NonEmptyString.NonEmptyString
appName = NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "creative-record")

firstClientProgramFilePath :: String
firstClientProgramFilePath = "./distribution/creative-record/client-spago-result/program.js"

esbuildClientProgramFileDirectoryPath :: FileSystem.DistributionDirectoryPath
esbuildClientProgramFileDirectoryPath =
  FileSystem.DistributionDirectoryPath
    { appName
    , folderNameMaybe:
        Maybe.Just
          ( NonEmptyString.nes
              (Proxy.Proxy :: Proxy.Proxy "client-esbuild-result")
          )
    }

hostingDistributionDirectoryName :: NonEmptyString.NonEmptyString
hostingDistributionDirectoryName =
  NonEmptyString.nes
    (Proxy.Proxy :: Proxy.Proxy "hosting")

hostingDirectoryPath :: FileSystem.DistributionDirectoryPath
hostingDirectoryPath =
  FileSystem.DistributionDirectoryPath
    { appName
    , folderNameMaybe: Maybe.Just hostingDistributionDirectoryName
    }

build :: Aff.Aff Unit
build =
  ParallelClass.sequential
    ( apply
        (map (\_ _ -> unit) (Aff.parallel writeFirebaseJson))
        (Aff.parallel clientProgramBuild)
    )

clientProgramBuild :: Aff.Aff Unit
clientProgramBuild = do
  runSpagoBundleAppAndLog
  runEsbuild
  readEsbuildResultClientProgramFile
  EffectClass.liftEffect (Console.log "クライアント向けビルド完了!")

runSpagoBundleAppAndLog :: Aff.Aff Unit
runSpagoBundleAppAndLog = do
  Aff.makeAff
    ( \callback ->
        map (\_ -> Aff.nonCanceler)
          ( ChildProcess.exec
              ( append
                  "spago bundle-app --main CreativeRecord.Client --to "
                  firstClientProgramFilePath
              )
              ChildProcess.defaultExecOptions
              (\_ -> callback (Either.Right unit))
          )
    )
  EffectClass.liftEffect (Console.log "spago でのビルドに成功!")

execResultToString :: ChildProcess.ExecResult -> Effect.Effect String
execResultToString result = do
  stdout <- Buffer.toString Encoding.UTF8 result.stdout
  stderr <- Buffer.toString Encoding.UTF8 result.stderr
  pure
    ( append
        "build-std"
        (show { stdout, stderr, error: result.error })
    )

runEsbuild :: Aff.Aff Unit
runEsbuild = do
  EsBuild.build
    { entryPoints: firstClientProgramFilePath
    , outdir: NonEmptyString.toString (FileSystem.distributionDirectoryPathToString esbuildClientProgramFileDirectoryPath)
    , sourcemap: false
    , target: [ "chrome94", "firefox93", "safari15" ]
    }
  EffectClass.liftEffect (Console.log "esbuild でのビルドに成功!")

readEsbuildResultClientProgramFile :: Aff.Aff Unit
readEsbuildResultClientProgramFile = do
  clientProgramAsString <-
    FileSystem.readTextFileInDistribution
      ( FileSystem.DistributionFilePath
          { directoryPath: esbuildClientProgramFileDirectoryPath
          , fileName: NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "program")
          , fileType: Maybe.Just FileType.JavaScript
          }
      )
  let
    clientProgramHashValue = Hash.stringToSha256HashValue clientProgramAsString
  FileSystem.writeTextFileInDistribution (FileSystem.DistributionFilePath { directoryPath: hostingDirectoryPath, fileName: clientProgramHashValue, fileType: Maybe.Nothing }) clientProgramAsString
  pure unit

writeFirebaseJson :: Aff.Aff Unit
writeFirebaseJson = do
  FileSystem.writeTextFileInDistribution
    ( FileSystem.DistributionFilePath
        { directoryPath: FileSystem.DistributionDirectoryPath { appName, folderNameMaybe: Mabye.Nothing }
        , fileName: NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "firebase")
        , fileType: Maybe.Just FileType.Json
        }
    )
    ( FirebaseJson.toString
        ( FirebaseJson.FirebaseJson
            { cloudStorageRulesPath: "./storage.rules"
            , emulators:
                FirebaseJson.Emulators
                  { functionsPortNumber: Maybe.Just (UInt.fromInt 5001)
                  , firestorePortNumber: Maybe.Just (UInt.fromInt 8080)
                  , hostingPortNumber: Maybe.Nothing
                  , storagePortNumber: Maybe.Just (UInt.fromInt 9199)
                  }
            , firestoreRulesFilePath: "./firestore.rules"
            , functionsDistributionPath: "./functions"
            , hostingDistributionPath:
                append
                  "./"
                  (NonEmptyString.toString hostingDistributionDirectoryName)
            , hostingRewites: []
            }
        )
    )
  EffectClass.liftEffect (Console.log "firebase.json の書き込みに成功!")
