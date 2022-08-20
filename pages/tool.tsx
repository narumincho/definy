import * as React from "react";
import * as d from "../localData";
import { Link } from "../components/Link";
import { WithHeader } from "../components/WithHeader";
import { useLanguage } from "../hooks/useLanguage";

export const ToolListPage = (): React.ReactElement => {
  const language = useLanguage();
  console.log("language in tool", language);

  return (
    <WithHeader
      title="definyとは直接関係ないツールたち"
      location={d.Location.ToolList}
      language={language}
      logInState={d.LogInState.Guest}
      titleItemList={[]}
    >
      <h2 css={{ color: "white" }}>definyとは直接関係ないツール</h2>
      <div css={{ display: "grid", gap: 8, padding: 8 }}>
        <Link
          locationAndLanguage={{
            location: d.Location.Tool(d.ToolName.ThemeColorRainbow),
            language,
          }}
          style={{ padding: 8 }}
        >
          テーマカラーレインボー
        </Link>
        <Link
          locationAndLanguage={{
            location: d.Location.Tool(d.ToolName.SoundQuiz),
            language,
          }}
          style={{ padding: 8 }}
        >
          音の周波数クイズ
        </Link>
      </div>
    </WithHeader>
  );
};

export default ToolListPage;
