import { useEffect, useState, type JSX } from "react";
import { Link } from "../../src/components/Link.tsx";
import { label } from "../../src/language.ts";
import { listSecrets } from "../../src/secret.ts";
import { useDefiny } from "../../src/state.tsx";
import {
  deleteSecret,
  loadAllSecrets,
  loadLatestSecretUsage,
  type SecretUsageEntry,
  type StoredSecret,
} from "../../src/wasi_io_browser.ts";

/** 値を隠すときに出す文字. 値の長さは出さない */
const MASK = "••••••••";

/**
 * 設定 → シークレット (docs/secret.md「一覧」).
 * シークレットのパーツと, このブラウザに入れてある値を一覧にする. 値はふだん隠し, 「表示」を押したときだけ出す
 */
export default function SecretsSettingsPage(): JSX.Element {
  const { language, parts } = useDefiny();
  // localStorage はブラウザにしか無いので, ハイドレーションのあとで読む
  const [stored, setStored] = useState<Readonly<Record<string, StoredSecret>>>(
    {},
  );
  const [latestUsage, setLatestUsage] = useState<
    ReadonlyMap<string, SecretUsageEntry>
  >(new Map());
  const [revealed, setRevealed] = useState<ReadonlySet<string>>(new Set());
  useEffect(() => {
    setStored(loadAllSecrets());
    setLatestUsage(loadLatestSecretUsage());
  }, []);

  const items = listSecrets(parts, stored);

  return (
    <div className="settings-view">
      <div className="view-header">
        <h2 className="view-title">
          <Link href="/settings">
            {label(language, "Settings", "設定", "Agordoj")}
          </Link>
          {" / "}
          {label(language, "Secrets", "シークレット", "Sekretoj")}
        </h2>
      </div>
      <p className="text-muted" style={{ margin: 0, fontSize: "0.88rem" }}>
        {label(
          language,
          "Secret parts and the values entered in this browser. Values are saved only in this browser. Enter or change a value on the page of the secret part.",
          "シークレットのパーツと, このブラウザに入れてある値の一覧です. 値はこのブラウザにだけ保存しています. 値を入れる・変えるのはシークレットのパーツのページです.",
          "Sekretaj partoj kaj la valoroj enigitaj en ĉi tiu retumilo. La valoroj estas konservataj nur en ĉi tiu retumilo. Enigu aŭ ŝanĝu valoron en la paĝo de la sekreta parto.",
        )}
      </p>

      {items.length === 0 ? (
        <div className="card settings-card">
          <p className="text-muted" style={{ margin: 0 }}>
            {label(
              language,
              "No secrets",
              "シークレットはありません",
              "Neniuj sekretoj",
            )}
          </p>
        </div>
      ) : (
        <ul className="secret-list">
          {items.map((item) => {
            const usage = latestUsage.get(item.id);
            const isRevealed = revealed.has(item.id);
            return (
              <li key={item.id} className="card secret-list-item">
                <div className="secret-list-head">
                  <strong>{item.label || item.id}</strong>
                  {item.parts.map((part) => (
                    <Link key={part.partId} href={`/part/${part.partId}`}>
                      {part.moduleName}.{part.name}
                    </Link>
                  ))}
                  {item.parts.length === 0 && (
                    <span className="badge badge-neutral">
                      {label(language, "No part", "パーツなし", "Neniu parto")}
                    </span>
                  )}
                </div>
                <dl className="secret-list-fields">
                  <dt>{label(language, "Value", "値", "Valoro")}</dt>
                  <dd>
                    {item.stored === undefined ? (
                      <span className="text-muted">
                        {label(language, "Not entered", "未入力", "Ne enigita")}
                      </span>
                    ) : (
                      <span className="secret-list-value">
                        <code>{isRevealed ? item.stored.value : MASK}</code>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => {
                            const next = new Set(revealed);
                            if (isRevealed) {
                              next.delete(item.id);
                            } else {
                              next.add(item.id);
                            }
                            setRevealed(next);
                          }}
                        >
                          {isRevealed
                            ? label(language, "Hide", "隠す", "Kaŝi")
                            : label(language, "Show", "表示", "Montri")}
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => {
                            deleteSecret(item.id);
                            setStored(loadAllSecrets());
                          }}
                        >
                          {label(
                            language,
                            "Delete value",
                            "値を消す",
                            "Forigi valoron",
                          )}
                        </button>
                      </span>
                    )}
                  </dd>
                  {item.stored !== undefined && (
                    <>
                      <dt>
                        {label(
                          language,
                          "Allowed",
                          "送ってよい宛先",
                          "Permesitaj",
                        )}
                      </dt>
                      <dd>
                        {item.stored.allowedUrlPrefixes.join(", ") || "-"}
                      </dd>
                      <dt>
                        {label(language, "Entered", "入力日時", "Enigita")}
                      </dt>
                      <dd>{item.stored.updatedAt}</dd>
                    </>
                  )}
                  <dt>
                    {label(
                      language,
                      "Last used",
                      "最後に使った",
                      "Laste uzita",
                    )}
                  </dt>
                  <dd>
                    {usage === undefined
                      ? "-"
                      : `${usage.time} ${usage.partName} → ${usage.url} ${
                          usage.sent
                            ? label(language, "(sent)", "(送信)", "(sendita)")
                            : label(
                                language,
                                "(not sent)",
                                "(送らなかった)",
                                "(ne sendita)",
                              )
                        }`}
                  </dd>
                  <dt>ID</dt>
                  <dd>
                    <code>{item.id}</code>
                  </dd>
                </dl>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
