module CreativeRecord.Functions where

import CreativeRecord.ClientProgramHashValue as ClientProgramHashValue
import CreativeRecord.View as CreativeRecordView
import Data.Map as Map
import Data.String.NonEmpty as NonEmptyString
import MediaType as MediaType
import Firebase.Functions as Functions
import Html.ToString as HtmlToString
import Prelude as Prelude
import StructuredUrl as StructuredUrl
import View.ToHtml as ViewToHtml

html :: Functions.HttpsFunction
html =
  Functions.onRequest
    ( Prelude.pure
        { body:
            HtmlToString.htmlOptionToString
              ( ViewToHtml.viewToHtmlOption
                  ( StructuredUrl.pathAndSearchParams
                      [ ClientProgramHashValue.clientProgramHashValue ]
                      Map.empty
                  )
                  CreativeRecordView.view
              )
        , mimeType: NonEmptyString.toString MediaType.htmlMimeType
        }
    )
