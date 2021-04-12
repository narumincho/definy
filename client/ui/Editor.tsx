import * as React from "react";
import * as d from "../../data";
import {
  ProductSelection,
  ProductType,
  ProductValue,
  productUpdate,
} from "../editor/product";
import {
  selectionDown,
  selectionFirstChild,
  selectionUp,
} from "../editor/commonElement";
import { css } from "@emotion/css";

export type Props = {
  readonly product: ProductValue;
  readonly productType: ProductType;
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

/**
 * 要素の操作対象を選ぶ, SelectionView, 選択した対象を操作する DetailView を内包する
 */
export const Editor: React.VFC<Props> = (props) => {
  const [selection, setSelection] = React.useState<ProductSelection>({
    tag: "head",
    selection: undefined,
  });
  React.useEffect(() => {
    const handleKeyEvent = (event: KeyboardEvent) => {
      console.log(event.code);
      switch (event.code) {
        case "KeyW":
        case "ArrowUp": {
          setSelection((oldSelection) =>
            selectionUp(oldSelection, props.product, props.productType)
          );
          event.preventDefault();
          event.stopPropagation();
          return;
        }
        case "KeyS":
        case "ArrowDown": {
          setSelection((oldSelection) =>
            selectionDown(oldSelection, props.product, props.productType)
          );
          event.preventDefault();
          event.stopPropagation();
          return;
        }
        case "KeyE": {
          setSelection((oldSelection) =>
            selectionFirstChild(oldSelection, props.product, props.productType)
          );
          event.preventDefault();
          event.stopPropagation();
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
      <div
        className={css({
          height: "100%",
          overflowY: "scroll",
        })}
      >
        <productUpdate.selectionView
          selection={selection}
          onChangeSelection={setSelection}
          type={props.productType}
          value={props.product}
          getAccount={props.getAccount}
          language={props.language}
          onJump={props.onJump}
          onRequestProject={props.onRequestProject}
          getProject={props.getProject}
        />
      </div>
      <div
        className={css({
          height: "100%",
          overflowX: "hidden",
          overflowY: "scroll",
        })}
      >
        <productUpdate.detailView
          selection={selection}
          type={props.productType}
          value={props.product}
          getAccount={props.getAccount}
          language={props.language}
          onJump={props.onJump}
          onRequestProject={props.onRequestProject}
          getProject={props.getProject}
        />
      </div>{" "}
    </div>
  );
};
