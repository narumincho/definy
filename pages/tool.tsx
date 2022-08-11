import * as React from "react";
import * as d from "../localData";
import { Header } from "../client/ui/Header";
import { Link } from "../client/ui/Link";
import { css } from "@emotion/css";
import { useDefinyApp } from "../client/hook/useDefinyApp";

export const ToolListPage = (): React.ReactElement => {
  const useDefinyAppResult = useDefinyApp();

  return (
    <div>
      <Header
        language={useDefinyAppResult.language}
        accountResource={useDefinyAppResult.accountResource}
        logInState={useDefinyAppResult.logInState}
        onLogInButtonClick={useDefinyAppResult.logIn}
        titleItemList={[]}
      />
      <h2>definyとは直接関係ないツール</h2>
      <div className={css({ display: "grid" })}>
        <Link
          locationAndLanguage={{
            location: d.Location.Tool(d.ToolName.ThemeColorRainbow),
            language: useDefinyAppResult.language,
          }}
          style={{ padding: 8 }}
        >
          テーマカラーレインボー
        </Link>
        <Link
          locationAndLanguage={{
            location: d.Location.Tool(d.ToolName.SoundQuiz),
            language: useDefinyAppResult.language,
          }}
          style={{ padding: 8 }}
        >
          音の周波数クイズ
        </Link>
      </div>
    </div>
  );
};

export default ToolListPage;
