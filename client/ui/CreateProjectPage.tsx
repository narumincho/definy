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

export const CreateProjectPage: React.FC<Props> = (props) => {
  const { text, element } = useOneLineTextEditor({
    id: "project-name",
    initText: "",
    style: {
      width: "100%",
    },
  });
  const normalizedProjectName = stringToValidProjectName(text);
  const onCreateProject = props.onCreateProject;
  const onClickCreateButton = React.useCallback(() => {
    if (typeof normalizedProjectName === "string") {
      onCreateProject(normalizedProjectName);
    }
  }, [normalizedProjectName, onCreateProject]);

  if (props.createProjectState._ === "creating") {
    return <div>「{props.createProjectState.name}」を作成中</div>;
  }

  return (
    <div
      className={css({
        width: "100%",
        height: "100%",
        padding: 8,
      })}
    >
      <h2>プロジェクト作成ページ</h2>
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
        <Button onClick={onClickCreateButton}>
          「{normalizedProjectName}」を作成する
        </Button>
      )}
    </div>
  );
};
