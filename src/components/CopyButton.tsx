import { useState, type JSX } from "react";
import { label } from "../language.ts";
import type { LanguageCode } from "../types.ts";

/** ハッシュや ID をクリップボードにコピーする小さなボタン */
export function CopyButton({
  text,
  language,
}: {
  readonly text: string;
  readonly language: LanguageCode;
}): JSX.Element {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="btn btn-ghost btn-xs copy-button"
      onClick={() => {
        void navigator.clipboard
          .writeText(text)
          .then(() => {
            setCopied(true);
            setTimeout(() => {
              setCopied(false);
            }, 1500);
          })
          .catch(() => {
            // クリップボードが使えない環境では何もしない
          });
      }}
    >
      {copied
        ? label(language, "Copied", "コピーしました", "Kopiite")
        : label(language, "Copy", "コピー", "Kopii")}
    </button>
  );
}
