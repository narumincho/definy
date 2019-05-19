$Host.UI.RawUI.ForegroundColor = "Yellow";
Write-Output "Compile Client Code And Upload Firebase Server";
Set-Location -Path ./client/src;

Write-Output "Compile Elm ...";
$Host.UI.RawUI.ForegroundColor = "Gray";
elm make ./elm-src/Main.elm --output ../beforeMinifiy.js --optimize;
$Host.UI.RawUI.ForegroundColor = "Yellow";
Write-Output "Compile Elm OK";

Set-Location -Path ../;
$Host.UI.RawUI.ForegroundColor = "Yellow";
Write-Output "Minify JavaScript ...";
$Host.UI.RawUI.ForegroundColor = "Gray";
uglifyjs ./beforeMinifiy.js -o dist/main.js;
Remove-Item ./beforeMinifiy.js;
$Host.UI.RawUI.ForegroundColor = "Yellow";
Write-Output "Minify JavaScript OK";

Write-Output "Minify CSS ...";
$Host.UI.RawUI.ForegroundColor = "Gray";
cleancss ./src/style.css -o ./dist/style.css;
$Host.UI.RawUI.ForegroundColor = "Yellow";
Write-Output "Minify CSS OK"

Write-Output "Copy HTML ...";
$Host.UI.RawUI.ForegroundColor = "Gray";
Copy-Item -Path ./src/index.html -Destination ./dist/index.html
$Host.UI.RawUI.ForegroundColor = "Yellow";
Write-Output "Copy HTML OK";

Write-Output "Copy assets ...";
$Host.UI.RawUI.ForegroundColor = "Gray";
Copy-Item -Path ./src/assets/ -Destination ./dist/ -Recurse -Force
$Host.UI.RawUI.ForegroundColor = "Yellow";
Write-Output "Copy assets OK";

Write-Output "Upload to Firebase ...";
$Host.UI.RawUI.ForegroundColor = "Gray";
firebase deploy --project definy-lang --only hosting;
$Host.UI.RawUI.ForegroundColor = "Yellow";
Write-Output "Upload to Firebase OK";
Write-Output "Complete!";
