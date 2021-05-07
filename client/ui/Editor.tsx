import * as React from "react";
import {
  ProductSelection,
  ProductValue,
  productOperation,
} from "../editor/product";
import { css } from "@emotion/css";
export type { CommonValue as Value } from "../editor/common";

export type Props = {
  readonly product: ProductValue;
};

/**
 * 要素の操作対象を選ぶ, SelectionView, 選択した対象を操作する DetailView を内包する
 */
export const Editor: React.VFC<Props> = React.memo((props: Props) => {
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
  }, [props.product]);
  return (
    <div
      className={css({
        display: "grid",
        gridTemplateColumns: "1fr 300px",
        width: "100%",
        height: "100%",
        overflow: "hidden",
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
        />
        <div className={css({ height: 64 })}></div>
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
        />
      </div>
    </div>
  );
});
