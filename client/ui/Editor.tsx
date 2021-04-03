import * as React from "react";
import * as d from "../../data";
import { Image } from "../container/Image";
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
    };

export type Item = {
  name: string;
  iconHash?: d.ImageHash;
  typeAndValue: TypeAndValue;
};

export type HeadItem = {
  item: Item;
  iconHash?: d.ImageHash;
};

export type Props = {
  readonly headItem: HeadItem;
  readonly items: ReadonlyArray<Item>;
};

type Selection =
  | {
      tag: "none";
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
      />
      <DetailView
        selection={selection}
        headItem={props.headItem}
        items={props.items}
      />
    </div>
  );
};

const SelectionView: React.VFC<{
  readonly selection: Selection;
  readonly onChangeSelection: (selection: Selection) => void;
  readonly headItem: HeadItem;
  readonly items: ReadonlyArray<Item>;
}> = (props) => {
  return (
    <div
      className={css({
        display: "grid",
        gap: 4,
      })}
    >
      <div
        className={css({
          display: "grid",
          gridAutoFlow: "column",
          alignItems: "center",
          gridTemplateColumns: "32px 1fr",
        })}
      >
        {props.headItem.iconHash === undefined ? (
          <></>
        ) : (
          <Image
            width={32}
            height={32}
            alt="タイトルのアイコン"
            imageHash={props.headItem.iconHash}
          />
        )}
        <ItemView
          isSelect={props.selection.tag === "head"}
          onSelect={() => {
            props.onChangeSelection({ tag: "head" });
          }}
          item={props.headItem.item}
          isHead
        />
      </div>
      {props.items.map((item, index) => (
        <ItemView
          key={item.name}
          isSelect={
            props.selection.tag === "content" && props.selection.index === index
          }
          onSelect={() => {
            props.onChangeSelection({ tag: "content", index });
          }}
          item={item}
        />
      ))}
    </div>
  );
};

const ItemView: React.VFC<{
  isSelect: boolean;
  onSelect: () => void;
  item: Item;
  isHead?: boolean;
}> = (props) => {
  return (
    <div
      className={css({
        padding: 4,
        borderWidth: 2,
        borderStyle: "solid",
        borderColor: props.isSelect ? "red" : "#222",
        borderRadius: 8,
      })}
      onClick={() => {
        props.onSelect();
      }}
    >
      <div
        className={css({
          display: "flex",
          gap: 16,
          alignItems: "center",
        })}
      >
        <div
          className={css({
            fontWeight: "bold",
            fontSize: props.isHead ? 12 : 16,
            color: "#ddd",
          })}
        >
          {props.item.name}
        </div>
      </div>
      <ValueView typeAndValue={props.item.typeAndValue} isBig={props.isHead} />
    </div>
  );
};

const DetailView: React.VFC<{
  readonly selection: Selection;
  readonly headItem: HeadItem;
  readonly items: ReadonlyArray<Item>;
}> = (props) => {
  switch (props.selection.tag) {
    case "none":
      return (
        <div
          className={css({
            height: "100%",
            overflowX: "hidden",
            overflowY: "scroll",
          })}
        >
          選択しているものはない
        </div>
      );
    case "head":
      return (
        <div
          className={css({
            height: "100%",
            overflowX: "hidden",
            overflowY: "scroll",
          })}
        >
          <div
            className={css({
              display: "flex",
              gap: 16,
              alignItems: "center",
            })}
          >
            <div
              className={css({
                fontSize: 24,
              })}
            >
              {props.headItem.item.name}
            </div>
            <TypeView typeAndValue={props.headItem.item.typeAndValue} />
          </div>
          <ValueView typeAndValue={props.headItem.item.typeAndValue} />
        </div>
      );
    case "content": {
      const item = props.items[props.selection.index];
      return (
        <div
          className={css({
            height: "100%",
            overflowX: "hidden",
            overflowY: "scroll",
          })}
        >
          <div
            className={css({
              display: "flex",
              gap: 16,
              alignItems: "center",
            })}
          >
            <div
              className={css({
                fontSize: 24,
              })}
            >
              {item.name}
            </div>
            <TypeView typeAndValue={item.typeAndValue} />
          </div>
          <ValueView typeAndValue={item.typeAndValue} />
        </div>
      );
    }
  }
};

const TypeView: React.VFC<{ typeAndValue: TypeAndValue }> = (props) => {
  switch (props.typeAndValue.type) {
    case "number":
      return (
        <div
          className={css({
            color: "#ddd",
          })}
        >
          number
        </div>
      );
    case "text":
      return (
        <div
          className={css({
            color: "#ddd",
          })}
        >
          text
        </div>
      );
    case "select":
      return (
        <div
          className={css({
            color: "#ddd",
          })}
        >
          option(
          {props.typeAndValue.valueList.join(",")})
        </div>
      );
  }
};

const ValueView: React.VFC<{ typeAndValue: TypeAndValue; isBig?: boolean }> = (
  props
) => {
  switch (props.typeAndValue.type) {
    case "number":
      return (
        <div className={css({ fontSize: props.isBig ? 32 : 16 })}>
          {props.typeAndValue.value}
        </div>
      );
    case "text":
      return (
        <div className={css({ fontSize: props.isBig ? 32 : 16 })}>
          {props.typeAndValue.value}
        </div>
      );
    case "select":
      return (
        <div className={css({ fontSize: props.isBig ? 32 : 16 })}>
          {props.typeAndValue.valueList[props.typeAndValue.index]}
        </div>
      );
  }
};
