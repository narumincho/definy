import * as React from "react";
import { AccountToken, Language } from "../common/zodType";
import { Button } from "../client/ui/Button";
import { OneLineTextEditor } from "../client/ui/OneLineTextEditor";
import { Text } from "../components/Text";
import { WithHeader } from "../components/WithHeader";
import { useAccountToken } from "../hooks/useAccountToken";
import { useLanguage } from "../hooks/useLanguage";

const CreateProject = (): React.ReactElement => {
  const language = useLanguage();
  const useAccountTokenResult = useAccountToken();

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
      {useAccountTokenResult.accountToken === null ||
      useAccountTokenResult.accountToken === undefined ? (
        <Text
          language={language}
          japanese="プロジェクトを作成するにはログインが必要です"
          english="You must be logged in to create a project"
          esperanto="Vi devas esti ensalutinta por krei projekton"
        />
      ) : (
        <CreateProjectLoggedIn
          language={language}
          accountToken={useAccountTokenResult.accountToken}
        />
      )}
    </WithHeader>
  );
};

const CreateProjectLoggedIn = (props: {
  readonly language: Language;
  readonly accountToken: AccountToken;
}): React.ReactElement => {
  const [projectName, setProjectName] = React.useState<string>("");

  return (
    <div css={{ padding: 16 }}>
      <h1>
        <Text
          language={props.language}
          japanese="プロジェクトを作成"
          english="create project"
          esperanto="krei projekton"
        />
      </h1>
      <label>
        <Text
          language={props.language}
          japanese="プロジェクト名"
          english="project name"
          esperanto="projektonomo"
        />
        <OneLineTextEditor
          value={projectName}
          onChange={(newName) => {
            setProjectName(newName);
          }}
          id="project-name"
        />
      </label>
      <Button onClick={projectName.trim().length === 0 ? undefined : () => {}}>
        <Text
          language={props.language}
          japanese={`プロジェクト「${projectName}」を作成する`}
          english={`Create a project "${projectName}"`}
          esperanto={`Krei projekton "${projectName}"`}
        />
      </Button>
    </div>
  );
};

export default CreateProject;
