import { useEffect, useState, type JSX } from "react";
import { Link } from "@void/react";
import { label } from "../language.ts";
import type { SecretLiteral } from "../secret.ts";
import type { LanguageCode, PartSnapshot } from "../types.ts";
import {
  deleteSecret,
  loadSecret,
  loadSecretUsage,
  parseUrlPrefixes,
  saveSecret,
} from "../wasi_io_browser.ts";

/**
 * シークレットリテラルのパーツのページに出す欄.
 * 名前と送ってよい宛先 (パーツの式) の編集, 値の入力 (ブラウザにだけ保存), 使用箇所, 使用履歴
 */
export function SecretPanel({
  language,
  secret,
  usages,
  onChange,
}: {
  readonly language: LanguageCode;
  readonly secret: SecretLiteral;
  readonly usages: ReadonlyArray<PartSnapshot>;
  readonly onChange: (secret: SecretLiteral) => void;
}): JSX.Element {
  // localStorage はブラウザにしか無いので, ハイドレーションのあとで読む
  const [stored, setStored] = useState<ReturnType<typeof loadSecret>>();
  const [usage, setUsage] = useState<ReturnType<typeof loadSecretUsage>>([]);
  useEffect(() => {
    setStored(loadSecret(secret.id));
    setUsage(loadSecretUsage(secret.id));
  }, [secret.id]);
  const [value, setValue] = useState("");
  const [prefixesText, setPrefixesText] = useState(
    secret.allowed_url_prefixes.join("\n"),
  );

  return (
    <div className="card secret-panel">
      <h3 style={{ marginTop: 0 }}>
        {label(language, "Secret", "シークレット", "Sekreto")}
      </h3>
      <p className="text-muted" style={{ margin: 0, fontSize: "0.88rem" }}>
        {label(
          language,
          "The value is saved only in this browser and is never put in the part. Programs cannot read it: the host puts it into the HTTP request just before sending, only to the URLs allowed when the value was entered.",
          "値はこのブラウザにだけ保存し, パーツには入れません. プログラムからは読めず, 送信の直前にホストが HTTP リクエストに入れます. 送るのは値を入れたときに許可した宛先だけです.",
          "La valoro estas konservata nur en ĉi tiu retumilo kaj neniam en la parto. Programoj ne povas legi ĝin: la gastiganto metas ĝin en la HTTP-peton ĵus antaŭ sendo, nur al la URL-oj permesitaj, kiam la valoro estis enigita.",
        )}
      </p>

      <label className="setting-row">
        <span>{label(language, "Label", "名前", "Nomo")}</span>
        <input
          className="input"
          value={secret.label}
          onChange={(e) => {
            onChange({ ...secret, label: e.target.value });
          }}
        />
      </label>
      <label style={{ display: "grid", gap: "0.25rem" }}>
        <span>
          {label(
            language,
            "URLs the value may be sent to (one prefix per line)",
            "値を送ってよい URL の先頭 (1 行に 1 つ)",
            "URL-oj, al kiuj la valoro povas esti sendita (po unu prefikso en linio)",
          )}
        </span>
        <textarea
          className="input"
          rows={2}
          spellCheck={false}
          placeholder="https://api.cloudflare.com/"
          value={prefixesText}
          onChange={(e) => {
            setPrefixesText(e.target.value);
            onChange({
              ...secret,
              allowed_url_prefixes: parseUrlPrefixes(e.target.value),
            });
          }}
        />
      </label>

      <div style={{ display: "grid", gap: "0.25rem" }}>
        <span>
          {stored === undefined
            ? label(
                language,
                "No value is entered in this browser",
                "このブラウザには値が入っていません",
                "Neniu valoro estas enigita en ĉi tiu retumilo",
              )
            : `${label(language, "Entered", "入力済み", "Enigita")} (${stored.updatedAt}). ${label(language, "Allowed", "送ってよい宛先", "Permesitaj")}: ${stored.allowedUrlPrefixes.join(", ") || "-"}`}
        </span>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <input
            className="input"
            type="password"
            autoComplete="off"
            value={value}
            placeholder={label(language, "Value", "値", "Valoro")}
            onChange={(e) => {
              setValue(e.target.value);
            }}
          />
          <button
            type="button"
            className="btn btn-primary btn-sm"
            disabled={value === "" || secret.allowed_url_prefixes.length === 0}
            onClick={() => {
              saveSecret(secret.id, {
                value,
                label: secret.label,
                allowedUrlPrefixes: secret.allowed_url_prefixes,
              });
              setValue("");
              setStored(loadSecret(secret.id));
            }}
          >
            {label(
              language,
              "Save in this browser",
              "このブラウザに保存",
              "Konservi en ĉi tiu retumilo",
            )}
          </button>
          {stored !== undefined && (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => {
                deleteSecret(secret.id);
                setStored(undefined);
              }}
            >
              {label(language, "Delete value", "値を消す", "Forigi valoron")}
            </button>
          )}
        </div>
      </div>

      <h4>{label(language, "Used by", "使用箇所", "Uzata de")}</h4>
      {usages.length === 0 ? (
        <p className="text-muted">{label(language, "None", "なし", "Neniu")}</p>
      ) : (
        <ul>
          {usages.map((part) => (
            <li key={part.partId}>
              <Link href={`/part/${part.partId}`}>
                {part.moduleName}.{part.name}
              </Link>
            </li>
          ))}
        </ul>
      )}

      <h4>
        {label(
          language,
          "Usage history (this browser)",
          "使用履歴 (このブラウザ)",
          "Uzhistorio (ĉi tiu retumilo)",
        )}
      </h4>
      {usage.length === 0 ? (
        <p className="text-muted">{label(language, "None", "なし", "Neniu")}</p>
      ) : (
        <ul className="secret-usage">
          {usage.map((entry, index) => (
            <li key={`${entry.time}-${index}`}>
              {entry.time} {entry.partName} → {entry.url}{" "}
              {entry.sent
                ? label(language, "(sent)", "(送信)", "(sendita)")
                : label(
                    language,
                    "(not sent)",
                    "(送らなかった)",
                    "(ne sendita)",
                  )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
