module Firebase.FirebaseJson
  ( FirebaseJson(..)
  , Rewrite(..)
  , Emulators(..)
  , toJson
  , FunctionsSetting
  ) where

import Data.Argonaut.Core as ArgonautCore
import Data.Array as Array
import Data.Maybe as Maybe
import Data.String.NonEmpty as NonEmptyString
import Data.Tuple as Tuple
import Data.UInt as UInt
import FileSystem.Path as Path
import FileType as FileType
import Foreign.Object as Object
import Prelude as Prelude

newtype FirebaseJson
  = FirebaseJson
  { hostingDistributionPath :: Path.DistributionDirectoryPath
  , functions :: Maybe.Maybe FunctionsSetting
  , firestoreRulesFilePath :: Path.DistributionFilePath
  , cloudStorageRulesFilePath :: Path.DistributionFilePath
  , hostingRewites :: Array Rewrite
  , emulators :: Emulators
  }

newtype FunctionsSetting
  = FunctionsSetting
  { emulatorsPortNumber :: UInt.UInt
  , distributionPath :: Path.DistributionDirectoryPath
  }

newtype Rewrite
  = Rewrite { source :: String, function :: String }

newtype Emulators
  = Emulators
  { firestorePortNumber :: Maybe.Maybe UInt.UInt
  , hostingPortNumber :: Maybe.Maybe UInt.UInt
  , storagePortNumber :: Maybe.Maybe UInt.UInt
  }

toJson :: FirebaseJson -> ArgonautCore.Json
toJson (FirebaseJson record) =
  tupleListToJson
    ( Array.concat
        [ case record.functions of
            Maybe.Just (FunctionsSetting setting) ->
              [ Tuple.Tuple "functions"
                  ( ArgonautCore.jsonSingletonObject "source"
                      ( ArgonautCore.fromString
                          ( NonEmptyString.toString
                              ( Path.distributionDirectoryPathToStringBaseApp
                                  setting.distributionPath
                              )
                          )
                      )
                  )
              ]
            Maybe.Nothing -> []
        , [ Tuple.Tuple
              "firestore"
              ( ArgonautCore.jsonSingletonObject "rules"
                  ( ArgonautCore.fromString
                      ( NonEmptyString.toString
                          ( Path.distributionFilePathToStringBaseApp
                              record.firestoreRulesFilePath
                              FileType.FirebaseSecurityRules
                          )
                      )
                  )
              )
          , Tuple.Tuple "storage"
              ( ArgonautCore.jsonSingletonObject "rules"
                  ( ArgonautCore.fromString
                      ( NonEmptyString.toString
                          ( Path.distributionFilePathToStringBaseApp
                              record.cloudStorageRulesFilePath
                              FileType.FirebaseSecurityRules
                          )
                      )
                  )
              )
          , Tuple.Tuple "hosting"
              ( tupleListToJson
                  [ Tuple.Tuple "public"
                      ( ArgonautCore.fromString
                          ( NonEmptyString.toString
                              ( Path.distributionDirectoryPathToStringBaseApp
                                  record.hostingDistributionPath
                              )
                          )
                      )
                  , Tuple.Tuple "rewrites"
                      ( ArgonautCore.fromArray
                          (Prelude.map rewriteToJson record.hostingRewites)
                      )
                  , Tuple.Tuple "cleanUrls" ArgonautCore.jsonTrue
                  , Tuple.Tuple "trailingSlash" ArgonautCore.jsonFalse
                  ]
              )
          , Tuple.Tuple "emulators" (emulatorsToJsonValue record.emulators record.functions)
          ]
        ]
    )

tupleListToJson :: Array (Tuple.Tuple String ArgonautCore.Json) -> ArgonautCore.Json
tupleListToJson list = ArgonautCore.fromObject (Object.fromFoldable list)

rewriteToJson :: Rewrite -> ArgonautCore.Json
rewriteToJson (Rewrite { source, function }) =
  tupleListToJson
    [ Tuple.Tuple "source" (ArgonautCore.fromString source)
    , Tuple.Tuple "function" (ArgonautCore.fromString function)
    ]

emulatorsToJsonValue :: Emulators -> Maybe.Maybe FunctionsSetting -> ArgonautCore.Json
emulatorsToJsonValue (Emulators emulators) functionsSetting =
  tupleListToJson
    ( Array.concat
        [ case functionsSetting of
            Maybe.Just (FunctionsSetting setting) ->
              [ Tuple.Tuple "functions"
                  ( ArgonautCore.jsonSingletonObject "port"
                      ( ArgonautCore.fromNumber
                          (UInt.toNumber setting.emulatorsPortNumber)
                      )
                  )
              ]
            Maybe.Nothing -> []
        , case emulators.firestorePortNumber of
            Maybe.Just portNumber ->
              [ Tuple.Tuple "firestore"
                  ( ArgonautCore.jsonSingletonObject "port"
                      ( ArgonautCore.fromNumber
                          (UInt.toNumber portNumber)
                      )
                  )
              ]
            Maybe.Nothing -> []
        , case emulators.hostingPortNumber of
            Maybe.Just portNumber ->
              [ Tuple.Tuple "hosting"
                  ( ArgonautCore.jsonSingletonObject "port"
                      ( ArgonautCore.fromNumber
                          (UInt.toNumber portNumber)
                      )
                  )
              ]
            Maybe.Nothing -> []
        , case emulators.storagePortNumber of
            Maybe.Just portNumber ->
              [ Tuple.Tuple "storage"
                  ( ArgonautCore.jsonSingletonObject "port"
                      ( ArgonautCore.fromNumber
                          (UInt.toNumber portNumber)
                      )
                  )
              ]
            Maybe.Nothing -> []
        , [ Tuple.Tuple "ui"
              ( ArgonautCore.jsonSingletonObject "enabled"
                  ( ArgonautCore.jsonTrue
                  )
              )
          ]
        ]
    )
