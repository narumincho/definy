import * as React from "react";
import { OneLineTextEditor } from "../client/ui/OneLineTextEditor";
import { Text } from "../components/Text";
import { WithHeader } from "../components/WithHeader";
import { useAccountToken } from "../hooks/useAccountToken";
import { useLanguage } from "../hooks/useLanguage";

const CreateProject = (): React.ReactElement => {
  const language = useLanguage();
  const useAccountTokenResult = useAccountToken();
  const [projectName, setProjectName] = React.useState<string>("");

  return (
    <WithHeader
      title={{
        japanese: "プロジェクトを作成",
        english: "create project",
        esperanto: "krei projekton",
      }}
      useAccountTokenResult={useAccountTokenResult}
      titleItemList={[]}
      location={{ type: "create-project" }}
      language={language}
    >
      <div>
        <Text
          language={language}
          japanese="プロジェクトを作成"
          english="create project"
          esperanto="krei projekton"
        />
        <OneLineTextEditor
          value={projectName}
          onChange={(newName) => {
            setProjectName(newName);
          }}
          id="project-name"
        />
      </div>
    </WithHeader>
  );
};

export default CreateProject;
