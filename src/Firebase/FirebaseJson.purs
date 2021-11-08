module Firebase.FirebaseJson
  ( FirebaseJson(..)
  , Rewrite(..)
  , Emulators(..)
  , toJson
  , FunctionsSetting(..)
  , SourceAndHeaders(..)
  , Header(..)
  ) where

import Data.Argonaut.Core as ArgonautCore
import Data.Array as Array
import Data.Maybe as Maybe
import Data.String.NonEmpty as NonEmptyString
import Data.Tuple as Tuple
import Data.UInt as UInt
import FileSystem.Path as Path
import FileSystem.FileType as FileType
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
  { source :: NonEmptyString.NonEmptyString
  , function :: NonEmptyString.NonEmptyString
  }

newtype SourceAndHeaders
  = SourceAndHeaders
  { source :: NonEmptyString.NonEmptyString
  , headers :: Array Header
  }

newtype Header
  = Header
  { key :: NonEmptyString.NonEmptyString
  , value :: String
  }

newtype Emulators
  = Emulators
  { firestorePortNumber :: Maybe.Maybe UInt.UInt
  , hostingPortNumber :: Maybe.Maybe UInt.UInt
  , storagePortNumber :: Maybe.Maybe UInt.UInt
  }

toJson :: FirebaseJson -> ArgonautCore.Json
toJson (FirebaseJson record) =
  Util.tupleListToJson
    ( Array.concat
        [ case record.functions of
            Maybe.Just (FunctionsSetting setting) ->
              [ Tuple.Tuple "functions"
                  ( ArgonautCore.jsonSingletonObject "source"
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
              ( ArgonautCore.jsonSingletonObject "rules"
                  ( Util.jsonFromNonEmptyString
                      ( Path.distributionFilePathToStringBaseApp
                          record.firestoreRulesFilePath
                          FileType.FirebaseSecurityRules
                      )
                  )
              )
          , Tuple.Tuple "storage"
              ( ArgonautCore.jsonSingletonObject "rules"
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
                      ( ArgonautCore.fromArray
                          (Prelude.map rewriteToJson record.hostingRewites)
                      )
                  , Tuple.Tuple "headers"
                      (ArgonautCore.fromArray (Prelude.map sourceAndHeadersToJson record.hostingHeaders))
                  , Tuple.Tuple "cleanUrls" ArgonautCore.jsonTrue
                  , Tuple.Tuple "trailingSlash" ArgonautCore.jsonFalse
                  ]
              )
          , Tuple.Tuple "emulators" (emulatorsToJsonValue record.emulators record.functions)
          ]
        ]
    )

rewriteToJson :: Rewrite -> ArgonautCore.Json
rewriteToJson (Rewrite { source, function }) =
  Util.tupleListToJson
    [ Tuple.Tuple "source" (Util.jsonFromNonEmptyString source)
    , Tuple.Tuple "function" (Util.jsonFromNonEmptyString function)
    ]

sourceAndHeadersToJson :: SourceAndHeaders -> ArgonautCore.Json
sourceAndHeadersToJson (SourceAndHeaders { source, headers }) =
  Util.tupleListToJson
    [ Tuple.Tuple "source" (Util.jsonFromNonEmptyString source)
    , Tuple.Tuple "headers" (ArgonautCore.fromArray (Prelude.map headerToJson headers))
    ]

headerToJson :: Header -> ArgonautCore.Json
headerToJson (Header { key, value }) =
  Util.tupleListToJson
    [ Tuple.Tuple "key" (Util.jsonFromNonEmptyString key)
    , Tuple.Tuple "value" (ArgonautCore.fromString value)
    ]

emulatorsToJsonValue :: Emulators -> Maybe.Maybe FunctionsSetting -> ArgonautCore.Json
emulatorsToJsonValue (Emulators emulators) functionsSetting =
  Util.tupleListToJson
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
