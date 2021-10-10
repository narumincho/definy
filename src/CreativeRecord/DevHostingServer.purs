module DevServer where

import CreativeRecord.View as CreativeRecordView
import Data.Maybe as Maybe
import Effect as Effect
import Effect.Console as Console
import FileType as FileType
import Html.ToString as HtmlToSTring
import Node.Encoding as Encoding
import Node.HTTP as Http
import Node.Stream as Stream
import Prelude as Prelude
import StructuredUrl as StructuredUrl
import View.ToHtml as ViewToHtml
import Data.Map as Map

-- | Firebase の Hosting emulator では配信するリソースを実行時に変更できないので,
-- | その変更できるサーバーを作る
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
  = StringResponse { data :: String, fileType :: FileType.FileType }
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
          ( FileType.toMimeType
              (Maybe.Just record.fileType)
          )

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
        HtmlToSTring.htmlOptionToString
          (ViewToHtml.viewToHtmlOption CreativeRecordView.view (StructuredUrl.pathAndSearchParams [ "program" ] Map.empty))
    , fileType: FileType.Html
    }
