import * as React from "react";
import * as ui from "../ui";
import { Model } from "../model";
import styled from "styled-components";

const CommandIdv = styled.div({
  display: "grid",
  gap: 8,
});

export const Idea: React.FC<{ model: Model }> = () => {
  return (
    <div>
      <div>アイデアのコンポーネントだ</div>
      <CommandIdv>
        <ui.Button onClick={() => {}}>
          アイデアを実現できるコミットを作成する
        </ui.Button>
        <ui.Button onClick={() => {}}>子アイデアを作成する</ui.Button>
      </CommandIdv>
    </div>
  );
};
