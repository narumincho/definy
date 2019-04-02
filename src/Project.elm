module Project exposing
    ( Emit(..)
    , Msg(..)
    , Project
    , ProjectRef(..)
    , getAuthor
    , getName
    , getSource
    , init
    , mapSource
    , setSource
    , update
    )

{-| プロジェクト。アプリを構成するものすべて。
プログラムのソースやドキュメント、実行設定まで
-}

import Project.Config as Config
import Project.Document as Document
import Project.Label as Label
import Project.SocrceIndex as SourceIndex
import Project.Source as Source
import Set.Any
import Utility.Map


{-| プロジェクト
-}
type Project
    = Project
        { name : Label.Label
        , author : Label.Label
        , document : Document.Document
        , config : Config.Config
        , source : Source.Source
        }


type Msg
    = SourceMsg Source.Msg


{-| プロジェクトの部分の参照
-}
type ProjectRef
    = ProjectRoot
    | Document
    | Config
    | Source
    | Module SourceIndex.ModuleIndex


type alias ProjectRefSet =
    Set.Any.AnySet (List Int) ProjectRef


type Emit
    = EmitSource Source.Emit


{-| プロジェクトの初期値
-}
init : ( Project, List Emit )
init =
    let
        ( source, sourceEmit ) =
            Source.init
    in
    ( Project
        { name = projectName
        , author = projectAuthor
        , document = Document.init
        , config = Config.init
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


projectAuthor : Label.Label
projectAuthor =
    Label.make Label.hu [ Label.os, Label.oe, Label.or ]


{-| プロジェクト名を取得
-}
getName : Project -> Label.Label
getName (Project { name }) =
    name


{-| プロジェクトを作った人の名前を取得
-}
getAuthor : Project -> Label.Label
getAuthor (Project { author }) =
    author


{-| プロジェクトのソース (モジュールがたくさん入ったもの)を取得する
-}
getSource : Project -> Source.Source
getSource (Project { source }) =
    source


{-| プロジェクトのソース (モジュールがたくさん入ったもの)を設定する
-}
setSource : Source.Source -> Project -> Project
setSource source (Project rec) =
    Project
        { rec | source = source }


{-| プロジェクトのソース (モジュールがたくさん入ったもの)を加工する
-}
mapSource : (Source.Source -> Source.Source) -> Project -> Project
mapSource =
    Utility.Map.toMapper
        getSource
        setSource
