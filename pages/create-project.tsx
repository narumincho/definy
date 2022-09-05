import * as React from "react";
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
      <div>
        <Text
          language={language}
          japanese="プロジェクトを作成"
          english="create project"
          esperanto="krei projekton"
        />
      </div>
    </WithHeader>
  );
};

export default CreateProject;
