module CreativeRecord.Article.CpsLabAdventCalendar2021 where

import CreativeRecord.Article.Data as Data
import CreativeRecord.Element as Element
import CreativeRecord.StaticResource as StaticResource
import Data.String.NonEmpty as NonEmptyString
import StructuredUrl as StructuredUrl
import Type.Proxy (Proxy(..))
import View.Helper as ViewHelper

view :: Data.Article
view =
  Data.Article
    { title: NonEmptyString.nes (Proxy :: _ "型システムと協力して世界を構築する")
    , imagePath: StaticResource.pure_script_code_genPng
    , children:
        [ ViewHelper.boxY
            { gap: 0.5 }
            [ Element.paragraph
                [ Element.spanNormalText "この記事は"
                , Element.inlineAnchorExternal
                    -- https://adventar.org/calendars/6489
                    ( StructuredUrl.StructuredUrl
                        { origin: NonEmptyString.nes (Proxy :: _ "https://adventar.org")
                        , pathAndSearchParams:
                            StructuredUrl.fromPath
                              [ NonEmptyString.nes (Proxy :: _ "calendars")
                              , NonEmptyString.nes (Proxy :: _ "6489")
                              ]
                        }
                    )
                    "TDU CPSLab Advent Calendar 2021 - Adventar"
                , Element.spanNormalText "の15日目の記事です"
                ]
            , Element.paragraph
                [ Element.inlineAnchorExternal
                    ( StructuredUrl.StructuredUrl
                        { origin: NonEmptyString.nes (Proxy :: _ "https://docs.google.com")
                        , pathAndSearchParams:
                            StructuredUrl.fromPath
                              [ NonEmptyString.nes (Proxy :: _ "presentation")
                              , NonEmptyString.nes (Proxy :: _ "d")
                              , NonEmptyString.nes (Proxy :: _ "1dVN0ElcSJP2Zasr3jF2nabfhJbQLyFzO3X1nU-Lu53o")
                              ]
                        }
                    )
                    "←前の記事"
                , Element.spanNormalText " | "
                , Element.inlineAnchorExternal
                    -- https://note.com/ryuto_matsumoto/n/ncbc76af04abc
                    ( StructuredUrl.StructuredUrl
                        { origin: NonEmptyString.nes (Proxy :: _ "https://note.com")
                        , pathAndSearchParams:
                            StructuredUrl.fromPath
                              [ NonEmptyString.nes (Proxy :: _ "ryuto_matsumoto")
                              , NonEmptyString.nes (Proxy :: _ "n")
                              , NonEmptyString.nes (Proxy :: _ "ncbc76af04abc")
                              ]
                        }
                    )
                    "次の記事→"
                ]
            , Element.paragraphText
                "ナルミンチョの創作記録と definy で使うNext.js みたいなシステムを作っている. コードは definy のリポジトリにある. PureScript で書いていて, The Elm Architecture のような 状態から見た目のデータへの純粋な関数 と 状態を更新する関数など から, Firebase 向けの, JavaScriptや設定ファイルを生成するものだ. SSR と CSR をしている. より型の強くシンプルなものを目指していて, definy から利用するときも同じような方法で作れるようにする. この記事もそのシステムで作られた. 現状 SSRしたものをCSRし直すというかなり無駄な動きが多いところや, UIの自由度が低いなど問題点は多いが, コンテンツを作りながら追加や修正をするスタイルにする."
            , Element.paragraphText
                "Web サーバーは, HTML をリクエストされたら HTMLを返すのだが, 最適化の都合上よく HTML ファイルとして サーバーにアップロードするためこのような形式をとっている. 拡張子の .htmlや.php (HTTP では意味を持たない)がよくウェブサイトのURLに含まれているのは, 現状のファイルシステム仕様の歴史的な仕様と根幹技術がうまく物事を抽象化できていなかったのが問題だとよく思う. 悪意のあるbotが 秘密情報を取ろうとして, .env というパスでHTTPリクエストしてくる状況からも言える."
            , Element.paragraphText
                "すでにある仕組みを変えるのは大変だが, すべてを綺麗サッパリ忘れて, 通信とはなにか, UI の配置にはどのようなものがあるか考えて, 直和と直積で構成される代数的データ型で表現してみる. そうすると, 今までの物事の捉え方には癖があって違う方法で扱えることに気づいたり, シンプルな仕組みで動かすことができたりする."
            , Element.paragraphText
                "3次元空間, UI, グラフィック, 音, 空間, 通信, 言語などを プログラミング言語で表現し実行結果を眺めると, どういう依存関係で, どう組み合わせれば つじつまが合うか がよく分かる. 純粋関数型言語の PureScript や definy の型のシステムの助けを得ながら世界を作っていく"
            , Element.paragraphText
                "面白いし 神に なった気分だ"
            , Element.paragraphText
                "definyの開発という研究は, 役に立つからやっているという面も大きいが, それ以上に自身の好奇心でやっていっている. 僕は, 自己満足で生きている."
            ]
        ]
    }
