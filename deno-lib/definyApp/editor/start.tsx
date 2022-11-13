/// <reference lib="dom" />

import React from "https://esm.sh/react@18.2.0";
import { hydrateRoot } from "https://esm.sh/react-dom@18.2.0/client";
import { App } from "./app.tsx";

hydrateRoot(document.body, <App />);
