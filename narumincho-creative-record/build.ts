import * as app from "./app";
import * as fileSystem from "../gen/fileSystem/data";
import { distributionPath, staticResourcePath } from "./distributionPath";
import { build } from "../gen/view/build";

build({
  app: app.naruminchoCreativeRecordApp,
  distributionPath,
  staticResourcePath,
  appScriptPath: {
    directoryPath: fileSystem.directoryPathFrom(["narumincho-creative-record"]),
    fileName: {
      name: "app",
      fileType: "TypeScript",
    },
  },
});
