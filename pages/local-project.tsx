import * as React from "react";
import * as d from "../localData";
import {
  CommonValue,
  buttonValue,
  listValue,
  oneLineTextValue,
} from "../client/editor/common";
import { Button } from "../client/ui/Button";
import { Editor } from "../client/ui/Editor";
import { ListItem } from "../client/editor/list";
import { Text } from "../components/Text";
import { WithHeader } from "../components/WithHeader";
import { useAccountToken } from "../client/hook/useAccountToken";
import { useLanguage } from "../client/hook/useLanguage";
import { util } from "../deno-lib/npm";

export const LocalProjectPage = (): React.ReactElement => {
  const language = useLanguage();
  const useAccountTokenResult = useAccountToken();
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
    return (
      <WithHeader
        location={{ type: "tools" }}
        language={language}
        titleItemList={[]}
        title={{
          japanese: "ローカルファイルから開く",
          english: "Open from local file",
          esperanto: "Malfermu el loka dosiero",
        }}
        useAccountTokenResult={useAccountTokenResult}
      >
        <LoadedLocalProjectPage />
      </WithHeader>
    );
  }

  return (
    <WithHeader
      location={{ type: "tools" }}
      language={language}
      titleItemList={[]}
      title={{
        japanese: "ローカルファイルから開く",
        english: "Open from local file",
        esperanto: "Malfermu el loka dosiero",
      }}
      useAccountTokenResult={useAccountTokenResult}
    >
      <Text
        language={language}
        japanese="ファイルから始めるか, 空のプロジェクトから始めるか"
        english="Starting with a File or an Empty Project?"
        esperanto="Komenci kun Dosiero aŭ Malplena Projekto?"
      />
      <input type="file" ref={fileInputElement} onInput={onInputFile}></input>
      <Button onClick={onClickStartFromEmpty}>
        <Text
          language={language}
          japanese="空のプロジェクトから始める"
          english="start with an empty project"
          esperanto="komenci per malplena projekto"
        />
      </Button>
    </WithHeader>
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
    items: typePartList.map<ListItem>((typePart) => ({
      searchText: typePart.name,
      commonValue: buttonValue({
        text: typePart.name,
        onClick: () =>
          setLocalLocation({ tag: "typePart", typePartId: typePart.id }),
      }),
    })),
    deleteAt: (index) => {
      setTypePartList(util.listDeleteAt(typePartList, index));
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
    items: partList.map<ListItem>((part) => ({
      searchText: part.name,
      commonValue: oneLineTextValue({
        text: part.name,
        onChange: undefined,
      }),
    })),
    deleteAt: (index) => {
      setPartList(util.listDeleteAt(partList, index));
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
  return d.TypePartId.fromString(util.createRandomId());
};

const createRandomPartId = (): d.PartId => {
  return d.PartId.fromString(util.createRandomId());
};

export default LocalProjectPage;
