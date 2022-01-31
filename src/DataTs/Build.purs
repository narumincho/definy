module DataTs.Build
  ( main
  ) where

import Prelude
import Effect (Effect)
import Console as Console
import Effect.Aff as Aff
import FileSystem.Name as Name
import FileSystem.Path as Path
import FileSystem.Write as Write
import Type.Proxy (Proxy(..))

main :: Effect Unit
main = do
  code <-
    generateDataTsTypeScriptCode
  Aff.runAff_
    (Console.logValue "writeLocalOutFile")
    ( Aff.attempt
        ( Write.writeTypeScriptFile
            ( Path.FilePath
                { directoryPath: Path.DirectoryPath []
                , fileName: Name.fromSymbolProxy (Proxy :: _ "localData_out")
                }
            )
            code
        )
    )

foreign import generateDataTsTypeScriptCode :: Effect String
