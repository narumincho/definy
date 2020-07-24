import * as React from "react";
import { IdeaId } from "definy-core/source/data";
import { Model } from "../model";

export const Idea: React.FC<{ model: Model; ideaId: IdeaId }> = (prop) => {
  return (
    <div>
      <div>アイデアの詳細ページ</div>
      {prop.ideaId}
      <div>アイデアを実現できるコミットを作成する</div>
      <div>子アイデアを作成する</div>
    </div>
  );
};
