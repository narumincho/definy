import {
  clientScriptPath,
  distributionPath,
  portNumber,
  staticResourcePath,
} from "./distributionPath";
import { startDevelopmentServer } from "../gen/view/start";

startDevelopmentServer({
  buildScriptPath: "./narumincho-creative-record/build.ts",
  distributionPath,
  portNumber,
  resourceDirectoryPath: staticResourcePath,
  viewOutCodePath: "./narumincho-creative-record/viewOut.ts",
  clientScriptFileName: clientScriptPath.fileName,
});
