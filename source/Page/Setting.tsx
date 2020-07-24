import * as React from "react";
import { Model } from "../model";

export const Setting: React.FC<{ model: Model }> = () => {
  return (
    <div>
      <div>設定画面</div>
      <div>ユーザーページとログアウトなどができる</div>
    </div>
  );
};
