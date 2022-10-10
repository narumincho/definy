import * as React from "react";
import { Link } from "../components/Link";
import { ProjectCard } from "../components/ProjectCard";
import { Text } from "../components/Text";
import { WithHeader } from "../components/WithHeader";
import { trpc } from "../client/hook/trpc";
import { useAccountToken } from "../client/hook/useAccountToken";
import { useLanguage } from "../client/hook/useLanguage";
import { zodType } from "../deno-lib/npm";

const IndexPage = (): React.ReactElement => {
  const language = useLanguage();
  const useAccountTokenResult = useAccountToken();

  const getAllProjectIds = trpc.useQuery(["getAllProjectIds"]);

  return (
    <WithHeader
      title={{
        japanese: "",
        english: "",
        esperanto: "",
      }}
      useAccountTokenResult={useAccountTokenResult}
      titleItemList={[]}
      location={{ type: "home" }}
      language={language}
    >
      <div css={{ padding: 16 }}>
        <div css={{ padding: 16 }}>
          <HomeLinkList language={language} />
        </div>
        <Text
          language={language}
          japanese="ここにプロジェクト一覧とか表示する"
          english="Show project list here"
          esperanto="Montru projektoliston ĉi tie"
        />

        {getAllProjectIds.data === undefined ? (
          <div>プロジェクト一覧を取得中...</div>
        ) : (
          <div>
            {getAllProjectIds.data.map((projectId) => (
              <ProjectCard
                key={projectId}
                projectId={projectId}
                language={language}
              />
            ))}
          </div>
        )}

        {useAccountTokenResult.accountToken !== undefined && (
          <Link
            language={language}
            location={{ type: "create-project" }}
            style={{ padding: 8 }}
          >
            <Text
              language={language}
              japanese="+ プロジェクトを作成する"
              english="+ Create a project"
              esperanto="+ Kreu projekton"
            />
          </Link>
        )}
      </div>
    </WithHeader>
  );
};

export default IndexPage;

const HomeLinkList = (props: {
  readonly language: zodType.Language;
}): React.ReactElement => {
  return (
    <div
      css={{
        display: "grid",
        gridAutoFlow: "column",
        justifyContent: "end",
        alignItems: "center",
        height: 32,
        gap: 8,
      }}
    >
      <Link
        location={{ type: "about" }}
        language={props.language}
        style={{ padding: 4 }}
      >
        <Text
          language={props.language}
          japanese="definyについて"
          english="about definy"
          esperanto="pri definy"
        />
      </Link>
      <Link
        location={{ type: "editor" }}
        language={props.language}
        style={{ padding: 4 }}
      >
        <Text
          language={props.language}
          japanese="汎用エディタテスト"
          english="Generic editor test"
          esperanto="Ĝenerala redaktisto-testo"
        />
      </Link>
      <Link
        location={{ type: "local-project" }}
        language={props.language}
        style={{ padding: 4 }}
      >
        <Text
          language={props.language}
          japanese="ローカルファイルから開く"
          english="Open from local file"
          esperanto="Malfermu el loka dosiero"
        />
      </Link>
      <Link
        location={{ type: "tools" }}
        language={props.language}
        style={{ padding: 4 }}
      >
        <Text
          language={props.language}
          japanese="ツール"
          english="Tools"
          esperanto="Iloj"
        />
      </Link>
      <Link
        location={{ type: "dev" }}
        language={props.language}
        style={{ padding: 4 }}
      >
        <Text
          language={props.language}
          japanese="開発用ページ"
          english="development page"
          esperanto="disvolva paĝo"
        />
      </Link>
    </div>
  );
};
