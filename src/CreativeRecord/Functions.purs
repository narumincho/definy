module CreativeRecord.Functions where

import Prelude as Prelude
import Firebase.Functions as Functions

html :: Functions.HttpsFunction
html = Functions.onRequest (Prelude.pure "this is pen")
