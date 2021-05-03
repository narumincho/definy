import React from "react";

/**
 * エディタの要素に必要なもの.
 *
 * 移動時の動作や, 左のSelectionView, 右のDetailView に表示するコンポーネントを指定する必要がある
 */
export type ElementOperation<Selection, Value> = {
  /**
   * 上に移動するときにどのように移動するかどうかを決める
   *
   * デフォルトで `W` キーを押したときの動作
   */
  readonly moveUp: (selection: Selection, value: Value) => Selection;
  /**
   * 下に移動するときにどのように移動するかどうかを決める
   *
   * デフォルトで `S` キーを押したときの動作
   */
  readonly moveDown: (selection: Selection, value: Value) => Selection;

  /**
   * 先頭の子要素に移動したときにどういう移動をするかどうかを決める
   * @param selection 選択位置, `undefined`の場合は要素自体が選択されている場合
   * @returns `undefined` の場合は, 選択が不正であることを表現する. 不正であるときは基本的に要素自体を選択することが多い
   *
   * デフォルトで `E` キーを押したときの動作
   */
  readonly moveFirstChild: (
    selection: Selection | undefined,
    value: Value
  ) => Selection | undefined;

  /**
   * 親にどのように移動するかを決める
   *
   * @param selection 選択位置
   * @returns `undefined` の場合は, 選択が要素外に出る場合や, 選択が不正であることを表現する.
   * その場合, 基本的に要素自体を選択することが多い
   *
   * デフォルトで `Q` キーを押したときの動作
   */
  readonly moveParent: (
    selection: Selection,
    value: Value
  ) => Selection | undefined;

  /**
   * 左側の選択の木構造のコンポーネント
   */
  readonly selectionView: React.VFC<{
    readonly selection: Selection | undefined;
    readonly value: Value;
    readonly onChangeSelection: (selection: Selection) => void;
  }>;

  /**
   * 右側に表示される詳細コンポーネント
   */
  readonly detailView: React.VFC<{
    readonly value: Value;
    readonly selection: Selection | undefined;
  }>;
};
