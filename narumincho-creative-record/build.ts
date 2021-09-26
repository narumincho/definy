import * as app from "./app";
import { distributionPath, staticResourcePath } from "./distributionPath";
import { build } from "../gen/view/build";

build({
  app: app.naruminchoCreativeRecordApp,
  distributionPath,
  staticResourcePath,
});
