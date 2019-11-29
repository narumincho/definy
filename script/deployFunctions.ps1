$Host.UI.RawUI.ForegroundColor = "Yellow";
Write-Output "Deploy to Firebase Functions";

Write-Output "Compile TypeScript ...";
$Host.UI.RawUI.ForegroundColor = "Gray";
./node_modules/.bin/tsc.ps1 --project ./functions/tsconfig.json;
$Host.UI.RawUI.ForegroundColor = "Yellow";
Write-Output "Compile TypeScript OK";
Set-Location -Path ../;

Write-Output "Copy package.json ...";
$Host.UI.RawUI.ForegroundColor = "Gray";
Copy-Item -Path ./source/package.json -Destination ./distribution/package.json -Recurse -Force
$Host.UI.RawUI.ForegroundColor = "Yellow";
Write-Output "Copy package.json OK";

Write-Output "Upload to Firebase ...";
$Host.UI.RawUI.ForegroundColor = "Gray";
firebase.ps1 deploy --project definy-lang --only functions;
$Host.UI.RawUI.ForegroundColor = "Yellow";
Write-Output "Upload to Firebase OK";
Write-Output "Complete!";