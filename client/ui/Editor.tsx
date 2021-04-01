import * as React from "react";
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
  typeAndValue: TypeAndValue;
};

export type Props = {
  readonly headItem: Item;
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
  readonly headItem: { typeAndValue: TypeAndValue };
  readonly items: ReadonlyArray<Item>;
}> = (props) => {
  return (
    <div>
      <div
        className={css({
          display: "flex",
          borderWidth: 2,
          borderStyle: "solid",
          borderColor: props.selection.tag === "head" ? "red" : "transparent",
        })}
        onClick={() => {
          props.onChangeSelection({ tag: "head" });
        }}
      >
        <ValueView typeAndValue={props.headItem.typeAndValue} isBig />
      </div>
      {props.items.map((item, index) => (
        <div
          key={item.name}
          className={css({
            padding: 8,
            borderWidth: 2,
            borderStyle: "solid",
            borderColor:
              props.selection.tag === "content" &&
              props.selection.index === index
                ? "red"
                : "transparent",
          })}
          onClick={() => {
            props.onChangeSelection({ tag: "content", index });
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
                fontSize: 24,
              })}
            >
              {item.name}
            </div>
            <TypeView typeAndValue={item.typeAndValue} />
          </div>
          <ValueView typeAndValue={item.typeAndValue} />
        </div>
      ))}
    </div>
  );
};

const DetailView: React.VFC<{
  readonly selection: Selection;
  readonly headItem: Item;
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
              {props.headItem.name}
            </div>
            <TypeView typeAndValue={props.headItem.typeAndValue} />
          </div>
          <ValueView typeAndValue={props.headItem.typeAndValue} />
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
