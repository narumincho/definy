/** @jsx jsx */

import * as React from "react";
import * as ui from "./ui";
import { Language, Location } from "definy-common/source/data";
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
            {JSON.stringify(project)}
          </div>
        ))}
      </div>
      {prop.model.logInState._ === "Guest" ? undefined : (
        <CreateProjectButton model={prop.model} />
      )}
    </div>
  );
};

const CreateProjectButton: React.FC<{ model: Model }> = (prop) => (
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
      {createProjectMessage(prop.model.language)}
    </ui.Link>
  </div>
);

const createProjectMessage = (language: Language): string => {
  switch (language) {
    case "English":
      return "Create a new project";
    case "Esperanto":
      return "Krei novan projekton";
    case "Japanese":
      return "プロジェクトを新規作成";
  }
};
