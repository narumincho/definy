import type { JSX } from "react";
import { useParams } from "@void/react";
import { Link } from "../../src/components/Link.tsx";
import { label } from "../../src/language.ts";
import { useDefiny } from "../../src/state.tsx";
import type { EventRecord } from "../../src/types.ts";

export default function EventDetailPage(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const { language, events } = useDefiny();

  const fallbackEvent: EventRecord = {
    eventHash: id ?? "unknown",
    signedEventBytes: "",
    accountId: "unknown",
    eventType: "unknown",
    createdAtRfc3339: new Date().toISOString(),
    timeMs: Date.now(),
    verification: { status: "invalid", reason: "event not found" },
  };

  const event = events.find((e) => e.eventHash === id) ?? fallbackEvent;
  const isInvalid = event.verification.status === "invalid";

  return (
    <div className="event-detail-view">
      <div
        className={`card event-detail-card ${isInvalid ? "event-card-invalid" : ""}`}
      >
        <div className="breadcrumb">
          <Link href="/" className="breadcrumb-link">
            {label(language, "Events", "イベント", "Eventoj")}
          </Link>
          <span className="breadcrumb-separator">/</span>
          <span className="breadcrumb-current">
            {event.eventHash.slice(0, 16)}
          </span>
        </div>

        <h2 className="event-title">
          <span className={`badge badge-${event.eventType}`}>
            {event.eventType}
          </span>
        </h2>

        <div className="detail-meta-grid">
          <div className="meta-item">
            <span className="meta-label">Event Hash</span>
            <span className="meta-value font-mono">{event.eventHash}</span>
          </div>

          <div className="meta-item">
            <span className="meta-label">Author Account</span>
            <span className="meta-value font-mono">{event.accountId}</span>
          </div>

          <div className="meta-item">
            <span className="meta-label">Timestamp</span>
            <span className="meta-value">
              {new Date(event.timeMs).toLocaleString()}
            </span>
          </div>

          <div className="meta-item">
            <span className="meta-label">Signature</span>
            <span className="meta-value">
              {event.verification.status === "valid" ? (
                label(language, "Valid", "正しい", "Valida")
              ) : (
                <>
                  <span
                    className="badge badge-invalid-signature"
                    title={event.verification.reason}
                  >
                    {label(
                      language,
                      "Invalid signature",
                      "署名が不正",
                      "Nevalida subskribo",
                    )}
                  </span>{" "}
                  <span>{event.verification.reason}</span>
                </>
              )}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
