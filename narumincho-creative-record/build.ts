import * as app from "./app";
import { build } from "../gen/view/build";
import { distributionPath } from "./distributionPath";

build({
  app: app.naruminchoCreativeRecordApp,
  distributionPath,
  staticResourcePath: "./narumincho-creative-record/resource",
});
