import * as React from "react";
import * as core from "definy-core";
import * as ui from "./ui";
import { Location } from "definy-core/source/data";
import { Model } from "./model";
import styled from "styled-components";

const CreateProjectDiv = styled.div({
  padding: 16,
  display: "grid",
  alignContent: "center",
  justifyContent: "center",
});

export const CreateProject: React.FC<{ model: Model }> = (prop) => {
  const [projectName, setProjectName] = React.useState<string>("");

  React.useEffect(() => {
    if (prop.model.createProjectState._ === "Created") {
      prop.model.onJump({
        ...prop.model,
        location: Location.Project(prop.model.createProjectState.projectId),
      });
    }
  });

  if (prop.model.logInState._ !== "LoggedIn") {
    return (
      <CreateProjectDiv>
        <div>プロジェクトの作成にはログインする必要があります</div>
        <div>左のログインボタンを押してログインしてください</div>
      </CreateProjectDiv>
    );
  }

  switch (prop.model.createProjectState._) {
    case "WaitCreating":
    case "Creating":
      return <div>{prop.model.createProjectState.projectName}を作成中</div>;
  }

  const validProjectName = core.stringToValidProjectName(projectName);

  return (
    <CreateProjectDiv>
      <div>
        ここはプロジェクト作成ページ.
        プロジェクト名と画像を指定してプロジェクトを作ることができます
      </div>
      <label>プロジェクト名{}</label>
      <div>
        {validProjectName === null
          ? "プロジェクト名に使えません"
          : validProjectName}
      </div>
      <ProjectNameInput
        projectName={projectName}
        setProjectName={setProjectName}
      />
      <CreateProjectButton
        disabled={validProjectName === null}
        onClick={() => {
          if (validProjectName !== null) {
            prop.model.createProject(validProjectName);
          }
        }}
      >
        プロジェクトを作成
      </CreateProjectButton>
    </CreateProjectDiv>
  );
};

const CreateProjectButton = styled(ui.Button)({
  padding: 8,
});

const StyledProjectNameInput = styled.input({
  padding: 8,
  fontSize: 16,
  ":hocus": { border: "2px solid red" },
});

const ProjectNameInput: React.FC<{
  projectName: string;
  setProjectName: (projectName: string) => void;
}> = (prop) => {
  return (
    <StyledProjectNameInput
      id="projectName"
      key="projectName"
      onChange={(event) => {
        prop.setProjectName(event.target.value);
      }}
      type="text"
      value={prop.projectName}
    />
  );
};
