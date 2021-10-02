module CreativeRecordStart where

import Color.Scheme.MaterialDesign as Color
import Data.Map as Map
import Data.Maybe as Maybe
import Effect as Effect
import Effect.Console as Console
import Html.Data as HtmlData
import Html.ToString as HtmlToSTring
import Language as Language
import Node.Encoding as Encoding
import Node.HTTP as Http
import Node.Stream as Stream
import Prelude as Prelude
import StructuredUrl as StructuredUrl

main :: Effect.Effect Prelude.Unit
main =
  Prelude.bind
    (Http.createServer service)
    ( \server ->
        Http.listen server
          { backlog: Maybe.Nothing, hostname: "localhost", port: 1234 }
          (Console.log "start! http://localhost:1234")
    )

service :: Http.Request -> Http.Response -> Effect.Effect Prelude.Unit
service _request response =
  let
    setStatusCode :: Effect.Effect Prelude.Unit
    setStatusCode = Http.setStatusCode response 200

    setHeader :: Effect.Effect Prelude.Unit
    setHeader = Http.setHeader response "content-type" "text/html"

    setBody :: Effect.Effect Prelude.Unit
    setBody =
      Prelude.bind
        ( Stream.writeString
            (Http.responseAsStream response)
            Encoding.UTF8
            ( HtmlToSTring.htmlOptionToString
                ( HtmlData.HtmlOption
                    { appName: "ナルミンチョの創作記録"
                    , bodyChildren: [ HtmlData.htmlElement "div" Map.empty (HtmlData.Text "ちゃんと表示されてるかな?? <ok>") ]
                    , bodyClass: Maybe.Nothing
                    , coverImagePath: StructuredUrl.pathAndSearchParams [] Map.empty
                    , description: "革新的なプログラミング言語のdefiny, Web技術, 作っているゲームなどについて解説しています"
                    , iconPath: StructuredUrl.pathAndSearchParams [ "icon" ] Map.empty
                    , language: Maybe.Just Language.Japanese
                    , origin: "localhost:1234"
                    , pageName: "ナルミンチョの創作記録"
                    , path: Maybe.Just (StructuredUrl.pathAndSearchParams [] Map.empty)
                    , scriptPath: Maybe.Nothing
                    , style: Maybe.Nothing
                    , stylePath: Maybe.Nothing
                    , themeColor: Color.red
                    , twitterCard: HtmlData.SummaryCardWithLargeImage
                    }
                )
            )
            (Console.log "writeStringOk")
        )
        ( \_ ->
            ( Stream.end
                (Http.responseAsStream response)
                (Console.log "writeEnd")
            )
        )
  in
    Prelude.bind
      setStatusCode
      ( \_ ->
          Prelude.bind
            setHeader
            (\_ -> setBody)
      )
