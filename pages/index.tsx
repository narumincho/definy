import * as React from "react";
import * as d from "../localData";
import { Link } from "../components/Link";
import { WithHeader } from "../components/WithHeader";
import { useLanguage } from "../hooks/useLanguage";

const IndexPage = (): React.ReactElement => {
  const language = useLanguage();

  return (
    <WithHeader
      title=""
      logInState={d.LogInState.Guest}
      titleItemList={[]}
      location={d.Location.Home}
      language={language}
    >
      <div>
        <div css={{ padding: 16 }}>
          <HomeLinkList language={language} />
        </div>
        definy 整備中...
      </div>
    </WithHeader>
  );
};

export default IndexPage;

const HomeLinkList = (props: {
  readonly language: d.Language;
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
        locationAndLanguage={{
          location: d.Location.About,
          language: props.language,
        }}
        style={{ padding: 4 }}
      >
        definyについて
      </Link>
      <Link
        locationAndLanguage={{
          location: d.Location.LocalProject,
          language: props.language,
        }}
        style={{ padding: 4 }}
      >
        ファイルから開く
      </Link>
      <Link
        locationAndLanguage={{
          location: d.Location.ToolList,
          language: props.language,
        }}
        style={{ padding: 4 }}
      >
        ツール
      </Link>
    </div>
  );
};
