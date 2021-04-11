/* eslint-disable complexity */
import * as React from "react";
import * as d from "../../data";
import { ProductSelection, ProductType, ProductValue } from "../editor/product";
import { Type, Value, commonElement } from "../editor/commonElement";
import { Image } from "../container/Image";
import { css } from "@emotion/css";

export type Props = {
  readonly selection: ProductSelection;
  readonly onChangeSelection: (selection: ProductSelection) => void;
  readonly product: ProductValue;
  readonly productType: ProductType;
  readonly getAccount: (
    accountId: d.AccountId
  ) => d.ResourceState<d.Account> | undefined;
  readonly getProject: (
    projectId: d.ProjectId
  ) => d.ResourceState<d.Project> | undefined;
  readonly language: d.Language;
  readonly onJump: (urlData: d.UrlData) => void;
  readonly onRequestProject: (projectId: d.ProjectId) => void;
};

export const SelectionView: React.VFC<Props> = (props) => {
  return (
    <div
      className={css({
        display: "grid",
        gap: 4,
        alignContent: "start",
        padding: 8,
        height: "100%",
        overflowX: "hidden",
        overflowY: "scroll",
      })}
    >
      {props.product.headItem === undefined ||
      props.productType.headItem === undefined ? (
        <></>
      ) : (
        <div
          className={css({
            display: "grid",
            gridAutoFlow: "column",
            gridTemplateColumns:
              props.product.headItem.iconHash === undefined
                ? "1fr"
                : "auto 1fr",
          })}
        >
          {props.product.headItem.iconHash === undefined ? (
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
                imageHash={props.product.headItem.iconHash}
              />
            </div>
          )}
          <ItemView
            isSelect={props.selection.tag === "head"}
            onSelect={() => {
              props.onChangeSelection({ tag: "head", selection: undefined });
            }}
            name={props.productType.headItem.name}
            type={props.productType.headItem.type}
            value={props.product.headItem.value}
            isHead
            getAccount={props.getAccount}
            language={props.language}
            onJump={props.onJump}
            getProject={props.getProject}
            onRequestProject={props.onRequestProject}
          />
        </div>
      )}
      {props.productType.items.map((itemType, index) => {
        const item = props.product.items[index];
        if (item === undefined) {
          return <div>指定したメンバーの値がない {JSON.stringify(item)}</div>;
        }
        return (
          <ItemView
            key={itemType.name}
            isSelect={
              props.selection.tag === "content" &&
              props.selection.index === index
            }
            onSelect={() => {
              props.onChangeSelection({
                tag: "content",
                index,
                selection: undefined,
              });
            }}
            name={itemType.name}
            type={itemType.type}
            value={item}
            getAccount={props.getAccount}
            language={props.language}
            onJump={props.onJump}
            getProject={props.getProject}
            onRequestProject={props.onRequestProject}
          />
        );
      })}
    </div>
  );
};

const ItemView: React.VFC<{
  readonly isSelect: boolean;
  readonly onSelect: () => void;
  readonly name: string;
  readonly type: Type;
  readonly value: Value;
  readonly isHead?: boolean;
  readonly getAccount: (
    accountId: d.AccountId
  ) => d.ResourceState<d.Account> | undefined;
  readonly language: d.Language;
  readonly onJump: (urlData: d.UrlData) => void;
  readonly getProject: (
    projectId: d.ProjectId
  ) => d.ResourceState<d.Project> | undefined;
  readonly onRequestProject: (projectId: d.ProjectId) => void;
}> = (props) => {
  const ref = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (props.isSelect && ref.current !== null) {
      ref.current.focus();
    }
  }, [props.isSelect]);

  return (
    <div
      ref={ref}
      tabIndex={-1}
      className={css({
        padding: 4,
        outline: props.isSelect ? "solid 2px red" : "none",
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
            {props.name}
          </div>
        )}
      </div>
      <commonElement.selectionView
        type={props.type}
        value={props.value}
        isBig={props.isHead}
        getAccount={props.getAccount}
        language={props.language}
        onJump={props.onJump}
        getProject={props.getProject}
        onRequestProject={props.onRequestProject}
      />
    </div>
  );
};
