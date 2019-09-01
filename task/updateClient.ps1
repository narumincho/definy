$Host.UI.RawUI.ForegroundColor = "Yellow";
Write-Output "Compile Client Code And Upload Firebase Server";
Set-Location -Path ./client/src;

Write-Output "Compile Elm ...";
$Host.UI.RawUI.ForegroundColor = "Gray";
elm make ./elm-src/Main.elm --output ../beforeMinifiy.js --optimize;
$Host.UI.RawUI.ForegroundColor = "Yellow";
Write-Output "Compile Elm OK";

Write-Output "Call Compile ...";
$Host.UI.RawUI.ForegroundColor = "Gray";
tsc;
$Host.UI.RawUI.ForegroundColor = "Yellow";
Write-Output "Call Compile OK";

Set-Location -Path ../;
$Host.UI.RawUI.ForegroundColor = "Yellow";
Write-Output "Minify JavaScript ...";
$Host.UI.RawUI.ForegroundColor = "Gray";
uglifyjs ./beforeMinifiy.js -o dist/main.js;
Remove-Item ./beforeMinifiy.js;
$Host.UI.RawUI.ForegroundColor = "Yellow";
Write-Output "Minify JavaScript OK";

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
