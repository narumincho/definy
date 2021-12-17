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
        [ View.boxY
            { gap: 8.0 }
            [ View.text
                { markup: View.Heading2
                , padding: 8.0
                }
                "PowerShell で フォルダ内のファイルに対して 再帰的にコマンドを実行する"
            , View.text
                { padding: 8.0 }
                "以下のコードを拡張子.ps1で保存して ./ファイル名.ps1 で実行できる"
            , View.text
                { markup: View.Code
                , padding: 8.0
                }
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
            ]
        ]
    }
