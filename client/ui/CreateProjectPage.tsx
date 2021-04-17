import * as React from "react";
import { Button } from "./Button";
import type { CreateProjectState } from "../hook/useDefinyApp";
import { css } from "@emotion/css";
import { stringToValidProjectName } from "../../core/main";
import { useOneLineTextEditor } from "./OneLineTextEditor";

export type Props = {
  onCreateProject: (projectName: string) => void;
  createProjectState: CreateProjectState;
};

export const CreateProjectPage: React.VFC<Props> = (props) => {
  if (props.createProjectState._ === "creating") {
    return <div>「{props.createProjectState.name}」を作成中</div>;
  }
  const { text, element } = useOneLineTextEditor({
    id: "project-name",
    initText: "",
    style: {
      width: "100%",
    },
  });
  const normalizedProjectName = stringToValidProjectName(text);

  return (
    <div>
      プロジェクト作成ページ!!
      <div>プロジェクト名</div>
      <div
        className={css({
          padding: 8,
        })}
      >
        {element()}
      </div>
      {normalizedProjectName === null ? (
        <div>プロジェクト名が不正です</div>
      ) : (
        <Button
          onClick={() => {
            props.onCreateProject(normalizedProjectName);
          }}
        >
          「{normalizedProjectName}」を作成する
        </Button>
      )}
    </div>
  );
};
