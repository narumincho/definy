import * as React from "react";
import { Text, langText } from "../components/Text";
import { Editor } from "../components/Editor";
import { WithHeader } from "../components/WithHeader";
import { trpc } from "../client/hook/trpc";
import { useAccountToken } from "../client/hook/useAccountToken";
import { useLanguage } from "../client/hook/useLanguage";
import { useRouter } from "next/router";
import { zodType } from "../deno-lib/npm";
import { zodTypeLocationAndLanguageToUrl } from "../common/url";

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

const projectNameFieldId = "project-name";

const CreateProjectLoggedIn = (props: {
  readonly language: zodType.Language;
  readonly accountToken: zodType.AccountToken;
}): React.ReactElement => {
  const [projectName, setProjectName] = React.useState<string>("");

  const route = useRouter();

  const createProjectMutation = trpc.useMutation("createProject", {
    onSuccess: (response) => {
      route.push(
        zodTypeLocationAndLanguageToUrl(
          { type: "project", id: response.id },
          props.language
        )
      );
    },
  });

  const parsedProjectName = zodType.ProjectName.safeParse(projectName);

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
        <Editor
          fields={[
            {
              id: projectNameFieldId,
              name: langText(
                {
                  japanese: "プロジェクト名",
                  english: "project name",
                  esperanto: "projektonomo",
                },
                props.language
              ),
              errorMessage: undefined,
              body: {
                type: "text",
                isTitle: true,
                readonly: false,
                value: projectName,
              },
            },
            {
              id: "create-project-button",
              name: langText(
                {
                  japanese: createProjectMutation.isLoading
                    ? `プロジェクト「${projectName}」を作成する`
                    : `プロジェクト「${projectName}」を作成中...`,
                  english: createProjectMutation.isLoading
                    ? `Create a project "${projectName}"`
                    : `Creating project "${projectName}"...`,
                  esperanto: createProjectMutation.isLoading
                    ? `Krei projekton "${projectName}"`
                    : `Kreante projekton "${projectName}"...`,
                },
                props.language
              ),
              errorMessage: parsedProjectName.success
                ? undefined
                : "invalid project name",
              body: {
                type: "button",
                value:
                  !parsedProjectName.success || createProjectMutation.isLoading
                    ? undefined
                    : () => {
                        if (parsedProjectName.success) {
                          createProjectMutation.mutate({
                            accountToken: props.accountToken,
                            projectName: parsedProjectName.data,
                          });
                        }
                      },
              },
            },
          ]}
          onChange={(fieldId, newValue) => {
            if (fieldId === projectNameFieldId) {
              setProjectName(newValue);
            }
          }}
        />
      </label>
    </div>
  );
};

export default CreateProject;
