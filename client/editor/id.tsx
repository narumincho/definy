import * as React from "react";
import { ElementOperation } from "./ElementOperation";
import { css } from "@emotion/css";
import { neverFunc } from "../../common/util";

export type IdValue = {
  readonly id: string;
};

const IdView = (props: {
  /** id は definy でよく使う 128bit */
  readonly id: string;
  readonly size: number;
}): React.ReactElement => {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  React.useEffect(() => {
    const canvasElement = canvasRef.current;
    if (canvasElement === null) {
      return;
    }
    const context = canvasElement.getContext("2d");
    if (context === null) {
      return;
    }

    const imageData = context.createImageData(16, 16);
    for (let i = 0; i < 32; i += 1) {
      const char = props.id[i];
      if (char === undefined) {
        return;
      }
      const value = Number.parseInt(char, 16);
      const offset = i * 16;
      for (let j = 0; j < 4; j += 1) {
        const n = (value >> j) & 1;
        imageData.data[offset + j * 4 + 0] = n * 255;
        imageData.data[offset + j * 4 + 1] = n * 255;
        imageData.data[offset + j * 4 + 2] = n * 255;
        imageData.data[offset + j * 4 + 3] = 255;
      }
    }
    context.putImageData(imageData, 0, 0);
  }, [props.id]);

  return (
    <div
      className={css({
        width: 64 * props.size,
        height: 32 * props.size,
      })}
    >
      <canvas
        ref={canvasRef}
        className={css({
          display: "block",
          imageRendering: "pixelated",
          width: 64 * props.size,
          height: 32 * props.size,
        })}
        width={16}
        height={8}
      ></canvas>
    </div>
  );
};

const IdSelectionView: ElementOperation<never, IdValue>["selectionView"] = (
  props
) => {
  return (
    <div
      className={css({
        padding: 8,
        display: "flex",
        alignItems: "center",
        gap: 16,
      })}
    >
      <IdView id={props.value.id} size={1} />
      {props.value.id}
    </div>
  );
};

const IdDetailView: ElementOperation<never, IdValue>["detailView"] = (
  props
) => {
  return (
    <div className={css({ padding: 8 })}>
      <IdView id={props.value.id} size={3} />
      {props.value.id}
    </div>
  );
};

export const idOperation: ElementOperation<never, IdValue> = {
  moveUp: neverFunc,
  moveDown: neverFunc,
  moveFirstChild: () => undefined,
  moveParent: () => undefined,
  selectionView: IdSelectionView,
  detailView: IdDetailView,
};
