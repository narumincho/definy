import { build } from "../gen/view/build";
import { distributionPath } from "./distributionPath";
import { naruminchoCreativeRecordView } from "./app";

build({
  view: naruminchoCreativeRecordView,
  distributionPath,
  staticResourcePath: "./narumincho-creative-record/resource",
});
