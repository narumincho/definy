/** @jsx jsx */

import * as React from "react";
import * as ui from "./ui";
import { Location } from "definy-common/source/data";
import { Model } from "./model";
import { jsx } from "react-free-style";

export const Home: React.FC<{ model: Model }> = (prop) => {
  return (
    <div css={{ display: "grid", overflow: "hidden" }}>
      <div
        css={{
          gridColumn: "1 / 2",
          gridRow: "1 / 2",
          overflow: "hidden",
          overflowWrap: "break-word",
        }}
      >
        {[...prop.model.projectData].map(([id, project]) => (
          <div css={{ padding: 16 }} key={id}>
            {JSON.stringify(project)}{" "}
          </div>
        ))}
      </div>
      <div
        css={{
          gridColumn: "1 / 2",
          gridRow: "1 / 2",
          alignSelf: "end",
          justifySelf: "end",
          padding: 16,
        }}
      >
        <ui.Link
          areaTheme="Active"
          css={{
            padding: 8,
          }}
          onJump={prop.model.onJump}
          urlData={{ ...prop.model, location: Location.CreateProject }}
        >
          プロジェクトの作成
        </ui.Link>
      </div>
    </div>
  );
};
