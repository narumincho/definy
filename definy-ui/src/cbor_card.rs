use definy_event::EventHashId;
use definy_event::event::{Event, EventContent};
use dioxus::prelude::*;

use crate::Location;
use crate::page_context::PageContext;

#[derive(Clone, PartialEq, Debug)]
pub struct DecodedCborInfo {
    pub event_hash: EventHashId,
    pub byte_count: usize,
    pub base64_str: String,
    pub hex_str: String,
    pub signature_valid: bool,
    pub signature_hex: String,
    pub event: Option<Event>,
    pub error_message: Option<String>,
}

pub fn decode_signed_bytes(bytes: &[u8]) -> DecodedCborInfo {
    let event_hash = EventHashId::from_bytes(bytes);
    let byte_count = bytes.len();
    let base64_str =
        base64::Engine::encode(&base64::engine::general_purpose::URL_SAFE_NO_PAD, bytes);
    let hex_str = hex::encode(bytes);

    match definy_event::verify_and_deserialize(bytes) {
        Ok((sig, event)) => DecodedCborInfo {
            event_hash,
            byte_count,
            base64_str,
            hex_str,
            signature_valid: true,
            signature_hex: hex::encode(sig.to_bytes()),
            event: Some(event),
            error_message: None,
        },
        Err(e) => DecodedCborInfo {
            event_hash,
            byte_count,
            base64_str,
            hex_str,
            signature_valid: false,
            signature_hex: String::new(),
            event: None,
            error_message: Some(format!("{e:?}")),
        },
    }
}

#[component]
pub fn RenderDecodedCborCard(index: usize, info: DecodedCborInfo, context: PageContext) -> Element {
    let mut show_hex = use_signal(|| false);

    rsx! {
        div { style: "background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-md); padding: 1.2rem; display: grid; gap: 1rem;",
            // Card header
            div { style: "display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem; border-bottom: 1px solid var(--border); padding-bottom: 0.6rem;",
                div { style: "display: flex; align-items: center; gap: 0.6rem;",
                    span { style: "font-size: 0.85rem; font-weight: 700; color: var(--text-secondary);",
                        "#{index + 1}"
                    }
                    if info.signature_valid {
                        span { style: "background: rgba(43, 192, 131, 0.15); color: #2bc083; padding: 0.15rem 0.5rem; border-radius: 4px; font-size: 0.75rem; font-weight: 600;",
                            "✓ Ed25519 Verified"
                        }
                    } else {
                        span { style: "background: rgba(239, 68, 68, 0.15); color: #ef4444; padding: 0.15rem 0.5rem; border-radius: 4px; font-size: 0.75rem; font-weight: 600;",
                            "✗ Signature Invalid"
                        }
                    }
                    span { style: "background: rgba(147, 51, 234, 0.15); color: #a855f7; padding: 0.15rem 0.5rem; border-radius: 4px; font-size: 0.75rem; font-weight: 600;",
                        "Deterministic CBOR ({info.byte_count} B)"
                    }
                }
                div { style: "font-size: 0.8rem; font-family: monospace; color: var(--text-secondary);",
                    "EventHash: {info.event_hash}"
                }
            }

            // Event metadata
            if let Some(event) = &info.event {
                div { style: "display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 0.8rem; font-size: 0.84rem;",
                    div { style: "display: grid; gap: 0.2rem;",
                        span { style: "color: var(--text-secondary); font-size: 0.76rem;",
                            "Author Account ID"
                        }
                        a {
                            href: context.href_with_lang(Location::Account(event.account_id.clone())),
                            style: "color: var(--primary); text-decoration: none; font-family: monospace; font-size: 0.82rem; overflow: hidden; text-overflow: ellipsis;",
                            "{event.account_id}"
                        }
                    }
                    div { style: "display: grid; gap: 0.2rem;",
                        span { style: "color: var(--text-secondary); font-size: 0.76rem;",
                            "Created At (RFC 3339)"
                        }
                        span { style: "font-family: monospace;", "{event.time.to_rfc3339()}" }
                    }
                    div { style: "display: grid; gap: 0.2rem;",
                        span { style: "color: var(--text-secondary); font-size: 0.76rem;",
                            "Event Type"
                        }
                        span { style: "font-weight: 600; color: var(--text);",
                            match &event.content {
                                EventContent::CreateAccount(_) => "CreateAccount",
                                EventContent::ChangeProfile(_) => "ChangeProfile",
                                EventContent::ModuleCommit(_) => "ModuleCommit",
                            }
                        }
                    }
                }

                // Event Content Detail
                div { style: "border-top: 1px dashed var(--border); padding-top: 0.8rem; display: grid; gap: 0.6rem;",
                    span { style: "font-size: 0.78rem; font-weight: 600; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.05em;",
                        "Event Content (Decoded AST & Metadata)"
                    }
                    match &event.content {
                        EventContent::CreateAccount(ev) => rsx! {
                            div { style: "padding: 0.6rem 0.8rem; background: rgba(0, 0, 0, 0.15); border-radius: var(--radius-sm); font-size: 0.88rem;",
                                span { style: "color: var(--text-secondary);", "New Account Name: " }
                                strong { "{ev.account_name}" }
                            }
                        },
                        EventContent::ChangeProfile(ev) => rsx! {
                            div { style: "padding: 0.6rem 0.8rem; background: rgba(0, 0, 0, 0.15); border-radius: var(--radius-sm); font-size: 0.88rem;",
                                span { style: "color: var(--text-secondary);", "Updated Account Name: " }
                                strong { "{ev.account_name}" }
                            }
                        },
                        EventContent::ModuleCommit(ev) => rsx! {
                            div { style: "display: grid; gap: 0.6rem;",
                                div { style: "display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 0.6rem; padding: 0.6rem 0.8rem; background: rgba(0, 0, 0, 0.15); border-radius: var(--radius-sm); font-size: 0.84rem;",
                                    div {
                                        span { style: "color: var(--text-secondary);", "Module Name: " }
                                        strong { "{ev.module_name}" }
                                    }
                                    div {
                                        span { style: "color: var(--text-secondary);", "Commit Message: " }
                                        span { "\"{ev.message}\"" }
                                    }
                                    if let Some(parent) = &ev.parent_commit_hash {
                                        div {
                                            span { style: "color: var(--text-secondary);", "Parent Commit: " }
                                            a {
                                                href: context.href_with_lang(Location::Event(parent.clone())),
                                                style: "color: var(--primary); text-decoration: none; font-family: monospace; font-size: 0.8rem;",
                                                "{parent}"
                                            }
                                        }
                                    }
                                    div {
                                        span { style: "color: var(--text-secondary);", "Parts in Module: " }
                                        strong { "{ev.parts.len()}" }
                                    }
                                }

                                if !ev.parts.is_empty() {
                                    div { style: "display: grid; gap: 0.4rem;",
                                        span { style: "font-size: 0.76rem; color: var(--text-secondary);",
                                            "Module Parts (Snapshot):"
                                        }
                                        div { style: "display: grid; gap: 0.4rem;",
                                            for part in &ev.parts {
                                                div {
                                                    key: "{part.name}",
                                                    style: "padding: 0.4rem 0.6rem; background: rgba(255, 255, 255, 0.03); border: 1px solid var(--border); border-radius: var(--radius-sm); display: flex; justify-content: space-between; align-items: center; font-size: 0.82rem;",
                                                    div { style: "display: flex; align-items: center; gap: 0.5rem;",
                                                        span { style: "font-weight: 600; color: var(--text);",
                                                            "{part.name}"
                                                        }
                                                        if let Some(pt) = &part.part_type {
                                                            span { style: "font-family: monospace; font-size: 0.75rem; color: #a78bfa; background: rgba(167, 139, 250, 0.1); padding: 0.1rem 0.35rem; border-radius: 3px;",
                                                                ": {pt}"
                                                            }
                                                        }
                                                        if let Some(ch) = &part.content_hash {
                                                            span { style: "font-family: monospace; font-size: 0.72rem; color: #fbbf24; background: rgba(245, 158, 11, 0.1); padding: 0.1rem 0.35rem; border-radius: 3px;",
                                                                "CAS: {ch}"
                                                            }
                                                        }
                                                    }
                                                    if part.expression.is_some() {
                                                        span { style: "font-size: 0.75rem; color: #34d399;",
                                                            "Has Expression AST"
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        },
                    }
                }
            }

            // Error display if failed
            if let Some(err) = &info.error_message {
                div { style: "padding: 0.6rem 0.8rem; background: rgba(239, 68, 68, 0.1); border-radius: var(--radius-sm); color: #ef4444; font-size: 0.82rem;",
                    "Deserialization error: {err}"
                }
            }

            // Hex / Base64 Inspection Toggle
            div { style: "border-top: 1px solid var(--border); padding-top: 0.6rem;",
                button {
                    onclick: move |_| show_hex.set(!show_hex()),
                    style: "background: none; border: none; padding: 0; color: var(--text-secondary); cursor: pointer; font-size: 0.78rem; text-decoration: underline;",
                    if show_hex() {
                        "Hide Raw Binary Dumps ▲"
                    } else {
                        "View Raw Binary Dumps (Base64 / Hex) ▼"
                    }
                }

                if show_hex() {
                    div { style: "margin-top: 0.5rem; display: grid; gap: 0.5rem;",
                        div {
                            span { style: "font-size: 0.72rem; color: var(--text-secondary);",
                                "URL-Safe Base64:"
                            }
                            div { style: "font-family: monospace; font-size: 0.74rem; word-break: break-all; background: rgba(0, 0, 0, 0.2); padding: 0.4rem; border-radius: 3px;",
                                "{info.base64_str}"
                            }
                        }
                        div {
                            span { style: "font-size: 0.72rem; color: var(--text-secondary);",
                                "Hex Dump:"
                            }
                            div { style: "font-family: monospace; font-size: 0.74rem; word-break: break-all; background: rgba(0, 0, 0, 0.2); padding: 0.4rem; border-radius: 3px;",
                                "{info.hex_str}"
                            }
                        }
                    }
                }
            }
        }
    }
}
