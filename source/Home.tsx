/** @jsx jsx */

import * as React from "react";
import { ProjectData } from "./resource";
import { jsx } from "react-free-style";

export const Home: React.FC<{ projectData: ProjectData }> = (prop) => (
  <div css={{ overflow: "hidden", overflowWrap: "break-word" }}>
    {[...prop.projectData].map(([id, project]) => (
      <div css={{ padding: 16 }} key={id}>
        {JSON.stringify(project)}{" "}
      </div>
    ))}
  </div>
);
