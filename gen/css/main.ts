import { Color } from "../html/data";

/** 構造化されたスタイル */
export type StructuredStyle = {
  /** 背景色 */
  readonly backgroundColor: Color;
  /** 文字色 */
  readonly color: Color;
  /** 余白 */
  readonly padding: number;
  /** 方向 */
  readonly direction: "x" | "y";
};
