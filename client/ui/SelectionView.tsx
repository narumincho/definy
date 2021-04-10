/* eslint-disable complexity */
import * as React from "react";
import * as d from "../../data";
import {
  Item,
  ProductSelection,
  ProductValue,
  Type,
  Value,
} from "../editor/selectionAndValue";
import { Image } from "../container/Image";
import { Link } from "./Link";
import { ProjectCard } from "./ProjectCard";
import { TimeCard } from "./TimeCard";
import { css } from "@emotion/css";

export type Props = {
  readonly selection: ProductSelection;
  readonly onChangeSelection: (selection: ProductSelection) => void;
  readonly product: ProductValue;
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
      {props.product.headItem === undefined ? (
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
            item={props.product.headItem}
            isHead
            getAccount={props.getAccount}
            language={props.language}
            onJump={props.onJump}
            getProject={props.getProject}
            onRequestProject={props.onRequestProject}
          />
        </div>
      )}
      {props.product.items.map((item, index) => (
        <ItemView
          key={item.name}
          isSelect={
            props.selection.tag === "content" && props.selection.index === index
          }
          onSelect={() => {
            props.onChangeSelection({
              tag: "content",
              index,
              selection: undefined,
            });
          }}
          item={item}
          getAccount={props.getAccount}
          language={props.language}
          onJump={props.onJump}
          getProject={props.getProject}
          onRequestProject={props.onRequestProject}
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
            {props.item.name}
          </div>
        )}
      </div>
      <ValueView
        type={props.item.type}
        value={props.item.value}
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

const ValueView: React.VFC<{
  readonly type: Type;
  readonly value: Value;
  readonly isBig?: boolean;
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
  if (props.type.tag === "number" && props.value.type === "number") {
    return (
      <div className={css({ fontSize: props.isBig ? 32 : 16 })}>
        {props.value.value}
      </div>
    );
  }
  if (props.type.tag === "text" && props.value.type === "text") {
    return (
      <div className={css({ fontSize: props.isBig ? 32 : 16 })}>
        {props.value.value}
      </div>
    );
  }
  if (props.type.tag === "select" && props.value.type === "select") {
    return (
      <div className={css({ fontSize: props.isBig ? 32 : 16 })}>
        {props.type.valueList[props.value.index]}
      </div>
    );
  }
  if (props.type.tag === "image" && props.value.type === "image") {
    return (
      <div
        className={css({
          display: "grid",
          justifyContent: "center",
        })}
      >
        <Image
          imageHash={props.value.value}
          alt={props.value.alternativeText}
          width={512}
          height={316.5}
        />
      </div>
    );
  }
  if (props.type.tag === "account" && props.value.type === "account") {
    const accountResource = props.getAccount(props.value.value);
    if (accountResource === undefined) {
      return <div>アカウント読み込み準備前</div>;
    }
    if (accountResource._ === "Deleted") {
      return <div>存在しないしないアカウント</div>;
    }
    if (accountResource._ === "Requesting") {
      return <div>アカウント取得中</div>;
    }
    if (accountResource._ === "Unknown") {
      return <div>アカウント取得に失敗</div>;
    }
    const account = accountResource.dataWithTime.data;
    return (
      <div
        className={css({
          display: "grid",
          gridAutoFlow: "column",
          alignItems: "center",
          padding: 8,
        })}
      >
        <Image
          imageHash={account.imageHash}
          width={32}
          height={32}
          alt={account.name + "の画像"}
          isCircle
        />
        <div>{account.name}</div>
        <Link
          onJump={props.onJump}
          urlData={{
            language: props.language,
            location: d.Location.Account(props.value.value),
          }}
          style={{
            display: "grid",
            gridAutoFlow: "column",
            alignItems: "center",
            padding: 8,
          }}
        >
          <NextIcon />
        </Link>
      </div>
    );
  }
  if (props.type.tag === "time" && props.value.type === "time") {
    return <TimeCard time={props.value.value} />;
  }
  if (props.type.tag === "project" && props.value.type === "project") {
    return (
      <ProjectCard
        getProject={props.getProject}
        projectId={props.value.value}
        language={props.language}
        onJump={props.onJump}
        onRequestProjectById={props.onRequestProject}
      />
    );
  }
  if (props.type.tag === "list" && props.value.type === "list") {
    const elementType = props.type.element;
    return (
      <div
        className={css({
          display: "grid",
          gridAutoFlow: "column",
          alignItems: "center",
          gridTemplateColumns: "1fr 1fr 1fr",
          padding: 8,
        })}
      >
        {props.value.value.items.map((v, index) => (
          <ValueView
            key={index}
            onRequestProject={props.onRequestProject}
            getAccount={props.getAccount}
            getProject={props.getProject}
            language={props.language}
            onJump={props.onJump}
            isBig={props.isBig}
            value={v}
            type={elementType}
          />
        ))}
      </div>
    );
  }
  return (
    <div>
      値と型が違う! 型{JSON.stringify(props.type)} 値
      {JSON.stringify(props.value)}
    </div>
  );
};

const NextIcon: React.VFC<Record<string, string>> = () => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="currentColor"
    color="#000"
  >
    <path d="M0 0h24v24H0z" fill="none"></path>
    <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"></path>
  </svg>
);
