module CreativeRecordStart where

import Data.Maybe as Maybe
import Effect as Effect
import Effect.Console as Console
import FileType as FileType
import Html.ToString as HtmlToSTring
import Node.Buffer as Buffer
import Node.ChildProcess as ChildProcess
import Node.Encoding as Encoding
import Node.FS.Sync as FileSystem
import Node.HTTP as Http
import Node.Stream as Stream
import Prelude as Prelude
import CreativeRecord as CreativeRecord

main :: Effect.Effect Prelude.Unit
main =
  runClientScriptBuildCommandAndLog
    ( Prelude.bind (FileSystem.readFile "./index.js")
        ( \buffer ->
            Prelude.bind (Buffer.toString Encoding.UTF8 buffer) ((\clientCode -> startServer clientCode))
        )
    )

runClientScriptBuildCommandAndLog :: Effect.Effect Prelude.Unit -> Effect.Effect Prelude.Unit
runClientScriptBuildCommandAndLog callback =
  Prelude.map (\_ -> Prelude.unit)
    ( ChildProcess.exec
        "spago bundle-app --main CreativeRecordClient"
        ChildProcess.defaultExecOptions
        ( \result ->
            Prelude.bind
              (execResultToString result)
              (\out -> (Prelude.bind (Console.log out) (\_ -> callback)))
        )
    )

execResultToString :: ChildProcess.ExecResult -> Effect.Effect String
execResultToString result =
  let
    stdoutEffect :: Effect.Effect String
    stdoutEffect = (Buffer.toString Encoding.UTF8 result.stdout)

    stderrEffect :: Effect.Effect String
    stderrEffect = (Buffer.toString Encoding.UTF8 result.stderr)
  in
    Prelude.bind stdoutEffect
      ( \stdout ->
          Prelude.map
            ( \stderr ->
                Prelude.append
                  "build-std"
                  (Prelude.show { stdout, stderr, error: result.error })
            )
            stderrEffect
      )

startServer :: String -> Effect.Effect Prelude.Unit
startServer clientScriptCode =
  Prelude.bind
    ( Http.createServer
        ( \request response ->
            service clientScriptCode request response
        )
    )
    ( \server ->
        Http.listen server
          { backlog: Maybe.Nothing, hostname: "localhost", port: 1234 }
          (Console.log "start! http://localhost:1234")
    )

service :: String -> Http.Request -> Http.Response -> Effect.Effect Prelude.Unit
service clientScriptCode request response =
  Prelude.bind
    (Console.log (Prelude.append "requestPath:" (Http.requestURL request)))
    ( \_ ->
        writeStringResponse response
          ( case Http.requestURL request of
              "/" -> htmlResponse
              "/program" ->
                ( StringResponse
                    { data: clientScriptCode
                    , fileType: FileType.JavaScript
                    }
                )
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
  NotFound -> Http.setStatusCode response 404

htmlResponse :: ResponseData
htmlResponse =
  StringResponse
    { data:
        ( HtmlToSTring.htmlOptionToString
            CreativeRecord.view
        )
    , fileType: FileType.Html
    }
