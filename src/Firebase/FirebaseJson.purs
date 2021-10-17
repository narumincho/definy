module Firebase.FirebaseJson (FirebaseJson(..), Rewrite(..), Emulators(..), toString) where

import Data.Argonaut.Core as ArgonautCore
import Data.Array as Array
import Data.Maybe as Maybe
import Data.String.NonEmpty as NonEmptyString
import Data.Tuple as Tuple
import Data.UInt as UInt
import Foreign.Object as Object
import Prelude as Prelude

newtype FirebaseJson
  = FirebaseJson
  { functionsDistributionPath :: String
  , firestoreRulesFilePath :: NonEmptyString.NonEmptyString
  , cloudStorageRulesPath :: NonEmptyString.NonEmptyString
  , hostingDistributionPath :: String
  , hostingRewites :: Array Rewrite
  , emulators :: Emulators
  }

newtype Rewrite
  = Rewrite { source :: String, function :: String }

newtype Emulators
  = Emulators
  { functionsPortNumber :: Maybe.Maybe UInt.UInt
  , firestorePortNumber :: Maybe.Maybe UInt.UInt
  , hostingPortNumber :: Maybe.Maybe UInt.UInt
  , storagePortNumber :: Maybe.Maybe UInt.UInt
  }

toString :: FirebaseJson -> String
toString (FirebaseJson record) =
  ArgonautCore.stringify
    ( tupleListToJson
        ( [ Tuple.Tuple "functions"
              ( ArgonautCore.jsonSingletonObject "source"
                  (ArgonautCore.fromString record.functionsDistributionPath)
              )
          , Tuple.Tuple
              "firestore"
              ( ArgonautCore.jsonSingletonObject "rules"
                  (ArgonautCore.fromString (NonEmptyString.toString record.firestoreRulesFilePath))
              )
          , Tuple.Tuple "storage"
              ( ArgonautCore.jsonSingletonObject "rules"
                  (ArgonautCore.fromString (NonEmptyString.toString record.cloudStorageRulesPath))
              )
          , Tuple.Tuple "hosting"
              ( tupleListToJson
                  [ Tuple.Tuple "public" (ArgonautCore.fromString record.hostingDistributionPath)
                  , Tuple.Tuple "rewrites"
                      ( ArgonautCore.fromArray
                          (Prelude.map rewriteToJson record.hostingRewites)
                      )
                  , Tuple.Tuple "cleanUrls" ArgonautCore.jsonTrue
                  , Tuple.Tuple "trailingSlash" ArgonautCore.jsonFalse
                  ]
              )
          , Tuple.Tuple "emulators" (emulatorsToJsonValue record.emulators)
          ]
        )
    )

tupleListToJson :: Array (Tuple.Tuple String ArgonautCore.Json) -> ArgonautCore.Json
tupleListToJson list = ArgonautCore.fromObject (Object.fromFoldable list)

rewriteToJson :: Rewrite -> ArgonautCore.Json
rewriteToJson (Rewrite { source, function }) =
  tupleListToJson
    [ Tuple.Tuple "source" (ArgonautCore.fromString source)
    , Tuple.Tuple "function" (ArgonautCore.fromString function)
    ]

emulatorsToJsonValue :: Emulators -> ArgonautCore.Json
emulatorsToJsonValue (Emulators emulators) =
  tupleListToJson
    ( Array.concat
        [ case emulators.functionsPortNumber of
            Maybe.Just portNumber ->
              [ Tuple.Tuple "functions"
                  ( ArgonautCore.jsonSingletonObject "port"
                      ( ArgonautCore.fromNumber
                          (UInt.toNumber portNumber)
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
