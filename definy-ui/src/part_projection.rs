use definy_event::event::{AccountId, Event, EventContent, Expression};

use crate::AppState;

#[derive(Clone)]
pub struct PartSnapshot {
    pub definition_event_hash: [u8; 32],
    pub latest_event_hash: [u8; 32],
    pub account_id: AccountId,
    pub part_name: String,
    pub part_description: String,
    pub expression: Expression,
    pub updated_at: chrono::DateTime<chrono::Utc>,
    pub has_definition: bool,
}

pub fn collect_part_snapshots(state: &AppState) -> Vec<PartSnapshot> {
    let mut events = state
        .created_account_events
        .iter()
        .filter_map(|(hash, event_result)| {
            let (_, event) = event_result.as_ref().ok()?;
            Some((*hash, event.clone()))
        })
        .collect::<Vec<([u8; 32], Event)>>();
    events.sort_by_key(|(_, event)| event.time);

    let mut map = std::collections::HashMap::<[u8; 32], PartSnapshot>::new();
    for (event_hash, event) in events {
        match &event.content {
            EventContent::PartDefinition(part_definition) => {
                map.insert(
                    event_hash,
                    PartSnapshot {
                        definition_event_hash: event_hash,
                        latest_event_hash: event_hash,
                        account_id: event.account_id.clone(),
                        part_name: part_definition.part_name.to_string(),
                        part_description: part_definition.description.to_string(),
                        expression: part_definition.expression.clone(),
                        updated_at: event.time,
                        has_definition: true,
                    },
                );
            }
            EventContent::PartUpdate(part_update) => {
                let entry = map
                    .entry(part_update.part_definition_event_hash)
                    .or_insert_with(|| PartSnapshot {
                        definition_event_hash: part_update.part_definition_event_hash,
                        latest_event_hash: event_hash,
                        account_id: event.account_id.clone(),
                        part_name: String::new(),
                        part_description: String::new(),
                        expression: part_update.expression.clone(),
                        updated_at: event.time,
                        has_definition: false,
                    });
                entry.latest_event_hash = event_hash;
                entry.account_id = event.account_id.clone();
                entry.part_name = part_update.part_name.to_string();
                entry.part_description = part_update.part_description.to_string();
                entry.expression = part_update.expression.clone();
                entry.updated_at = event.time;
            }
            _ => {}
        }
    }

    let mut snapshots = map.into_values().collect::<Vec<PartSnapshot>>();
    snapshots.sort_by(|a, b| b.updated_at.cmp(&a.updated_at));
    snapshots
}

pub fn find_part_snapshot(state: &AppState, definition_event_hash: &[u8; 32]) -> Option<PartSnapshot> {
    collect_part_snapshots(state)
        .into_iter()
        .find(|snapshot| &snapshot.definition_event_hash == definition_event_hash)
}

pub fn collect_related_part_events(
    state: &AppState,
    definition_event_hash: &[u8; 32],
) -> Vec<([u8; 32], Event)> {
    let mut events = state
        .created_account_events
        .iter()
        .filter_map(|(hash, event_result)| {
            let (_, event) = event_result.as_ref().ok()?;
            let is_related = match &event.content {
                EventContent::PartDefinition(_) => hash == definition_event_hash,
                EventContent::PartUpdate(part_update) => {
                    &part_update.part_definition_event_hash == definition_event_hash
                }
                _ => false,
            };
            if is_related {
                Some((*hash, event.clone()))
            } else {
                None
            }
        })
        .collect::<Vec<([u8; 32], Event)>>();
    events.sort_by(|(_, a), (_, b)| b.time.cmp(&a.time));
    events
}
