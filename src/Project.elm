module Project exposing
    ( Project, ProjectRef(..), init, projectRefSetEmpty, ProjectRefSet
    , getName
    , getAuthor, getSource, mapSource)

{-| プロジェクト。アプリを構成するものすべて。
プログラムのソースやドキュメント、実行設定まで


# Project

@docs Project, ProjectRef, init, projectRefSetEmpty, ProjectRefSet


# Name

@docs getName


# Author

@docs getAuthor

-}

import Project.Config as Config
import Project.Document as Document
import Project.Label as Label
import Project.Source as Source
import Project.Source.ModuleWithCache
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


{-| プロジェクトの部分の参照
TODO 今後 Source (List Int)のようにしてモジュールの位置を持てるように
-}
type ProjectRef
    = ProjectRoot
    | Document
    | Config
    | Source
    | Module Source.ModuleRef

type alias ProjectRefSet =
    Set.Any.AnySet (List Int) ProjectRef


projectRefSetEmpty : ProjectRefSet
projectRefSetEmpty =
    Set.Any.empty projectRefToInt


projectRefToInt : ProjectRef -> List Int
projectRefToInt projectRef =
    case projectRef of
        ProjectRoot ->
            []

        Document ->
            [ 0 ]

        Config ->
            [ 1 ]

        Source ->
            [ 2 ]

        Module moduleRef ->
            [ 3 ] ++ moduleRefToInt moduleRef


moduleRefToInt : Source.ModuleRef -> List Int
moduleRefToInt moduleRef =
    case moduleRef of
        Source.Core ->
            [ 0 ]

        Source.CoreInt32 ->
            [ 1 ]

        Source.SampleModule ->
            [ 2 ]


{-| プロジェクトの初期値
-}
init : Project
init =
    Project
        { name = projectName
        , author = projectAuthor
        , document = Document.init
        , config = Config.init
        , source = Source.init
        }


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
getSource (Project {source}) =
    source

{-| プロジェクトのソース (モジュールがたくさん入ったもの)を設定する
-}
setSource : Source.Source -> Project -> Project
setSource source (Project rec) =
    Project
        { rec | source = source }

{-| プロジェクトのソース (モジュールがたくさん入ったもの)を加工する
-}
mapSource : (Source.Source->Source.Source) -> Project->Project
mapSource =
    Utility.Map.toMapper
        getSource
        setSource
