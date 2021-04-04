import * as React from "react";
import * as d from "../../data";
import { DetailView } from "./DetailView";
import { SelectionView } from "./SelectionView";
import { css } from "@emotion/css";

export type TypeAndValue =
  | {
      type: "text";
      value: string;
    }
  | {
      type: "number";
      value: number;
    }
  | {
      type: "select";
      valueList: ReadonlyArray<string>;
      index: number;
    }
  | {
      type: "image";
      alternativeText: string;
      value: d.ImageHash;
    }
  | {
      type: "account";
      value: d.AccountId;
    }
  | {
      type: "time";
      value: d.Time;
    }
  | {
      type: "listProject";
      value: ReadonlyArray<d.ProjectId>;
    };

export type Item = {
  name: string;
  typeAndValue: TypeAndValue;
};

export type HeadItem = {
  item: Item;
  iconHash?: d.ImageHash;
};

export type Props = {
  readonly headItem: HeadItem;
  readonly items: ReadonlyArray<Item>;
  readonly getAccount: (
    accountId: d.AccountId
  ) => d.ResourceState<d.Account> | undefined;
  readonly language: d.Language;
  readonly onJump: (urlData: d.UrlData) => void;
  readonly onRequestAccount: (accountId: d.AccountId) => void;
  readonly getProject: (
    projectId: d.ProjectId
  ) => d.ResourceState<d.Project> | undefined;
  readonly onRequestProject: (projectId: d.ProjectId) => void;
};

export type Selection =
  | {
      tag: "none";
    }
  | {
      tag: "icon";
    }
  | {
      tag: "head";
    }
  | {
      tag: "content";
      index: number;
    };

/**
 * 要素の操作対象を選ぶ, SelectionView, 選択した対象を操作する DetailView を内包する
 */
export const Editor: React.VFC<Props> = (props) => {
  const [selection, setSelection] = React.useState<Selection>({
    tag: "none",
  });
  React.useEffect(() => {
    const handleKeyEvent = (event: KeyboardEvent) => {
      switch (event.code) {
        case "ArrowUp": {
          setSelection((oldSelection) => {
            if (oldSelection.tag === "content") {
              if (oldSelection.index <= 0) {
                return { tag: "head" };
              }
              return { tag: "content", index: oldSelection.index - 1 };
            }
            return oldSelection;
          });
          return;
        }
        case "ArrowDown": {
          setSelection((oldSelection) => {
            if (oldSelection.tag === "head") {
              return { tag: "content", index: 0 };
            }
            if (oldSelection.tag === "content") {
              return {
                tag: "content",
                index: Math.min(oldSelection.index + 1, props.items.length - 1),
              };
            }
            return oldSelection;
          });
        }
      }
    };
    document.addEventListener("keydown", handleKeyEvent);
    return () => {
      document.removeEventListener("keydown", handleKeyEvent);
    };
  }, []);
  return (
    <div
      className={css({
        display: "grid",
        gridTemplateColumns: "1fr 300px",
        height: "100%",
      })}
    >
      <SelectionView
        selection={selection}
        onChangeSelection={setSelection}
        headItem={props.headItem}
        items={props.items}
        getAccount={props.getAccount}
        language={props.language}
        onJump={props.onJump}
        onRequestProject={props.onRequestProject}
        getProject={props.getProject}
      />
      <DetailView
        selection={selection}
        headItem={props.headItem}
        items={props.items}
        getAccount={props.getAccount}
        language={props.language}
        onJump={props.onJump}
        onRequestAccount={props.onRequestAccount}
      />
    </div>
  );
};
