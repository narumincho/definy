import * as React from "react";
import { Language, ProjectId } from "../../common/zodType";
import { AccountCard } from "../../components/AccountCard";
import { WithHeader } from "../../components/WithHeader";
import { trpc } from "../../client/hook/trpc";
import { useAccountToken } from "../../client/hook/useAccountToken";
import { useLanguage } from "../../client/hook/useLanguage";
import { useRouter } from "next/router";

const ProjectPage = (): React.ReactElement => {
  const { query } = useRouter();
  const language = useLanguage();
  const useAccountTokenResult = useAccountToken();
  const projectIdParseResult = ProjectId.safeParse(query.id);

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
        <div>プロジェクト {query.id}</div>
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
  readonly projectId: ProjectId;
  readonly language: Language;
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
