import * as ui from "./ui";
import { data } from "definy-common";
import { ProjectData } from "./resource";

export const home = (projectMap: ProjectData): ui.Panel =>
  ui.column(
    { width: { _: "Stretch" }, height: { _: "Stretch" }, key: "main" },
    [...projectMap].map(([id, project]) =>
      ui.text(
        { key: id, width: { _: "Stretch" }, height: { _: "Auto" } },
        JSON.stringify(project)
      )
    )
  );
