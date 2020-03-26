const fileSystem = require("fs");

fileSystem.copyFile(
  "./node_modules/definy-common/Data.elm",
  "./elm/source/Data.elm",
  () => {
    console.log("copy ok");
  }
);
