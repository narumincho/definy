import * as React from "react";
import * as d from "../../data";
import { Product, Selection, selectionUp } from "../editor/selectionAndValue";
import { DetailView } from "./DetailView";
import { SelectionView } from "./SelectionView";
import { css } from "@emotion/css";

export type Props = {
  readonly product: Product;
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
  const [selection, setSelection] = React.useState<Selection>({
    tag: "none",
  });
  React.useEffect(() => {
    const handleKeyEvent = (event: KeyboardEvent) => {
      switch (event.code) {
        case "ArrowUp": {
          setSelection((oldSelection) =>
            selectionUp(oldSelection, props.product)
          );
          return;
        }
        case "ArrowDown": {
          setSelection((oldSelection) =>
            selectionUp(oldSelection, props.product)
          );
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
        product={props.product}
        getAccount={props.getAccount}
        language={props.language}
        onJump={props.onJump}
        onRequestProject={props.onRequestProject}
        getProject={props.getProject}
      />
      <DetailView
        selection={selection}
        product={props.product}
        getAccount={props.getAccount}
        language={props.language}
        onJump={props.onJump}
        onRequestAccount={props.onRequestAccount}
      />
    </div>
  );
};
