import * as React from "react";
import * as d from "../localData";
import { Link } from "../components/Link";
import { WithHeader } from "../components/WithHeader";
import { useLanguage } from "../hooks/useLanguage";

export const ToolListPage = (): React.ReactElement => {
  const language = useLanguage();

  return (
    <WithHeader
      title="definyとは直接関係ないツールたち"
      location={{ type: "tools" }}
      language={language}
      logInState={d.LogInState.Guest}
      titleItemList={[]}
    >
      <h2 css={{ color: "white" }}>definyとは直接関係ないツール</h2>
      <div css={{ display: "grid", gap: 8, padding: 8 }}>
        <Link
          location={{ type: "tool", value: "themeColorRainbow" }}
          language={language}
          style={{ padding: 8 }}
        >
          テーマカラーレインボー
        </Link>
        <Link
          location={{ type: "tool", value: "soundQuiz" }}
          language={language}
          style={{ padding: 8 }}
        >
          音の周波数クイズ
        </Link>
      </div>
    </WithHeader>
  );
};

export default ToolListPage;
