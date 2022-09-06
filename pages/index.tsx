import * as React from "react";
import * as zodType from "../common/zodType";
import { Button } from "../client/ui/Button";
import { Link } from "../components/Link";
import { ProjectCard } from "../components/ProjectCard";
import { Text } from "../components/Text";
import { WithHeader } from "../components/WithHeader";
import { trpc } from "../hooks/trpc";
import { useAccountToken } from "../hooks/useAccountToken";
import { useLanguage } from "../hooks/useLanguage";
import { useMutation } from "react-query";

const IndexPage = (): React.ReactElement => {
  const language = useLanguage();
  const useAccountTokenResult = useAccountToken();
  const requestToDesktop = useMutation(
    async () => {
      const result = await fetch("http://[::1]:2520", {
        method: "POST",
        body: "bodyだよー",
      });
      return result;
    },
    {
      onSuccess: (data) => {
        console.log(data);
      },
    }
  );
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
      <div>
        <div css={{ padding: 16 }}>
          <HomeLinkList language={language} />
        </div>
        <Text
          language={language}
          japanese="ここにプロジェクト一覧とか表示する"
          english="Show project list here"
          esperanto="Montru projektoliston ĉi tie"
        />
        <Button
          onClick={() => {
            requestToDesktop.mutate();
          }}
        >
          デスクトップアプリと通信する
        </Button>
        {getAllProjectIds.data === undefined ? (
          <div>プロジェクト一覧を取得中...</div>
        ) : (
          <div>
            {getAllProjectIds.data.map((projectId) => (
              <ProjectCard projectId={projectId} />
            ))}
          </div>
        )}

        {useAccountTokenResult.accountToken !== undefined && (
          <Link language={language} location={{ type: "create-project" }}>
            プロジェクトを作成する
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
        location={{ type: "local-project" }}
        language={props.language}
        style={{ padding: 4 }}
      >
        ファイルから開く
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
    </div>
  );
};
