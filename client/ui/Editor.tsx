import * as React from "react";
import * as d from "../../data";
import { AccountCard } from "./AccountCard";
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
    }
  | {
      type: "image";
      alternativeText: string;
      value: d.ImageHash;
    }
  | {
      type: "account";
      value: d.AccountId;
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
};

type Selection =
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
      />
      <DetailView
        selection={selection}
        headItem={props.headItem}
        items={props.items}
        getAccount={props.getAccount}
        language={props.language}
        onJump={props.onJump}
      />
    </div>
  );
};

const SelectionView: React.VFC<{
  readonly selection: Selection;
  readonly onChangeSelection: (selection: Selection) => void;
  readonly headItem: HeadItem;
  readonly items: ReadonlyArray<Item>;
  readonly getAccount: (
    accountId: d.AccountId
  ) => d.ResourceState<d.Account> | undefined;
  readonly language: d.Language;
  readonly onJump: (urlData: d.UrlData) => void;
}> = (props) => {
  return (
    <div
      className={css({
        display: "grid",
        gap: 4,
        alignContent: "start",
      })}
    >
      <div
        className={css({
          display: "grid",
          gridAutoFlow: "column",
          gridTemplateColumns:
            props.headItem.iconHash === undefined ? "1fr" : "auto 1fr",
        })}
      >
        {props.headItem.iconHash === undefined ? (
          <></>
        ) : (
          <div
            className={css({
              display: "grid",
              placeContent: "center",
              borderWidth: 2,
              borderStyle: "solid",
              borderColor: props.selection.tag === "icon" ? "red" : "#222",
              borderRadius: 8,
            })}
            onClick={() => {
              props.onChangeSelection({
                tag: "icon",
              });
            }}
          >
            <Image
              width={32}
              height={32}
              alt="タイトルのアイコン"
              imageHash={props.headItem.iconHash}
            />
          </div>
        )}
        <ItemView
          isSelect={props.selection.tag === "head"}
          onSelect={() => {
            props.onChangeSelection({ tag: "head" });
          }}
          item={props.headItem.item}
          isHead
          getAccount={props.getAccount}
          language={props.language}
          onJump={props.onJump}
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
          getAccount={props.getAccount}
          language={props.language}
          onJump={props.onJump}
        />
      ))}
    </div>
  );
};

const ItemView: React.VFC<{
  readonly isSelect: boolean;
  readonly onSelect: () => void;
  readonly item: Item;
  readonly isHead?: boolean;
  readonly getAccount: (
    accountId: d.AccountId
  ) => d.ResourceState<d.Account> | undefined;
  readonly language: d.Language;
  readonly onJump: (urlData: d.UrlData) => void;
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
        {props.isHead ? (
          <></>
        ) : (
          <div
            className={css({
              fontWeight: "bold",
              fontSize: 16,
              color: "#ddd",
            })}
          >
            {props.item.name}
          </div>
        )}
      </div>
      <ValueView
        typeAndValue={props.item.typeAndValue}
        isBig={props.isHead}
        getAccount={props.getAccount}
        language={props.language}
        onJump={props.onJump}
      />
    </div>
  );
};

const DetailView: React.VFC<{
  readonly selection: Selection;
  readonly headItem: HeadItem;
  readonly items: ReadonlyArray<Item>;
  readonly getAccount: (
    accountId: d.AccountId
  ) => d.ResourceState<d.Account> | undefined;
  language: d.Language;
  readonly onJump: (urlData: d.UrlData) => void;
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
          <ValueView
            typeAndValue={props.headItem.item.typeAndValue}
            getAccount={props.getAccount}
            language={props.language}
            onJump={props.onJump}
          />
        </div>
      );
    case "icon":
      return (
        <div
          className={css({
            height: "100%",
            overflowX: "hidden",
            overflowY: "scroll",
          })}
        >
          アイコンを選択してる
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
          <ValueView
            typeAndValue={item.typeAndValue}
            getAccount={props.getAccount}
            language={props.language}
            onJump={props.onJump}
          />
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
    case "image":
      return (
        <div
          className={css({
            color: "#ddd",
          })}
        >
          image
        </div>
      );
    case "account":
      return (
        <div
          className={css({
            color: "#ddd",
          })}
        >
          account
        </div>
      );
  }
};

const ValueView: React.VFC<{
  typeAndValue: TypeAndValue;
  isBig?: boolean;
  getAccount: (
    accountId: d.AccountId
  ) => d.ResourceState<d.Account> | undefined;
  language: d.Language;
  onJump: (urlData: d.UrlData) => void;
}> = (props) => {
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
    case "image":
      return (
        <div
          className={css({
            display: "grid",
            justifyContent: "center",
          })}
        >
          <Image
            imageHash={props.typeAndValue.value}
            alt={props.typeAndValue.alternativeText}
            width={512}
            height={316.5}
          />
        </div>
      );
    case "account":
      return (
        <AccountCard
          accountId={props.typeAndValue.value}
          getAccount={props.getAccount}
          language={props.language}
          onJump={props.onJump}
        />
      );
  }
};
