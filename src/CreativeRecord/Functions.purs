module CreativeRecord.Functions where

import CreativeRecord.View as CreativeRecordView
import Data.Maybe as Maybe
import Data.String.NonEmpty as NonEmptyString
import FileType as FileType
import Firebase.Functions as Functions
import Html.ToString as HtmlToString
import Prelude as Prelude
import View.ToHtml as ViewToHtml

html :: Functions.HttpsFunction
html =
  Functions.onRequest
    ( Prelude.pure
        { body:
            ( HtmlToString.htmlOptionToString
                (ViewToHtml.viewToHtmlOption CreativeRecordView.view)
            )
        , mimeType:
            case FileType.toMimeType (Maybe.Just FileType.Html) of
              Maybe.Just mimeType -> NonEmptyString.toString mimeType
              Maybe.Nothing -> ""
        }
    )
