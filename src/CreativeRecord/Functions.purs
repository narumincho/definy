module CreativeRecord.Functions (html) where

import CreativeRecord.ClientProgramHashValue as ClientProgramHashValue
import CreativeRecord.Location as Location
import CreativeRecord.State as State
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
              location :: Location.Location
              location = Location.fromPath pathAndSearchParams
            in
              Functions.Response
                { body:
                    HtmlToString.toString
                      ( VdomToHtml.toHtml
                          { vdom:
                              ViewToVdom.toVdom
                                { scriptPath:
                                    Just
                                      ( StructuredUrl.pathAndSearchParams
                                          [ ClientProgramHashValue.clientProgramHashValue ]
                                          Map.empty
                                      )
                                , view: CreativeRecordView.view (State.initState location)
                                }
                          , locationToPathAndSearchParams: Location.toPath
                          }
                      )
                , mediaTypeMaybe: Just MediaType.Html
                , status:
                    case location of
                      Location.Article (Location.NotFound _) -> Functions.NotFound
                      _ -> Functions.Ok
                }
          )
    )
