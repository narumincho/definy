import * as ui from "./ui";
import { Model } from "./model";
import React from "react";
import { UserId } from "definy-core/source/data";

export const User: React.FC<{ model: Model; userId: UserId }> = (prop) => {
  return (
    <div>
      <div>ここなユーザーの詳細ページです</div>
      <ui.User model={prop.model} userId={prop.userId} />
    </div>
  );
};
