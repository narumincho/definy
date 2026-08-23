use std::rc::Rc;

use definy_event::EventHashId;
use definy_event::event::{AccountId, Event, EventContent, EventType};
use ed25519_dalek::SigningKey;

use crate::app_state::{AppState, upsert_local_event_record};
use crate::fetch::{get_events, post_event_with_queue};
use crate::local_event::{LocalEventRecord, LocalEventStatus};

pub async fn submit_event<F>(
    content: EventContent,
    key: SigningKey,
    force_offline: bool,
    filter_for_refresh: Option<EventType>,
    set_state: Rc<dyn Fn(Box<dyn FnOnce(AppState) -> AppState>)>,
    on_complete: F,
) where
    F: FnOnce(&mut AppState, &LocalEventRecord) + 'static,
{
    let event = Event {
        account_id: AccountId(key.verifying_key()),
        time: chrono::Utc::now(),
        content,
    };

    let event_binary = match definy_event::sign_and_serialize(event, &key) {
        Ok(binary) => binary,
        Err(error) => {
            web_sys::console::error_1(
                &format!("Failed to sign and serialize event: {:?}", error).into(),
            );
            return;
        }
    };

    match post_event_with_queue(event_binary.as_slice(), force_offline).await {
        Ok(record) => {
            let status = record.status.clone();
            let event_hash = EventHashId::from_bytes(&event_binary);
            let decoded_event = definy_event::verify_and_deserialize(event_binary.as_slice());

            if status == LocalEventStatus::Sent {
                let fetched_events = get_events(filter_for_refresh, Some(20), Some(0)).await;
                set_state(Box::new(move |state| {
                    let mut next = state.clone();
                    if let Ok(events) = fetched_events {
                        next.apply_latest_events(events, filter_for_refresh);
                    }
                    next.event_cache.insert(event_hash, decoded_event);
                    upsert_local_event_record(&mut next, record.clone());
                    on_complete(&mut next, &record);
                    next
                }));
            } else {
                set_state(Box::new(move |state| {
                    let mut next = state.clone();
                    next.event_cache.insert(event_hash, decoded_event);
                    upsert_local_event_record(&mut next, record.clone());
                    on_complete(&mut next, &record);
                    next
                }));
            }
        }
        Err(error) => {
            web_sys::console::error_1(&format!("Failed to post event: {:?}", error).into());
        }
    }
}
