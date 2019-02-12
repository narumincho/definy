# ナルミンチョがElmのformatを自動化するために作ったやつ。2018-10-19
function Format([System.IO.FileSystemInfo[]] $directory) {
	foreach ($e in $directory) {
		if ( $e.Attributes -eq [System.IO.FileAttributes]::Directory ) {
			Format (Get-ChildItem $e.FullName)
		}
		else {
			elm-format $e.FullName --yes
		}
	}
}

Format (Get-ChildItem ./src)