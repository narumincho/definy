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
import Util as Util

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
  Util.tupleListToJson
    ( Array.concat
        [ case record.functions of
            Maybe.Just (FunctionsSetting setting) ->
              [ Tuple.Tuple "functions"
                  ( Argonaut.jsonSingletonObject "source"
                      ( Util.jsonFromNonEmptyString
                          ( Path.distributionDirectoryPathToStringBaseApp
                              setting.distributionPath
                          )
                      )
                  )
              ]
            Maybe.Nothing -> []
        , [ Tuple.Tuple
              "firestore"
              ( Argonaut.jsonSingletonObject "rules"
                  ( Util.jsonFromNonEmptyString
                      ( Path.distributionFilePathToStringBaseApp
                          record.firestoreRulesFilePath
                          FileType.FirebaseSecurityRules
                      )
                  )
              )
          , Tuple.Tuple "storage"
              ( Argonaut.jsonSingletonObject "rules"
                  ( Util.jsonFromNonEmptyString
                      ( Path.distributionFilePathToStringBaseApp
                          record.cloudStorageRulesFilePath
                          FileType.FirebaseSecurityRules
                      )
                  )
              )
          , Tuple.Tuple "hosting"
              ( Util.tupleListToJson
                  [ Tuple.Tuple "public"
                      ( Util.jsonFromNonEmptyString
                          ( Path.distributionDirectoryPathToStringBaseApp
                              record.hostingDistributionPath
                          )
                      )
                  , Tuple.Tuple "rewrites"
                      ( Argonaut.fromArray
                          (Prelude.map rewriteToJson record.hostingRewites)
                      )
                  , Tuple.Tuple "headers"
                      (Argonaut.fromArray (Prelude.map sourceAndHeadersToJson record.hostingHeaders))
                  , Tuple.Tuple "cleanUrls" Argonaut.jsonTrue
                  , Tuple.Tuple "trailingSlash" Argonaut.jsonFalse
                  ]
              )
          , Tuple.Tuple "emulators" (emulatorsToJsonValue record.emulators record.functions)
          ]
        ]
    )

rewriteToJson :: Rewrite -> Argonaut.Json
rewriteToJson (Rewrite { source, function }) =
  Util.tupleListToJson
    [ Tuple.Tuple "source" (Util.jsonFromNonEmptyString source)
    , Tuple.Tuple "function" (Util.jsonFromNonEmptyString function)
    ]

sourceAndHeadersToJson :: SourceAndHeaders -> Argonaut.Json
sourceAndHeadersToJson (SourceAndHeaders { source, headers }) =
  Util.tupleListToJson
    [ Tuple.Tuple "source" (Util.jsonFromNonEmptyString source)
    , Tuple.Tuple "headers" (Argonaut.fromArray (Prelude.map headerToJson headers))
    ]

headerToJson :: Header -> Argonaut.Json
headerToJson (Header { key, value }) =
  Util.tupleListToJson
    [ Tuple.Tuple "key" (Util.jsonFromNonEmptyString key)
    , Tuple.Tuple "value" (Argonaut.fromString value)
    ]

emulatorsToJsonValue :: Emulators -> Maybe.Maybe FunctionsSetting -> Argonaut.Json
emulatorsToJsonValue (Emulators emulators) functionsSetting =
  Util.tupleListToJson
    ( Array.concat
        [ case functionsSetting of
            Maybe.Just (FunctionsSetting setting) ->
              [ Tuple.Tuple "functions"
                  ( Argonaut.jsonSingletonObject "port"
                      ( Argonaut.fromNumber
                          (UInt.toNumber setting.emulatorsPortNumber)
                      )
                  )
              ]
            Maybe.Nothing -> []
        , case emulators.firestorePortNumber of
            Maybe.Just portNumber ->
              [ Tuple.Tuple "firestore"
                  ( Argonaut.jsonSingletonObject "port"
                      ( Argonaut.fromNumber
                          (UInt.toNumber portNumber)
                      )
                  )
              ]
            Maybe.Nothing -> []
        , case emulators.hostingPortNumber of
            Maybe.Just portNumber ->
              [ Tuple.Tuple "hosting"
                  ( Argonaut.jsonSingletonObject "port"
                      ( Argonaut.fromNumber
                          (UInt.toNumber portNumber)
                      )
                  )
              ]
            Maybe.Nothing -> []
        , case emulators.storagePortNumber of
            Maybe.Just portNumber ->
              [ Tuple.Tuple "storage"
                  ( Argonaut.jsonSingletonObject "port"
                      ( Argonaut.fromNumber
                          (UInt.toNumber portNumber)
                      )
                  )
              ]
            Maybe.Nothing -> []
        , [ Tuple.Tuple "ui"
              ( Argonaut.jsonSingletonObject "enabled"
                  Argonaut.jsonTrue
              )
          ]
        ]
    )
