import { distributionPath, portNumber } from "./distributionPath";
import { startDevelopmentServer } from "../gen/view/start";

startDevelopmentServer({
  buildScriptPath: "./narumincho-creative-record/build.ts",
  distributionPath,
  portNumber,
  resourceDirectoryPath: "./narumincho-creative-record/resource",
  staticResourceUrlCodePath: "./narumincho-creative-record/resourceUrl.ts",
});
