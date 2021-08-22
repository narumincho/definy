import { distributionPath, portNumber } from "./distributionPath";
import { startDevelopmentServer } from "../gen/view/start";
import { staticResourcePathObject } from "./resource/main";

startDevelopmentServer({
  buildScriptPath: "./narumincho-creative-record/build.ts",
  distributionPath,
  staticResourcePathObject,
  portNumber,
});
