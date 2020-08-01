import * as React from "react";
import * as ui from "../ui";
import { Model } from "../model";

export const Idea: React.FC<{ model: Model }> = () => {
  return (
    <div>
      <div>アイデアのコンポーネントだ</div>
      <ui.Button onClick={() => {}}>
        アイデアを実現できるコミットを作成する
      </ui.Button>
      <ui.Button onClick={() => {}}>子アイデアを作成する</ui.Button>
    </div>
  );
};
