import * as fileSystem from "fs-extra";
import { html, view } from "../gen/main";
import { naruminchoCreativeRecordView } from "./app";

export const distributionPath = "./narumincho-creative-record/dist";
export const indexHtmlPath = `${distributionPath}/index.html`;

const build = async (): Promise<void> => {
  await fileSystem.remove(distributionPath);
  await fileSystem.outputFile(
    indexHtmlPath,
    html.htmlOptionToString(view.viewToHtmlOption(naruminchoCreativeRecordView))
  );
  console.log("index.html のビルドに成功!");
};

build();
