$Host.UI.RawUI.ForegroundColor = "Yellow";
Write-Output "Compile Hosting Files And Upload Firebase Server";

Write-Output "Delete Dist Folder";
Remove-Item .\dist -Recurse;

$Host.UI.RawUI.ForegroundColor = "Yellow";
Write-Output "Compile Elm And Minify ...";
$Host.UI.RawUI.ForegroundColor = "Gray";

.\node_modules\.bin\parcel.ps1 build .\hosting\index.html

Remove-Item .\dist\index.html;
Rename-Item .\dist\call.*.js \call.js

Write-Output "Upload to Firebase ...";
$Host.UI.RawUI.ForegroundColor = "Gray";
firebase.ps1 deploy --project definy-lang --only hosting;
$Host.UI.RawUI.ForegroundColor = "Yellow";
Write-Output "Upload to Firebase OK";
Write-Output "Complete!";
