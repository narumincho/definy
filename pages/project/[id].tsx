import * as React from "react";
import { ProjectId } from "../../common/zodType";
import { WithHeader } from "../../components/WithHeader";
import { trpc } from "../../hooks/trpc";
import { useAccountToken } from "../../hooks/useAccountToken";
import { useLanguage } from "../../hooks/useLanguage";
import { useRouter } from "next/router";

const ProjectPage = (): React.ReactElement => {
  const { query } = useRouter();
  const language = useLanguage();
  const useAccountTokenResult = useAccountToken();
  const projectQuery = trpc.useQuery([
    "getProjectById",
    (query.id ?? "??") as ProjectId,
  ]);

  return (
    <WithHeader
      language={language}
      title={{
        japanese: "definy で作成されたプロジェクト",
        english: "Project created in definy",
        esperanto: "Projekto kreita en definy",
      }}
      location={{
        type: "project",
        id: typeof query.id === "string" ? (query.id as ProjectId) : null,
      }}
      titleItemList={[]}
      useAccountTokenResult={useAccountTokenResult}
    >
      <div>
        <div>{query.id}</div>
        <div>{JSON.stringify(projectQuery)}</div>
      </div>
    </WithHeader>
  );
};

export default ProjectPage;
