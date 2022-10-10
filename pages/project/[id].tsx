import * as React from "react";
import { AccountCard } from "../../components/AccountCard";
import { Editor } from "../../components/Editor";
import { WithHeader } from "../../components/WithHeader";
import { trpc } from "../../client/hook/trpc";
import { useAccountToken } from "../../client/hook/useAccountToken";
import { useLanguage } from "../../client/hook/useLanguage";
import { useRouter } from "next/router";
import { zodType } from "../../deno-lib/npm";

const ProjectPage = (): React.ReactElement => {
  const { query } = useRouter();
  const language = useLanguage();
  const useAccountTokenResult = useAccountToken();
  const projectIdParseResult = zodType.ProjectId.safeParse(query.id);

  return (
    <WithHeader
      language={language}
      title={{
        japanese: "definy で作成されたプロジェクト",
        english: "Project created in definy",
        esperanto: "Projekto kreita en definy",
      }}
      location={
        projectIdParseResult.success
          ? {
              type: "project",
              id: projectIdParseResult.data,
            }
          : {
              type: "home",
            }
      }
      titleItemList={[]}
      useAccountTokenResult={useAccountTokenResult}
    >
      <div css={{ padding: 16 }}>
        <Editor
          fields={[
            {
              id: "projectId",
              name: "projectId",
              errorMessage: projectIdParseResult.success
                ? undefined
                : "invalid project id. 例: 344646621232889937",
              isTitle: false,
              readonly: true,
              body: {
                type: "text",
                value: projectIdParseResult.success
                  ? projectIdParseResult.data
                  : JSON.stringify(query.id),
              },
            },
          ]}
          onChange={() => {}}
        />

        {projectIdParseResult.success ? (
          <Content projectId={projectIdParseResult.data} language={language} />
        ) : (
          <div>プロジェクトIDが不正です</div>
        )}
      </div>
    </WithHeader>
  );
};

const Content = (props: {
  readonly projectId: zodType.ProjectId;
  readonly language: zodType.Language;
}): React.ReactElement => {
  const projectQueryResult = trpc.useQuery(["getProjectById", props.projectId]);

  switch (projectQueryResult.status) {
    case "error":
      return <div>エラーで取得できなかった</div>;
    case "idle":
      return <div>idle状態</div>;
    case "loading":
      return <div>loading...</div>;
    case "success": {
      if (projectQueryResult.data === undefined) {
        return <div>プロジェクトが存在しなかった</div>;
      }
      return (
        <div>
          <h1>{projectQueryResult.data.name}</h1>
          <div>
            プロジェクト作成者
            <AccountCard
              accountId={projectQueryResult.data.createdBy}
              language={props.language}
            />
          </div>
        </div>
      );
    }
  }
};

export default ProjectPage;
