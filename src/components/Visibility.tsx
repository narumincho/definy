import type { JSX } from "react";
import type { Visibility } from "../event_content.ts";
import { label } from "../language.ts";
import type { LanguageCode } from "../types.ts";

/** 公開/非公開の表示名 (docs/visibility.md) */
export function visibilityLabel(
  visibility: Visibility,
  language: LanguageCode,
): string {
  return visibility === "private"
    ? label(language, "Private", "非公開", "Privata")
    : label(language, "Public", "公開", "Publika");
}

/** 公開/非公開を選ぶ. 変えると作業中の変更になる */
export function VisibilitySelect({
  id,
  language,
  value,
  disabled = false,
  onChange,
}: {
  readonly id: string;
  readonly language: LanguageCode;
  readonly value: Visibility;
  readonly disabled?: boolean;
  readonly onChange: (visibility: Visibility) => void;
}): JSX.Element {
  return (
    <select
      id={id}
      className="visibility-select"
      value={value}
      disabled={disabled}
      title={label(
        language,
        "A private module can be referenced only from its project, and a private part only from its module",
        "非公開のモジュールは同じプロジェクトから, 非公開のパーツは同じモジュールからだけ参照できます",
        "Privata modulo estas referencebla nur el sia projekto, kaj privata parto nur el sia modulo",
      )}
      onChange={(e) => {
        onChange(e.target.value === "private" ? "private" : "public");
      }}
    >
      {(["public", "private"] as const).map((v) => (
        <option key={v} value={v}>
          {visibilityLabel(v, language)}
        </option>
      ))}
    </select>
  );
}

/** 非公開のときだけ出す印 */
export function PrivateBadge({
  visibility,
  language,
}: {
  readonly visibility: Visibility;
  readonly language: LanguageCode;
}): JSX.Element | null {
  return visibility === "private" ? (
    <span className="badge badge-secondary private-badge">
      {visibilityLabel("private", language)}
    </span>
  ) : null;
}
