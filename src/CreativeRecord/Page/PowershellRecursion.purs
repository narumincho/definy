module CreativeRecord.Page.PowershellRecursion (view) where

import CreativeRecord.Article as Article
import Data.Maybe (Maybe(..))
import Data.String.NonEmpty as NonEmptyString
import Type.Proxy as Proxy
import View.Data as View

view :: Article.Article
view =
  Article.Article
    { title: Just (NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "PowerShell で フォルダ内のファイルに対して 再帰的にコマンドを実行する"))
    , children:
        [ View.box
            { direction: View.Y
            , gap: 8.0
            , paddingTopBottom: 0.0
            , paddingLeftRight: 0.0
            , height: Nothing
            , backgroundColor: Nothing
            , gridTemplateColumns1FrCount: Nothing
            , link: Nothing
            , hover: View.boxHoverStyleNone
            , children:
                [ View.text
                    { markup: View.Heading2
                    , padding: 8.0
                    , text: "PowerShell で フォルダ内のファイルに対して 再帰的にコマンドを実行する"
                    , click: Nothing
                    }
                , View.normalText
                    { padding: 8.0
                    , text: "以下のコードを拡張子.ps1で保存して ./ファイル名.ps1 で実行できる"
                    }
                , View.text
                    { markup: View.Code
                    , padding: 8.0
                    , click: Nothing
                    , text:
                        """function Recursion([System.IO.FileSystemInfo[]] $directory) {
    foreach ($e in $directory) {
        if ( $e.Attributes -eq [System.IO.FileAttributes]::Directory ) {
            Recursion (Get-ChildItem $e.FullName)
        }
        else {
            なにかのコマンド $e.FullName
        }
    }
}
Recursion (Get-ChildItem .)"""
                    }
                ]
            }
        ]
    }
