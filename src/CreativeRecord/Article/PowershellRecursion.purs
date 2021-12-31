module CreativeRecord.Article.PowershellRecursion (view) where

import CreativeRecord.Article.Data as Data
import CreativeRecord.StaticResource as StaticResource
import Data.String.NonEmpty as NonEmptyString
import Type.Proxy as Proxy
import View.Data as View
import View.Helper as ViewHelper

view :: Data.Article
view =
  Data.Article
    { title: NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "PowerShell で フォルダ内のファイルに対して 再帰的にコマンドを実行する")
    , imagePath: StaticResource.powershell_iconPng
    , children:
        [ ViewHelper.boxY
            { gap: 0.5 }
            [ ViewHelper.text
                { padding: 0.5 }
                "以下のコードを拡張子.ps1で保存して ./ファイル名.ps1 で実行できる"
            , ViewHelper.text
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
