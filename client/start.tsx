import { createRoot } from "https://esm.sh/react-dom@18.3.1/client";
import { App } from "./main.tsx";
import React from "https://esm.sh/v128/@types/react@18.2.38/index.d.ts";

const root = document.getElementById("root");
if (root === null) {
    throw new Error("root element not found");
}

createRoot(root).render(<App />);
