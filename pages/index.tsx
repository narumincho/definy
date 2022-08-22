import * as React from "react";
import * as d from "../localData";
import * as zodType from "../common/zodType";
import { Link } from "../components/Link";
import { Text } from "../components/Text";
import { WithHeader } from "../components/WithHeader";
import { useLanguage } from "../hooks/useLanguage";

const IndexPage = (): React.ReactElement => {
  const language = useLanguage();

  return (
    <WithHeader
      title={{
        japanese: "",
        english: "",
        esperanto: "",
      }}
      logInState={d.LogInState.Guest}
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
        definyについて
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
        ツール
      </Link>
    </div>
  );
};
