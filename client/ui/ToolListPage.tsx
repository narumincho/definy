import * as React from "react";
import * as d from "../../localData";
import { Link } from "./Link";
import { UseDefinyAppResult } from "../hook/useDefinyApp";

export const ToolListPage = (props: {
  readonly onJump: UseDefinyAppResult["jump"];
  readonly language: UseDefinyAppResult["language"];
}): React.ReactElement => {
  return (
    <div>
      <h2>definyとは直接関係ないツール</h2>
      <div>
        <Link
          locationAndLanguage={{
            location: d.Location.Tool(d.ToolName.ThemeColorRainbow),
            language: props.language,
          }}
          onJump={props.onJump}
          style={{ padding: 8 }}
        >
          テーマカラーレインボー
        </Link>
        <Link
          locationAndLanguage={{
            location: d.Location.Tool(d.ToolName.SoundQuiz),
            language: props.language,
          }}
          onJump={props.onJump}
          style={{ padding: 8 }}
        >
          音の周波数クイズ
        </Link>
      </div>
    </div>
  );
};
