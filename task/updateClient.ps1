Set-Location -Path ./hosting_root/src;
elm make ./elm-src/Main.elm --output ../beforeMinifiy.js --optimize;
Set-Location -Path ../;
uglifyjs ./beforeMinifiy.js -o dist/main.js;
Remove-Item ./beforeMinifiy.js;
cleancss ./src/style.css -o ./dist/style.css;
firebase deploy --project definy-lang --only hosting;