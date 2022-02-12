module Firebase.FirebaseJson
  ( FirebaseJson(..)
  , Rewrite(..)
  , Emulators(..)
  , toJson
  , FunctionsSetting(..)
  , SourceAndHeaders(..)
  , Header(..)
  ) where

import Data.Argonaut as Argonaut
import Data.Array as Array
import Data.Maybe as Maybe
import Data.String.NonEmpty (NonEmptyString)
import Data.Tuple as Tuple
import Data.UInt as UInt
import FileSystem.FileType as FileType
import FileSystem.Path as Path
import Prelude as Prelude

newtype FirebaseJson
  = FirebaseJson
  { hostingDistributionPath :: Path.DistributionDirectoryPath
  , functions :: Maybe.Maybe FunctionsSetting
  , firestoreRulesFilePath :: Path.DistributionFilePath
  , cloudStorageRulesFilePath :: Path.DistributionFilePath
  , hostingRewites :: Array Rewrite
  , hostingHeaders :: Array SourceAndHeaders
  , emulators :: Emulators
  }

newtype FunctionsSetting
  = FunctionsSetting
  { emulatorsPortNumber :: UInt.UInt
  , distributionPath :: Path.DistributionDirectoryPath
  }

newtype Rewrite
  = Rewrite
  { source :: NonEmptyString
  , function :: NonEmptyString
  }

newtype SourceAndHeaders
  = SourceAndHeaders
  { source :: NonEmptyString
  , headers :: Array Header
  }

newtype Header
  = Header
  { key :: NonEmptyString
  , value :: String
  }

newtype Emulators
  = Emulators
  { firestorePortNumber :: Maybe.Maybe UInt.UInt
  , hostingPortNumber :: Maybe.Maybe UInt.UInt
  , storagePortNumber :: Maybe.Maybe UInt.UInt
  }

toJson :: FirebaseJson -> Argonaut.Json
toJson (FirebaseJson record) =
  Argonaut.encodeJson
    ( Array.concat
        [ case record.functions of
            Maybe.Just (FunctionsSetting setting) ->
              [ Tuple.Tuple "functions"
                  ( Argonaut.encodeJson
                      { source:
                          Path.distributionDirectoryPathToStringBaseApp
                            setting.distributionPath
                      }
                  )
              ]
            Maybe.Nothing -> []
        , [ Tuple.Tuple
              "firestore"
              ( Argonaut.encodeJson
                  { rules:
                      Path.distributionFilePathToStringBaseApp
                        record.firestoreRulesFilePath
                        FileType.FirebaseSecurityRules
                  }
              )
          , Tuple.Tuple "storage"
              ( Argonaut.encodeJson
                  { rules:
                      Path.distributionFilePathToStringBaseApp
                        record.cloudStorageRulesFilePath
                        FileType.FirebaseSecurityRules
                  }
              )
          , Tuple.Tuple "hosting"
              ( Argonaut.encodeJson
                  { public:
                      Path.distributionDirectoryPathToStringBaseApp
                        record.hostingDistributionPath
                  , rewrites:
                      Prelude.map rewriteToJson record.hostingRewites
                  , headers:
                      Prelude.map sourceAndHeadersToJson record.hostingHeaders
                  , cleanUrls: true
                  , trailingSlash: false
                  }
              )
          , Tuple.Tuple "emulators"
              (emulatorsToJsonValue record.emulators record.functions)
          ]
        ]
    )

rewriteToJson :: Rewrite -> Argonaut.Json
rewriteToJson (Rewrite { source, function }) =
  Argonaut.encodeJson
    { source: source
    , function: function
    }

sourceAndHeadersToJson :: SourceAndHeaders -> Argonaut.Json
sourceAndHeadersToJson (SourceAndHeaders { source, headers }) =
  Argonaut.encodeJson
    { source: source
    , headers: Prelude.map headerToJson headers
    }

headerToJson :: Header -> Argonaut.Json
headerToJson (Header rec) = Argonaut.encodeJson rec

emulatorsToJsonValue :: Emulators -> Maybe.Maybe FunctionsSetting -> Argonaut.Json
emulatorsToJsonValue (Emulators emulators) functionsSetting =
  Argonaut.encodeJson
    ( Array.concat
        [ case functionsSetting of
            Maybe.Just (FunctionsSetting setting) ->
              [ Tuple.Tuple "functions"
                  ( Argonaut.encodeJson
                      { port:
                          UInt.toNumber setting.emulatorsPortNumber
                      }
                  )
              ]
            Maybe.Nothing -> []
        , case emulators.firestorePortNumber of
            Maybe.Just portNumber ->
              [ Tuple.Tuple "firestore"
                  ( Argonaut.encodeJson
                      { port: UInt.toNumber portNumber }
                  )
              ]
            Maybe.Nothing -> []
        , case emulators.hostingPortNumber of
            Maybe.Just portNumber ->
              [ Tuple.Tuple "hosting"
                  ( Argonaut.encodeJson
                      { port: UInt.toNumber portNumber }
                  )
              ]
            Maybe.Nothing -> []
        , case emulators.storagePortNumber of
            Maybe.Just portNumber ->
              [ Tuple.Tuple "storage"
                  ( Argonaut.encodeJson
                      { port: UInt.toNumber portNumber }
                  )
              ]
            Maybe.Nothing -> []
        , [ Tuple.Tuple "ui"
              (Argonaut.encodeJson { enabled: true })
          ]
        ]
    )
