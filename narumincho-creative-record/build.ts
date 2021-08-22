import { build } from "../gen/view/build";
import { distributionPath } from "./distributionPath";
import { naruminchoCreativeRecordView } from "./app";
import { staticResourcePathObject } from "./resource/main";

build({
  view: naruminchoCreativeRecordView,
  distributionPath,
  staticResourcePathObject,
  staticResourcePath: "./narumincho-creative-record/resource",
});
