import type { JSX, ReactNode } from "react";
import { useParams, Link } from "@void/react";
import {
  AccountLink,
  EventSummary,
  dateLocale,
  eventTypeInfo,
} from "../../src/components/EventTimeline.tsx";
import { CopyButton } from "../../src/components/CopyButton.tsx";
import { extractCreateAccount } from "../../src/cbor.ts";
import { label, localizedText } from "../../src/language.ts";
import { useDefiny } from "../../src/state.tsx";
import type { DecodedCommitEvent } from "../../src/state/useEvents.ts";
import type { EventRecord, LanguageCode } from "../../src/types.ts";

export default function EventDetailPage(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const { language, events, connectionStatus, decodedCommits } = useDefiny();

  const event = events.find((e) => e.eventHash === id);
  const breadcrumb = (current: string): JSX.Element => (
    <div className="breadcrumb">
      <Link href="/" className="breadcrumb-link">
        {label(language, "Events", "イベント", "Eventoj")}
      </Link>
      <span className="breadcrumb-separator">/</span>
      <span className="breadcrumb-current">{current}</span>
    </div>
  );

  if (event === undefined) {
    return (
      <div className="event-detail-view">
        {breadcrumb((id ?? "").slice(0, 16))}
        <div className="empty-state">
          {connectionStatus === "connecting" ? (
            <>
              <span className="spinner" />
              <p>
                {label(
                  language,
                  "Loading event...",
                  "イベントを読み込み中...",
                  "Ŝargante eventon...",
                )}
              </p>
            </>
          ) : (
            <p>
              {label(
                language,
                "Event not found",
                "イベントが見つかりません",
                "Evento ne trovita",
              )}
            </p>
          )}
        </div>
      </div>
    );
  }

  const info = eventTypeInfo(event.eventType);
  const Icon = info.icon;
  const isInvalid = event.verification.status === "invalid";
  const commit = decodedCommits.find((c) => c.event.eventHash === id);
  const time = new Date(event.timeMs);
  const typeLabel = label(language, info.en, info.ja, info.eo);

  return (
    <div
      className={`event-detail-view ${isInvalid ? "event-detail-invalid" : ""}`}
      data-event-type={event.eventType}
    >
      {breadcrumb(typeLabel)}

      <header className="card event-detail-header">
        <span className="event-detail-icon" aria-hidden="true">
          <Icon size={22} className="event-detail-icon-svg" />
        </span>
        <div className="event-detail-heading">
          <div className="event-detail-kicker">
            <span className="event-detail-type">{typeLabel}</span>
            {isInvalid && (
              <span className="badge badge-invalid-signature">
                {label(
                  language,
                  "Invalid signature",
                  "署名が不正",
                  "Nevalida subskribo",
                )}
              </span>
            )}
            <time
              className="event-detail-time"
              dateTime={event.createdAtRfc3339}
            >
              {time.toLocaleString(dateLocale(language), {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </time>
          </div>
          <div className="event-detail-summary">
            <EventSummary event={event} language={language} commit={commit} />
          </div>
        </div>
      </header>

      <section className="card event-detail-section">
        <h3 className="event-detail-section-title">
          {label(language, "Details", "詳細", "Detaloj")}
        </h3>
        <dl className="detail-meta-grid">
          <MetaItem label={label(language, "Author", "作成者", "Aŭtoro")}>
            <AccountLink accountId={event.accountId} />
          </MetaItem>
          <MetaItem label={label(language, "Time", "日時", "Tempo")}>
            <time dateTime={event.createdAtRfc3339}>
              {time.toLocaleString(dateLocale(language), {
                dateStyle: "full",
                timeStyle: "medium",
              })}
            </time>
          </MetaItem>
          <MetaItem label={label(language, "Signature", "署名", "Subskribo")}>
            {isInvalid ? (
              <span className="signature-status signature-invalid">
                {label(
                  language,
                  "Could not be verified",
                  "検証できませんでした",
                  "Ne kontrolebla",
                )}
                <span className="signature-reason">
                  {event.verification.status === "invalid"
                    ? event.verification.reason
                    : ""}
                </span>
              </span>
            ) : (
              <span className="signature-status signature-valid">
                ✓{" "}
                {label(
                  language,
                  "Verified (Ed25519)",
                  "検証済み (Ed25519)",
                  "Kontrolita (Ed25519)",
                )}
              </span>
            )}
          </MetaItem>
          <MetaItem
            label={label(language, "Event hash", "イベントハッシュ", "Haketo")}
          >
            <span className="meta-hash">
              <code className="font-mono">{event.eventHash}</code>
              <CopyButton text={event.eventHash} language={language} />
            </span>
          </MetaItem>
          <MetaItem label={label(language, "Size", "サイズ", "Grando")}>
            {signedEventByteLength(event).toLocaleString(dateLocale(language))}{" "}
            bytes
          </MetaItem>
        </dl>
      </section>

      {commit !== undefined && (
        <CommitSection commit={commit} language={language} />
      )}
      {!isInvalid && event.eventType === "create_account" && (
        <CreateAccountSection event={event} language={language} />
      )}
    </div>
  );
}

function MetaItem({
  label: labelText,
  children,
}: {
  readonly label: string;
  readonly children: ReactNode;
}): JSX.Element {
  return (
    <div className="meta-item">
      <dt className="meta-label">{labelText}</dt>
      <dd className="meta-value">{children}</dd>
    </div>
  );
}

/** Base64 の署名付きイベントのバイト数 */
function signedEventByteLength(event: EventRecord): number {
  const base64 = event.signedEventBytes;
  const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
  return Math.floor((base64.length * 3) / 4) - padding;
}

/** モジュールコミットの中身: モジュール, 親・子のコミット, メッセージ, パーツ一覧 */
function CommitSection({
  commit,
  language,
}: {
  readonly commit: DecodedCommitEvent;
  readonly language: LanguageCode;
}): JSX.Element {
  const { events, decodedCommits } = useDefiny();
  const { moduleName, parentCommitHash, message, parts } = commit.commit;
  const parentFound =
    parentCommitHash !== null &&
    events.some((e) => e.eventHash === parentCommitHash);
  const children = decodedCommits.filter(
    (c) => c.commit.parentCommitHash === commit.event.eventHash,
  );

  return (
    <section className="card event-detail-section">
      <h3 className="event-detail-section-title">
        {label(language, "Commit", "コミット", "Enmeto")}
      </h3>
      <dl className="detail-meta-grid">
        <MetaItem label={label(language, "Module", "モジュール", "Modulo")}>
          <Link href={`/module/${moduleName}`} className="meta-link">
            {moduleName}
          </Link>
        </MetaItem>
        <MetaItem
          label={label(
            language,
            "Parent commit",
            "親コミット",
            "Gepatra enmeto",
          )}
        >
          {parentCommitHash === null ? (
            <span className="text-muted">
              {label(
                language,
                "None (first commit)",
                "なし (最初のコミット)",
                "Neniu (unua enmeto)",
              )}
            </span>
          ) : parentFound ? (
            <Link
              href={`/event/${parentCommitHash}`}
              className="meta-link font-mono"
            >
              {parentCommitHash.slice(0, 16)}
            </Link>
          ) : (
            <code className="font-mono text-muted" title={parentCommitHash}>
              {parentCommitHash.slice(0, 16)}
            </code>
          )}
        </MetaItem>
        {children.length > 0 && (
          <MetaItem
            label={label(language, "Next commit", "次のコミット", "Sekva")}
          >
            <span className="meta-link-list">
              {children.map((c) => (
                <Link
                  key={c.event.eventHash}
                  href={`/event/${c.event.eventHash}`}
                  className="meta-link font-mono"
                >
                  {c.event.eventHash.slice(0, 16)}
                </Link>
              ))}
            </span>
          </MetaItem>
        )}
      </dl>
      {message.length > 0 && <p className="event-detail-message">{message}</p>}

      <h4 className="event-detail-subtitle">
        {label(language, "Parts", "パーツ", "Partoj")}
        <span className="chip-count">{parts.length}</span>
      </h4>
      <ul className="event-detail-parts">
        {parts.map((part) => {
          const description = localizedText(part.description, language);
          return (
            <li key={part.name}>
              <Link
                href={`/part/${moduleName}.${part.name}`}
                className="event-detail-part"
              >
                <span className="event-detail-part-name">{part.name}</span>
                {description.length > 0 && (
                  <span className="event-detail-part-desc">{description}</span>
                )}
                {part.contentHash != null && (
                  <code
                    className="event-detail-part-hash"
                    title={part.contentHash}
                  >
                    {part.contentHash.slice(0, 8)}
                  </code>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function CreateAccountSection({
  event,
  language,
}: {
  readonly event: EventRecord;
  readonly language: LanguageCode;
}): JSX.Element {
  const name = extractCreateAccount(event.signedEventBytes)?.accountName;
  return (
    <section className="card event-detail-section">
      <h3 className="event-detail-section-title">
        {label(language, "Account", "アカウント", "Konto")}
      </h3>
      <dl className="detail-meta-grid">
        <MetaItem label={label(language, "Name", "名前", "Nomo")}>
          <Link href={`/account/${event.accountId}`} className="meta-link">
            {name ?? "?"}
          </Link>
        </MetaItem>
        <MetaItem
          label={label(language, "Account ID", "アカウント ID", "Konta ID")}
        >
          <span className="meta-hash">
            <code className="font-mono">{event.accountId}</code>
            <CopyButton text={event.accountId} language={language} />
          </span>
        </MetaItem>
      </dl>
    </section>
  );
}
