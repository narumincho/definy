module CreativeRecord.Article.MessageWindow (view) where

import CreativeRecord.Article.Data as Data
import CreativeRecord.Element as Element
import CreativeRecord.StaticResource as StaticResource
import Data.String.NonEmpty as NonEmptyString
import Type.Proxy (Proxy(..))
import View.Helper as ViewHelper

view :: Data.Article
view =
  Data.Article
    { title: NonEmptyString.nes (Proxy :: _ "メッセージウィンドウの話")
    , imagePath: StaticResource.windowPng
    , children:
        [ ViewHelper.boxY
            {}
            [ ViewHelper.text {} "更新日時 2019/10/4"
            , ViewHelper.text {} "作成日 2015/9/20"
            , ViewHelper.text { markup: ViewHelper.Heading2 } "メッセージウィンドウとは"
            , Element.paragraphText "メッセージウィンドウは、登場人物やが言ったことや、ナレーションの言葉を表示し、プレイヤーに伝えるUIです。DESIRED Routeを作る上で、登場人物たちのセリフをプレイヤーに伝えるために必要でした。市販のゲームを見てどんなメッセージウィンドウを作れば良いか考えてみよう!"
            , ViewHelper.text { markup: ViewHelper.Heading2 } "市販のゲームの例"
            , ViewHelper.image
                { width: ViewHelper.Percentage 50.0
                , height: 5.0
                , path: StaticResource.window_ssqPng
                , alternativeText: "新世界樹の迷宮のメッセージウィンドウ"
                }
            , ViewHelper.text {} "新世界樹の迷宮はNintendo 3DSのRPG"
            , ViewHelper.text {} "青の半透明の背景に、水色の文字、20文字3行"
            , ViewHelper.text {} "文字はすべて同じ幅でなく、句読点「、」などで位置が調整される(プロポーショナルフォント?)"
            , ViewHelper.text {} "LかRボタンを押している間、ウィンドウの表示をOFF"
            , ViewHelper.text {} "ボタンで進める(長押しで、すべて文字を表示したら進める)"
            , ViewHelper.text {} "Yボタン長押しで、メッセージスキップ"
            , ViewHelper.text {} "話している人の名前の表示がない"
            , ViewHelper.text {} "またウィンドウ非表示中でもAボタンを押したら話を進めてしまうというバグもあった。(新世界樹の迷宮2で修正)"
            , ViewHelper.text {} "BRAVELY DEFAULT"
            , ViewHelper.image
                { width: ViewHelper.Percentage 50.0
                , height: 5.0
                , path: StaticResource.window_bdffPng
                , alternativeText: "BRAVELY DEFAULTのイベント画面"
                }
            , ViewHelper.text {} "黒の背景に、白の文字、25文字2行"
            , ViewHelper.text {} "すべて文字は同じ幅で、句読点「、」などで位置が調整されない(等幅フォント?)"
            , ViewHelper.text {} "Aボタンで進める(長押しでは、進めない)"
            , ViewHelper.text {} "Yボタンでボイス合わせて進めるオート"
            , ViewHelper.text {} "Xボタンでスキップ"
            , ViewHelper.text {} "常に名前表示あり"
            , ViewHelper.text {} "2行とすることで1つのページにセリフがたくさん表示されないようにしている。実際2行で十分なことが多い。"
            , ViewHelper.text {} "また、推理ゲームなどに多かったが、セリフのログが残されていて後で確認できるようになっているものも最近はある。"
            , ViewHelper.text { markup: ViewHelper.Heading2 } "DESIRED Routeでは"
            , ViewHelper.text {} "DESIRED ROUTEでは、現代的な快適さとシンプルさを合わせ持つように、"
            , ViewHelper.text {} "青の半透明の背景に、白の文字、20文字3行"
            , ViewHelper.text {} "文字はすべて同じ幅で、句読点「、」などで位置が調整されない"
            , ViewHelper.text {} "Aボタンで進める"
            , ViewHelper.text {} "Aボタン長押しで、メッセージスキップ"
            , ViewHelper.text {} "名前表示ありと、名前表示なしを変更できる"
            , ViewHelper.text {} "にしました。このRPGは下画面にメニューを常に表示しているので、上画面のウィンドウに使えるボタンはAボタンだけですが、Aボタン長押しでメッセージスキップもできるようにしています。"
            , ViewHelper.text {} "ページ内スキップ"
            , ViewHelper.text {} "他に、スキップ以外に快適さに必要なのは、ページ内スキップです。ページ内スキップとは、文字がぽつぽつ表示されている途中に、Aボタンを押すと、セリフの文字が一気に表示される機能です。忘れがちの処理ですが、有ると無いとでは、かなりと操作感が違います。紹介してきたRPG全てと、このDESIRED ROUTEはページ内スキップ機能はあります。PRGは文字で内容を伝えるゲームだと思うので、ウィンドウはこだわるべきです。"
            , ViewHelper.text { markup: ViewHelper.Heading2 } "文字の配色"
            , ViewHelper.text {} "開発初期のメッセージウィンドウの文字色は、10種類の中から選ぶことができましたが、色を多用していると何が重要かわからなくなってしまうのです。"
            , ViewHelper.image
                { width: ViewHelper.Percentage 50.0
                , height: 5.0
                , path: StaticResource.bad_color_message_windowPng
                , alternativeText: "10種類の文字色を使用したメッセージウィンドウの表示"
                }
            , ViewHelper.text {} "というわけで、文字色は、白とオレンジと水色の3種類に絞りました。"
            , ViewHelper.image
                { width: ViewHelper.Percentage 50.0
                , height: 5.0
                , path: StaticResource.simple_color_message_windowPng
                , alternativeText: "3色を使ったメッセージウィンドウの表示"
                }
            , ViewHelper.text {} "オレンジは重要な単語につけることとします"
            , ViewHelper.text {} "水色はシステムなどの説明に使うことにします"
            ]
        ]
    }
