import React from "https://esm.sh/react@18.2.0?pin=v118";
import { urlFromString } from "./urlFromString.ts";
import { styled } from "https://esm.sh/@stitches/react@1.2.8?pin=v118";
import { jsonStringify } from "../../typedJson.ts";

const StyledError = styled("div", {
  borderStyle: "solid",
  borderColor: "red",
  borderRadius: 8,
  padding: 4,
});

const StyledNote = styled("div", {
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
      {urlFromString(urlText) ? <></> : (
        <StyledError>
          {urlText} はURLとして不正です. 例: https://narumincho-definy.deno.dev/
        </StyledError>
      )}
      <StyledNote>
        デプロイをしたあとにノードが生成されます
      </StyledNote>
      <div>{jsonStringify(props.statusText)}</div>
    </div>
  );
};
