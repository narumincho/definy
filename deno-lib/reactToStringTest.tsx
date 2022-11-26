import React from "https://esm.sh/react@18.2.0?pin=v99";
import { renderToString } from "https://esm.sh/react-dom@18.2.0/server?pin=v99";

const App = () => {
  return (
    <html>
      <head>
        <meta name="description" content="${parameter.description}" />
      </head>
      <script type="module" src="/${dist.scriptHash}"></script>
      <style
        dangerouslySetInnerHTML={{
          __html: `html, body, #root {
    height: 100%;
  }
  
  body {
    margin: 0;
  }
  
  /*
    Hack typeface https://github.com/source-foundry/Hack
    License: https://github.com/source-foundry/Hack/blob/master/LICENSE.md
  */
  @font-face {
    font-family: "Hack";
    font-weight: 400;
    font-style: normal;
    src: url("/..") format("woff2");
  }
`,
        }}
      >
      </style>
    </html>
  );
};

console.log(renderToString(<App />));
