import React from "https://esm.sh/react@18.2.0";
import { isValidUrl } from "./isValidUrl.ts";
import { c, toStyleAndHash } from "../../cssInJs/mod.ts";

const errorStyle = toStyleAndHash({
  borderStyle: "solid",
  borderColor: "red",
  borderRadius: 8,
  padding: 4,
});

const noteStyle = toStyleAndHash({
  backgroundColor: "#d4ecf6",
  padding: 8,
});

export const Form = (props: {
  readonly statusText: string;
  readonly initUrl: string;
  readonly onChangeUrl: (text: string) => void;
}): React.ReactElement => {
  const [urlText, setUrlText] = React.useState<string>(props.initUrl);

  return (
    <div>
      <div className="form-row">
        <label htmlFor="node-input-url">
          <i className="icon-tag"></i>url
        </label>
        <input
          type="text"
          id="node-input-url"
          placeholder="https://narumincho-definy.deno.dev/"
          value={urlText}
          onChange={(e) => {
            setUrlText(e.target.value);
            props.onChangeUrl(e.target.value);
          }}
        />
      </div>
      {isValidUrl(urlText) ? (
        <></>
      ) : (
        <div className={c(errorStyle)}>
          {urlText} はURLとして不正です. 例: https://narumincho-definy.deno.dev/
        </div>
      )}
      <div className={c(noteStyle)}>
        デプロイをしたあとにノードが生成されます
      </div>
      <div>{JSON.stringify(props.statusText)}</div>
    </div>
  );
};
