module Data.Project.CompileResult exposing
    ( CompileResult
    , getCompileResult
    , getRunResult
    )

import Compiler


{-| コンパイル結果と実行結果
-}
type CompileResult
    = CompileResult
        { compileResult : Maybe Compiler.CompileResult
        , runResult : Maybe Int
        }


empty : CompileResult
empty =
    CompileResult
        { compileResult = Nothing
        , runResult = Nothing
        }



{- =============================================
                 CompileAndRunResult
   =============================================
-}


getCompileResult : CompileResult -> Maybe Compiler.CompileResult
getCompileResult (CompileResult { compileResult }) =
    compileResult


getRunResult : CompileResult -> Maybe Int
getRunResult (CompileResult { runResult }) =
    runResult
