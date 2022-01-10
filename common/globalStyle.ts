import * as css from "../gen/css/main";

export const globalStyle = `
/*
  Hack typeface https://github.com/source-foundry/Hack
  License: https://github.com/source-foundry/Hack/blob/master/LICENSE.md
*/

@font-face {
  font-family: "Hack";
  font-weight: 400;
  font-style: normal;
  src: url("/hack_regular_subset.woff2") format("woff2");
}

${css.ruleListToString({
  ruleList: [
    {
      selector: { type: "type", elementName: "html" },
      declarationList: [css.height100Percent],
    },
    {
      selector: { type: "type", elementName: "body" },
      declarationList: [
        css.height100Percent,
        css.margin0,
        css.backgroundColor("black"),
        css.displayGrid,
        {
          property: "font-family",
          value: "Hack",
        },
      ],
    },
  ],
  keyframesList: [],
})}

* {
  box-sizing: border-box;
  color: white;
}`;
