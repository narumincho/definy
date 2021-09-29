module CreativeRecordStart where

import Data.Maybe as Maybe
import Effect as Effect
import Effect.Console as Console
import Node.Encoding as Encoding
import Node.HTTP as Http
import Node.Stream as Stream
import Prelude as Prelude

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

    setBody :: Effect.Effect Prelude.Unit
    setBody =
      Prelude.bind
        ( Stream.writeString
            (Http.responseAsStream response)
            Encoding.UTF8
            "ok!"
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
      (\_ -> setBody)
