module CreativeRecord.Functions (html) where

import CreativeRecord.ClientProgramHashValue as ClientProgramHashValue
import CreativeRecord.Location as Location
import CreativeRecord.View as CreativeRecordView
import Data.Map as Map
import Data.Maybe (Maybe(..))
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
          ( let
              locationMaybe :: Maybe Location.Location
              locationMaybe = Location.fromPath pathAndSearchParams
            in
              Functions.Response
                { body:
                    HtmlToString.toString
                      ( VdomToHtml.toHtml
                          ( ViewToVdom.toVdom
                              ( Just
                                  ( StructuredUrl.pathAndSearchParams
                                      [ ClientProgramHashValue.clientProgramHashValue ]
                                      Map.empty
                                  )
                              )
                              (CreativeRecordView.view locationMaybe 0)
                          )
                      )
                , mediaTypeMaybe: Just MediaType.Html
                , status:
                    case locationMaybe of
                      Just _ -> Functions.Ok
                      Nothing -> Functions.NotFound
                }
          )
    )
