module TypeScriptEntryPointWithEffect
  ( writeLocalOutFile
  ) where

import Console as Console
import Effect.Aff as Aff
import Effect.Uncurried as Uncurried
import FileSystem.Name as Name
import FileSystem.Path as Path
import FileSystem.Write as Write
import Prelude as Prelude
import Type.Proxy (Proxy(..))

writeLocalOutFile ∷ Uncurried.EffectFn1 String Prelude.Unit
writeLocalOutFile =
  Uncurried.mkEffectFn1
    ( \code ->
        Aff.runAff_ (Console.logValue "writeLocalOutFile")
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
    )
