module DevServer where

import CreativeRecord.View as CreativeRecordView
import Data.Map as Map
import Data.Maybe as Maybe
import Data.String.NonEmpty as NonEmptyString
import Effect as Effect
import Effect.Console as Console
import Html.ToString as HtmlToString
import MediaType as MediaType
import Node.Encoding as Encoding
import Node.HTTP as Http
import Node.Stream as Stream
import Prelude as Prelude
import StructuredUrl as StructuredUrl
import Type.Proxy as Proxy
import Vdom.ToHtml as VdomToHtml
import View.ToVdom as ViewToVdom

-- | Firebase の Hosting emulator では配信するリソースを実行時に変更できないので,
-- | その変更できるサーバーを作る
-- | 現在 未使用 !
startServer :: String -> Effect.Effect Prelude.Unit
startServer _firebaseJsonPath =
  Prelude.bind
    ( Http.createServer
        ( \request response ->
            service request response
        )
    )
    ( \server ->
        Http.listen server
          { backlog: Maybe.Nothing, hostname: "localhost", port: 1234 }
          (Console.log "start! http://localhost:1234")
    )

service :: Http.Request -> Http.Response -> Effect.Effect Prelude.Unit
service request response =
  Prelude.bind
    (Console.log (Prelude.append "requestPath:" (Http.requestURL request)))
    ( \_ ->
        writeStringResponse response
          ( case Http.requestURL request of
              "/" -> htmlResponse
              _ -> NotFound
          )
    )

data ResponseData
  = StringResponse { data :: String, mimeType :: NonEmptyString.NonEmptyString }
  | NotFound

writeStringResponse :: Http.Response -> ResponseData -> Effect.Effect Prelude.Unit
writeStringResponse response = case _ of
  StringResponse record ->
    let
      setStatusCode :: Effect.Effect Prelude.Unit
      setStatusCode = Http.setStatusCode response 200

      setHeader :: Effect.Effect Prelude.Unit
      setHeader =
        Http.setHeader response "content-type"
          (NonEmptyString.toString record.mimeType)

      setBody :: Effect.Effect Prelude.Unit
      setBody =
        Prelude.bind
          ( Stream.writeString
              (Http.responseAsStream response)
              Encoding.UTF8
              record.data
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
  NotFound ->
    Prelude.bind (Http.setStatusCode response 404)
      ( \_ ->
          ( Stream.end
              (Http.responseAsStream response)
              (Console.log "writeEnd")
          )
      )

htmlResponse :: ResponseData
htmlResponse =
  StringResponse
    { data:
        HtmlToString.toString
          ( VdomToHtml.toHtml
              ( ViewToVdom.toVdom
                  ( StructuredUrl.pathAndSearchParams
                      [ NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "program") ]
                      Map.empty
                  )
                  CreativeRecordView.view
              )
          )
    , mimeType: MediaType.htmlMimeType
    }
