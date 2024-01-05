import { h, hydrate } from "https://esm.sh/preact@10.19.3";
import { useEffect, useState } from "https://esm.sh/preact@10.19.3/hooks";
import { Location } from "./app/location.ts";
import { App } from "./app/App.ts";

const appElement = document.getElementById("app");

if (appElement === null) {
  throw new Error("appElement not found");
}

const propsValue: string | undefined = appElement.dataset["props"];

if (propsValue === undefined) {
  throw new Error("data-props not found");
}

const props: { readonly location: Location } = JSON.parse(propsValue);

const AppWithState = () => {
  const [location, setLocation] = useState<Location>(props.location);
  useEffect(() => {
  });

  return h(App, {
    location,
    logInState: { type: "loading" },
    onClickCreateIdea: () => {
      console.log("click");
      // fetch("/graphql", {
      //   method: "POST",
      //   headers: { "Content-Type": "application/json" },
      //   body: JSON.stringify({
      //     query:
      //       'mutation { createIdea(input: { title: "test", description: "test" }) { id } }',
      //   }),
      // });
    },
  });
};

// 結局自動アカウント作成機能を作るの?

hydrate(h(AppWithState, {}), appElement);

console.log("client.ts");
