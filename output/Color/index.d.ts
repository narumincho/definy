/* eslint-disable init-declarations */

/**
 * The representation of a color.
 * https://pursuit.purescript.org/packages/purescript-colors/5.0.0/docs/Color#t:Color
 */
export type Color = { _color: never };

/**
 * Create a Color from integer RGB values between 0 and 255 and a floating point alpha value between 0.0 and 1.0.
 * https://pursuit.purescript.org/packages/purescript-colors/5.0.0/docs/Color#v:rgba
 */
export declare const rgba: (
  r: number
) => (g: number) => (b: number) => (a: number) => Color;
