module Firebase.SecurityRules
  ( toNonEmptyString
  , SecurityRules
  , allForbiddenFirestoreRule
  , allForbiddenFirebaseStorageRule
  ) where

import Data.String.NonEmpty as NonEmptyString
import Type.Proxy as Proxy

newtype SecurityRules
  = SecurityRules NonEmptyString.NonEmptyString

toNonEmptyString :: SecurityRules -> NonEmptyString.NonEmptyString
toNonEmptyString (SecurityRules value) = value

allForbiddenFirestoreRule :: SecurityRules
allForbiddenFirestoreRule =
  SecurityRules
    ( NonEmptyString.nes
        ( Proxy.Proxy ::
            Proxy.Proxy
              """rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
"""
        )
    )

allForbiddenFirebaseStorageRule :: SecurityRules
allForbiddenFirebaseStorageRule =
  SecurityRules
    ( NonEmptyString.nes
        ( Proxy.Proxy ::
            Proxy.Proxy
              """rules_version = '2';

service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read, write: if false;
    }
  }
}
"""
        )
    )
