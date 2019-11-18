$Host.UI.RawUI.ForegroundColor = "Yellow";
Write-Output "Compile Client Code And Upload Firebase Server";

Remove-Item .\client\distribution -Recurse;
New-Item .\client\distribution -ItemType Directory;

Write-Output "Compile Elm And Minify ...";
$Host.UI.RawUI.ForegroundColor = "Gray";
# Elm → JavaScript
Set-Location .\client\source;
elm.exe make .\elm-source\Main.elm --output ..\..\beforeMinifiy.js --optimize;
# JavaScript Minify
Set-Location ..\..\;
.\server\source\node_modules\.bin\uglifyjs.ps1 .\beforeMinifiy.js --output .\client\distribution\main.js;
Remove-Item .\beforeMinifiy.js;
$Host.UI.RawUI.ForegroundColor = "Yellow";
Write-Output "Compile Elm And Minify OK";

Write-Output "Call Compile ...";
$Host.UI.RawUI.ForegroundColor = "Gray";
.\server\source\node_modules\.bin\tsc.ps1 --project .\client\source\call\tsconfig.json
$Host.UI.RawUI.ForegroundColor = "Yellow";
Write-Output "Call Compile OK";

Write-Output "ServiceWorker Compile ...";
$Host.UI.RawUI.ForegroundColor = "Gray";
.\server\source\node_modules\.bin\tsc.ps1 --project .\client\source\serviceworker\tsconfig.json;
$Host.UI.RawUI.ForegroundColor = "Yellow";
Write-Output "ServiceWorker Compile OK";

Write-Output "Copy robots.txt ...";
$Host.UI.RawUI.ForegroundColor = "Gray";
Copy-Item -Path .\client\source\robots.txt -Destination .\client\distribution\robots.txt;
$Host.UI.RawUI.ForegroundColor = "Yellow";
Write-Output "Copy robots.txt OK";

Write-Output "Copy assets ...";
$Host.UI.RawUI.ForegroundColor = "Gray";
Copy-Item -Path .\client\source\assets -Destination .\client\distribution -Recurse -Force;
$Host.UI.RawUI.ForegroundColor = "Yellow";
Write-Output "Copy assets OK";

Write-Output "Upload to Firebase ...";
$Host.UI.RawUI.ForegroundColor = "Gray";
firebase.ps1 deploy --project definy-lang --only hosting;
$Host.UI.RawUI.ForegroundColor = "Yellow";
Write-Output "Upload to Firebase OK";
Write-Output "Complete!";
