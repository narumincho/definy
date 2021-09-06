import * as React from "react";
import * as d from "../../localData";
import {
  CommonValue,
  buttonValue,
  listValue,
  oneLineTextValue,
} from "../editor/common";
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

type LocalLocation =
  | {
      readonly tag: "project";
    }
  | {
      readonly tag: "typePart";
      readonly typePartId: d.TypePartId;
    };

const LoadedLocalProjectPage = (): React.ReactElement => {
  const [state, setState] = React.useState<LocalProjectPageEditState>({
    partList: [],
    typePartList: [],
  });
  const [localLocation, setLocalLocation] = React.useState<LocalLocation>({
    tag: "project",
  });

  const setTypePartList = (
    typePartList: ReadonlyArray<LocalTypePart>
  ): void => {
    setState((beforeState) => ({ ...beforeState, typePartList }));
  };
  const setPartList = (partList: ReadonlyArray<LocalPart>): void => {
    setState((beforeState) => ({ ...beforeState, partList }));
  };
  if (localLocation.tag === "project") {
    return (
      <ProjectPage
        state={state}
        setTypePartList={setTypePartList}
        setPartList={setPartList}
        setLocalLocation={setLocalLocation}
      />
    );
  }
  return (
    <TypePartPage
      state={state}
      setTypePartList={setTypePartList}
      setPartList={setPartList}
      typePartId={localLocation.typePartId}
    />
  );
};

const ProjectPage = (props: {
  readonly state: LocalProjectPageEditState;
  readonly setTypePartList: (list: ReadonlyArray<LocalTypePart>) => void;
  readonly setPartList: (list: ReadonlyArray<LocalPart>) => void;
  readonly setLocalLocation: (l: LocalLocation) => void;
}): React.ReactElement => {
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
            value: typePartListEditor(
              props.state.typePartList,
              props.setTypePartList,
              props.setLocalLocation
            ),
          },
          {
            name: "パーツ",
            value: partListEditor(props.state.partList, props.setPartList),
          },
        ],
      }}
    />
  );
};

const TypePartPage = (props: {
  readonly state: LocalProjectPageEditState;
  readonly setTypePartList: (list: ReadonlyArray<LocalTypePart>) => void;
  readonly setPartList: (list: ReadonlyArray<LocalPart>) => void;
  readonly typePartId: d.TypePartId;
}): React.ReactElement => {
  const typePart = props.state.typePartList.find(
    (e) => e.id === props.typePartId
  );
  if (typePart === undefined) {
    return <div>存在しない型パーツ</div>;
  }

  return (
    <Editor
      product={{
        headItem: {
          name: "名前",
          value: {
            text: typePart.name,
            onChange: undefined,
          },
        },
        items: [
          {
            name: "id",
            value: oneLineTextValue({ text: typePart.id, onChange: undefined }),
          },
        ],
      }}
    />
  );
};

const typePartListEditor = (
  typePartList: ReadonlyArray<LocalTypePart>,
  setTypePartList: (list: ReadonlyArray<LocalTypePart>) => void,
  setLocalLocation: (l: LocalLocation) => void
): CommonValue => {
  return listValue({
    items: typePartList.map<ListItem>((typePart, index) => ({
      searchText: typePart.name,
      commonValue: buttonValue({
        text: typePart.name,
        onClick: () =>
          setLocalLocation({ tag: "typePart", typePartId: typePart.id }),
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
