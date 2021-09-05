import * as React from "react";
import * as d from "../../localData";
import { CommonValue, listValue, oneLineTextValue } from "../editor/common";
import { listDeleteAt, listUpdateAt } from "../../common/util";
import { Button } from "./Button";
import { Editor } from "./Editor";
import { ListItem } from "../editor/list";

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
  readonly typePartList: ReadonlyArray<LocalTypePart>;
  readonly partList: ReadonlyArray<LocalPart>;
};

type LocalTypePart = {
  readonly id: d.TypePartId;
  readonly name: string;
};

type LocalPart = {
  readonly id: d.PartId;
  readonly name: string;
};

const LoadedLocalProjectPage = (): React.ReactElement => {
  const [state, setState] = React.useState<LocalProjectPageEditState>({
    partList: [],
    typePartList: [],
  });
  const setTypePartList = (
    typePartList: ReadonlyArray<LocalTypePart>
  ): void => {
    setState((beforeState) => ({ ...beforeState, typePartList }));
  };
  const setPartList = (partList: ReadonlyArray<LocalPart>): void => {
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
  typePartList: ReadonlyArray<LocalTypePart>,
  setTypePartList: (list: ReadonlyArray<LocalTypePart>) => void
): CommonValue => {
  return listValue({
    items: typePartList.map<ListItem>((typePart, index) => ({
      searchText: typePart.name,
      commonValue: oneLineTextValue({
        text: typePart.name,
        onChange: undefined,
      }),
    })),
    deleteAt: (index) => {
      setTypePartList(listDeleteAt(typePartList, index));
    },
    deleteAll: () => {
      setTypePartList([]);
    },
    addInLast: () => {
      setTypePartList([
        ...typePartList,
        { id: createRandomTypePartId(), name: "name" },
      ]);
    },
  });
};

const partListEditor = (
  partList: ReadonlyArray<LocalPart>,
  setPartList: (list: ReadonlyArray<LocalPart>) => void
): CommonValue => {
  return listValue({
    items: partList.map<ListItem>((part, index) => ({
      searchText: part.name,
      commonValue: oneLineTextValue({
        text: part.name,
        onChange: undefined,
      }),
    })),
    deleteAt: (index) => {
      setPartList(listDeleteAt(partList, index));
    },
    deleteAll: () => {
      setPartList([]);
    },
    addInLast: () => {
      setPartList([...partList, { id: createRandomPartId(), name: "name" }]);
    },
  });
};

const createRandomTypePartId = (): d.TypePartId => {
  return d.TypePartId.fromString(createRandomId());
};

const createRandomPartId = (): d.PartId => {
  return d.PartId.fromString(createRandomId());
};

const createRandomId = (): string => {
  const binary = crypto.getRandomValues(new Uint8Array(32));
  let result = "";
  for (const item of binary) {
    result += item.toString(16).padStart(2, "0");
  }
  return result;
};
