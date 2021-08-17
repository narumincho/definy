import * as React from "react";
import { Button } from "./Button";

export const LocalProjectPage = (): React.ReactElement => {
  const fileInputElement = React.useRef<HTMLInputElement>(null);
  const [isLoaded, setIsLoaded] = React.useState<boolean>(false);

  const onInputFile = () => {
    if (fileInputElement.current === null) {
      console.log("null のままだ!");
      return;
    }
    const file = fileInputElement.current.files?.item(0);
    if (file === null || file === undefined) {
      console.log("ファイルを読み取れなかった!");
      return;
    }
    console.log("ファイルを受け取れた!", file.name);
    setIsLoaded(true);
  };
  const onClickStartFromEmpty = () => {
    setIsLoaded(true);
  };

  return (
    <div>
      {isLoaded ? (
        <div>編集画面</div>
      ) : (
        <div>
          <div>ファイルから始めるか, 空のプロジェクトから始めるか</div>
          <input
            type="file"
            ref={fileInputElement}
            onInput={onInputFile}
          ></input>
          <Button onClick={onClickStartFromEmpty}>
            空のプロジェクトから始める
          </Button>
        </div>
      )}
    </div>
  );
};
