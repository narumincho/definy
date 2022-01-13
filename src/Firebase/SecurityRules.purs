module Firebase.SecurityRules
  ( toNonEmptyString
  , SecurityRules
  , allForbiddenFirestoreRule
  , allForbiddenFirebaseStorageRule
  ) where

import Data.String.NonEmpty (NonEmptyString)
import Data.String.NonEmpty as NonEmptyString
import Type.Proxy (Proxy(..))

newtype SecurityRules
  = SecurityRules NonEmptyString

toNonEmptyString :: SecurityRules -> NonEmptyString
toNonEmptyString (SecurityRules value) = value

allForbiddenFirestoreRule :: SecurityRules
allForbiddenFirestoreRule =
  SecurityRules
    ( NonEmptyString.nes
        ( Proxy ::
            _
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
        ( Proxy ::
            _
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
