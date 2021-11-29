module CreativeRecord.Functions (html) where

import CreativeRecord.ClientProgramHashValue as ClientProgramHashValue
import CreativeRecord.Location as Location
import CreativeRecord.View as CreativeRecordView
import Data.Map as Map
import Data.String.NonEmpty as NonEmptyString
import Firebase.Functions as Functions
import Html.ToString as HtmlToString
import MediaType as MediaType
import Prelude as Prelude
import StructuredUrl as StructuredUrl
import Vdom.ToHtml as VdomToHtml
import View.ToVdom as ViewToVdom

html ∷ Functions.HttpsFunction
html =
  Functions.onRequest
    ( \pathAndSearchParams ->
        Prelude.pure
          { body:
              HtmlToString.toString
                ( VdomToHtml.toHtml
                    ( ViewToVdom.toVdom
                        ( StructuredUrl.pathAndSearchParams
                            [ ClientProgramHashValue.clientProgramHashValue ]
                            Map.empty
                        )
                        (CreativeRecordView.view (Location.fromPath pathAndSearchParams))
                    )
                )
          , mimeType: NonEmptyString.toString MediaType.htmlMimeType
          }
    )
