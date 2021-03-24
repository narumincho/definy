export const globalStyle = `
/*
  Hack typeface https://github.com/source-foundry/Hack
  License: https://github.com/source-foundry/Hack/blob/master/LICENSE.md
*/

@font-face {
  font-family: "Hack";
  font-weight: 400;
  font-style: normal;
  src: url("/hack-regular-subset.woff2") format("woff2");
}

html {
  height: 100%;
}

body {
  height: 100%;
  margin: 0;
  background-color: black;
  display: grid;
}

* {
  box-sizing: border-box;
  color: white;
}`;
