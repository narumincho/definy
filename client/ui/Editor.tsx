import * as React from "react";
import {
  ProductDataOperation,
  ProductSelection,
  ProductValue,
  productOperation,
} from "../editor/product";
import type { UseDefinyAppResult } from "../hook/useDefinyApp";
import { css } from "@emotion/css";
export type { Value } from "../editor/common";

export type Props = Pick<
  UseDefinyAppResult,
  "accountResource" | "projectResource" | "language" | "typePartResource"
> & {
  readonly product: ProductValue;
  readonly onJump: UseDefinyAppResult["jump"];
  /** データを編集をしようとした */
  readonly onRequestDataOperation: (
    dataOperation: ProductDataOperation
  ) => void;
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
          setSelection(
            (oldSelection) =>
              productOperation.moveUp(oldSelection, props.product) ??
              oldSelection
          );
          event.preventDefault();
          event.stopPropagation();
          return;
        }
        case "KeyS":
        case "ArrowDown": {
          setSelection(
            (oldSelection) =>
              productOperation.moveDown(oldSelection, props.product) ??
              oldSelection
          );
          event.preventDefault();
          event.stopPropagation();
          return;
        }
        case "KeyE": {
          setSelection(
            (oldSelection) =>
              productOperation.moveFirstChild(oldSelection, props.product) ??
              oldSelection
          );
          event.preventDefault();
          event.stopPropagation();
          return;
        }
        case "KeyQ": {
          setSelection(
            (oldSelection) =>
              productOperation.moveParent(oldSelection, props.product) ??
              oldSelection
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
        <productOperation.selectionView
          selection={selection}
          onChangeSelection={setSelection}
          value={props.product}
          accountResource={props.accountResource}
          projectResource={props.projectResource}
          typePartResource={props.typePartResource}
          language={props.language}
          onJump={props.onJump}
          onRequestDataOperation={props.onRequestDataOperation}
        />
      </div>
      <div
        className={css({
          height: "100%",
          overflowX: "hidden",
          overflowY: "scroll",
        })}
      >
        <productOperation.detailView
          selection={selection}
          value={props.product}
          language={props.language}
          accountResource={props.accountResource}
          projectResource={props.projectResource}
          typePartResource={props.typePartResource}
          onJump={props.onJump}
          onRequestDataOperation={props.onRequestDataOperation}
        />
      </div>
    </div>
  );
};
