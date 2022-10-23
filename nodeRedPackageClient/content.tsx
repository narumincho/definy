/// <reference lib="dom" />

import React from "https://cdn.skypack.dev/react@18.2.0?dts";
import ReactDOM from "https://cdn.skypack.dev/react-dom@18.2.0?dts";

function App() {
  return (
    <div>
      <h2>Hello from React!</h2>
    </div>
  );
}

function main() {
  ReactDOM.render(<App />, document.querySelector("#main"));
}

addEventListener("DOMContentLoaded", () => {
  main();
});
