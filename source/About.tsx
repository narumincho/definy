/** @jsx jsx */

import * as React from "react";
import { jsx } from "react-free-style";

export const About: React.FC<Record<never, never>> = () => (
  <div>
    <div>DefinyはWebアプリのためのWebアプリです </div>
    <a
      css={{ display: "block", padding: 16 }}
      href="https://github.com/narumincho/Definy"
    >
      narumincho/Definy (GitHub)
    </a>
  </div>
);
