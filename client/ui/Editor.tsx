import * as React from "react";
import * as d from "../../data";
import {
  ProductSelection,
  ProductType,
  ProductValue,
  selectionDown,
  selectionFirstChild,
  selectionUp,
} from "../editor/selectionAndValue";
import { DetailView } from "./DetailView";
import { SelectionView } from "./SelectionView";
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
      <SelectionView
        selection={selection}
        onChangeSelection={setSelection}
        productType={props.productType}
        product={props.product}
        getAccount={props.getAccount}
        language={props.language}
        onJump={props.onJump}
        onRequestProject={props.onRequestProject}
        getProject={props.getProject}
      />
      <DetailView
        selection={selection}
        productType={props.productType}
        product={props.product}
        getAccount={props.getAccount}
        language={props.language}
        onJump={props.onJump}
        onRequestAccount={props.onRequestAccount}
      />
    </div>
  );
};
