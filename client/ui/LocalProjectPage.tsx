import * as React from "react";
import { CommonValue, listValue, oneLineTextValue } from "../editor/common";
import { Button } from "./Button";
import { Editor } from "./Editor";
import { listUpdateAt } from "../../common/util";

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

  if (isLoaded) {
    return <LoadedLocalProjectPage />;
  }

  return (
    <div>
      <div>
        <div>ファイルから始めるか, 空のプロジェクトから始めるか</div>
        <input type="file" ref={fileInputElement} onInput={onInputFile}></input>
        <Button onClick={onClickStartFromEmpty}>
          空のプロジェクトから始める
        </Button>
      </div>
    </div>
  );
};

type LocalProjectPageEditState = {
  readonly typePartList: ReadonlyArray<string>;
  readonly partList: ReadonlyArray<string>;
};

const LoadedLocalProjectPage = (): React.ReactElement => {
  const [state, setState] = React.useState<LocalProjectPageEditState>({
    partList: [],
    typePartList: [],
  });
  const setTypePartList = (typePartList: ReadonlyArray<string>): void => {
    setState((beforeState) => ({ ...beforeState, typePartList }));
  };
  const setPartList = (partList: ReadonlyArray<string>): void => {
    setState((beforeState) => ({ ...beforeState, partList }));
  };
  return (
    <Editor
      product={{
        headItem: {
          name: "タイトル",
          value: {
            onChange: undefined,
            text: "ファイルからのプロジェクト編集",
          },
        },
        items: [
          {
            name: "型パーツ",
            value: typePartListEditor(state.typePartList, setTypePartList),
          },
          {
            name: "パーツ",
            value: partListEditor(state.partList, setPartList),
          },
        ],
      }}
    />
  );
};

const typePartListEditor = (
  typePartList: ReadonlyArray<string>,
  setTypePartList: (list: ReadonlyArray<string>) => void
): CommonValue => {
  return listValue({
    items: typePartList.map((typePart, index) => ({
      searchText: typePart,
      commonValue: oneLineTextValue({
        text: typePart,
        onChange: (newText) => {
          setTypePartList(listUpdateAt(typePartList, index, () => newText));
        },
      }),
    })),
    deleteAll: () => {
      setTypePartList([]);
    },
    addInLast: () => {
      setTypePartList([...typePartList, "init"]);
    },
  });
};

const partListEditor = (
  partList: ReadonlyArray<string>,
  setPartList: (list: ReadonlyArray<string>) => void
): CommonValue => {
  return listValue({
    items: partList.map((part, index) => ({
      searchText: part,
      commonValue: oneLineTextValue({
        text: part,
        onChange: (newText) => {
          setPartList(listUpdateAt(partList, index, () => newText));
        },
      }),
    })),
    deleteAll: () => {
      setPartList([]);
    },
    addInLast: () => {
      setPartList([...partList, "init"]);
    },
  });
};
