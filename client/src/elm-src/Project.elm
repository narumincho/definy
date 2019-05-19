module Project exposing
    ( Emit(..)
    , Msg(..)
    , Project
    , getName
    , getSource
    , init
    , setSource
    , update
    )

{-| プロジェクト。アプリを構成するものすべて。
プログラムのソースやドキュメント、実行設定まで
-}

import Label
import Project.Document as Document
import Project.ModuleDefinition as Source


{-| プロジェクト
-}
type Project
    = Project
        { name : Label.Label
        , document : Document.Document
        , source : Source.ModuleDefinition
        }


type Msg
    = SourceMsg Source.Msg


type Emit
    = EmitSource Source.Emit


{-| プロジェクトの初期値
-}
init : Label.Label -> ( Project, List Emit )
init name =
    let
        ( source, sourceEmit ) =
            Source.init
    in
    ( Project
        { name = projectName
        , document = Document.init
        , source = source
        }
    , sourceEmit |> List.map EmitSource
    )


{-| プロジェクトを更新する
-}
update : Msg -> Project -> ( Project, List Emit )
update msg project =
    case msg of
        SourceMsg sourceMsg ->
            let
                ( newSource, emitList ) =
                    Source.update sourceMsg (getSource project)
            in
            ( project |> setSource newSource
            , emitList |> List.map EmitSource
            )


projectName : Label.Label
projectName =
    Label.make
        Label.hs
        [ Label.oa
        , Label.om
        , Label.op
        , Label.ol
        , Label.oe
        , Label.oP
        , Label.or
        , Label.oo
        , Label.oj
        , Label.oe
        , Label.oc
        , Label.ot
        ]


{-| プロジェクト名を取得
-}
getName : Project -> Label.Label
getName (Project { name }) =
    name


{-| プロジェクトのソース (モジュールがたくさん入ったもの)を取得する
-}
getSource : Project -> Source.ModuleDefinition
getSource (Project { source }) =
    source


{-| プロジェクトのソース (モジュールがたくさん入ったもの)を設定する
-}
setSource : Source.ModuleDefinition -> Project -> Project
setSource source (Project rec) =
    Project
        { rec | source = source }
