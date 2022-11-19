import { c, toStyleAndHash } from "../../../cssInJs/mod.ts";
import { Language } from "../../../zodType.ts";
import React from "https://esm.sh/react@18.2.0?pin=v99";

const containerStyle = toStyleAndHash({
  display: "grid",
  border: "none",
  gridTemplateColumns: "32px 160px",
  backgroundColor: "#4285f4",
  borderRadius: 8,
  gap: 8,
  padding: 0,
  cursor: "pointer",
  alignItems: "center",
}, {
  hover: {
    backgroundColor: "#5190f8",
  },
});

const textStyle = toStyleAndHash({
  fontSize: 16,
  color: "#fff",
  lineHeight: "1",
});

export const GoogleLogInButton = (
  props: {
    readonly language: Language;
    readonly onClick: () => void;
  },
) => (
  <button
    className={c(containerStyle)}
    onClick={props.onClick}
  >
    <GoogleIcon />
    <div
      className={c(textStyle)}
    >
      {logInMessage(props.language)}
    </div>
  </button>
);

const logInMessage = (
  language: Language,
): string => {
  switch (language) {
    case "english":
      return `Sign in with Google`;
    case "esperanto":
      return `Ensalutu kun Google`;
    case "japanese":
      return `Google でログイン`;
  }
};

const iconStyle = toStyleAndHash({
  width: 32,
  height: 32,
  padding: 4,
  backgroundColor: "#fff",
  borderRadius: 8,
});

const GoogleIcon: React.FC<Record<string, string>> = React.memo(() => (
  <svg
    viewBox="0 0 20 20"
    className={c(iconStyle)}
  >
    {/** blue */}
    <path
      d="M19.6 10.23c0-.82-.1-1.42-.25-2.05H10v3.72h5.5c-.15.96-.74 2.31-2.04 3.22v2.45h3.16c1.89-1.73 2.98-4.3 2.98-7.34z"
      fill="rgb(66, 133, 244)"
    />
    {/** green */}
    <path
      d="M13.46 15.13c-.83.59-1.96 1-3.46 1-2.64 0-4.88-1.74-5.68-4.15H1.07v2.52C2.72 17.75 6.09 20 10 20c2.7 0 4.96-.89 6.62-2.42l-3.16-2.45z"
      fill="rgb(52, 168, 83)"
    />
    {/** yellow */}
    <path
      d="M3.99 10c0-.69.12-1.35.32-1.97V5.51H1.07A9.973 9.973 0 0 0 0 10c0 1.61.39 3.14 1.07 4.49l3.24-2.52c-.2-.62-.32-1.28-.32-1.97z"
      fill="rgb(251, 188, 5)"
    />
    {/** red */}
    <path
      d="M10 3.88c1.88 0 3.13.81 3.85 1.48l2.84-2.76C14.96.99 12.7 0 10 0 6.09 0 2.72 2.25 1.07 5.51l3.24 2.52C5.12 5.62 7.36 3.88 10 3.88z"
      fill="rgb(234, 67, 53)"
    />
  </svg>
));
