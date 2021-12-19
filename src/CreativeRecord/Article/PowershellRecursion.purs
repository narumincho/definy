module CreativeRecord.Article.PowershellRecursion (view) where

import CreativeRecord.Article.Data as Data
import Data.String.NonEmpty as NonEmptyString
import Type.Proxy as Proxy
import View.Data as View

view :: Data.Article
view =
  Data.Article
    { title: NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "PowerShell で フォルダ内のファイルに対して 再帰的にコマンドを実行する")
    , children:
        [ View.boxY
            { gap: 0.5 }
            [ View.text
                { markup: View.Heading2
                , padding: 0.5
                }
                "PowerShell で フォルダ内のファイルに対して 再帰的にコマンドを実行する"
            , View.text
                { padding: 0.5 }
                "以下のコードを拡張子.ps1で保存して ./ファイル名.ps1 で実行できる"
            , View.text
                { markup: View.Code
                , padding: 0.5
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
