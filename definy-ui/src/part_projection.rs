use definy_event::{
    EventHashId,
    event::{AccountId, Event, EventContent, Expression},
};

use crate::AppState;

#[derive(Clone)]
pub struct PartSnapshot {
    pub definition_event_hash: EventHashId,
    pub latest_event_hash: EventHashId,
    pub account_id: AccountId,
    pub part_name: String,
    pub part_type: Option<definy_event::event::PartType>,
    pub part_description: String,
    pub expression: Expression,
    pub module_definition_event_hash: Option<EventHashId>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
    pub has_definition: bool,
}

pub fn collect_part_snapshots(state: &AppState) -> Vec<PartSnapshot> {
    let mut events = state
        .event_cache
        .iter()
        .filter_map(|(hash, event_result)| {
            let (_, event) = event_result.as_ref().ok()?;
            Some((hash.clone(), event.clone()))
        })
        .collect::<Vec<(EventHashId, Event)>>();
    events.sort_by_key(|(_, event)| event.time);

    let mut map = std::collections::HashMap::<EventHashId, PartSnapshot>::new();
    for (event_hash, event) in events {
        match &event.content {
            EventContent::PartDefinition(part_definition) => {
                map.insert(
                    event_hash.clone(),
                    PartSnapshot {
                        definition_event_hash: event_hash.clone(),
                        latest_event_hash: event_hash,
                        account_id: event.account_id.clone(),
                        part_name: part_definition.part_name.to_string(),
                        part_type: part_definition.part_type.clone(),
                        part_description: part_definition.description.to_string(),
                        expression: part_definition.expression.clone(),
                        module_definition_event_hash: part_definition
                            .module_definition_event_hash
                            .clone(),
                        updated_at: event.time,
                        has_definition: true,
                    },
                );
            }
            EventContent::PartUpdate(part_update) => {
                let entry = map
                    .entry(part_update.part_definition_event_hash.clone())
                    .or_insert_with(|| PartSnapshot {
                        definition_event_hash: part_update.part_definition_event_hash.clone(),
                        latest_event_hash: event_hash.clone(),
                        account_id: event.account_id.clone(),
                        part_name: String::new(),
                        part_type: None,
                        part_description: String::new(),
                        expression: part_update.expression.clone(),
                        module_definition_event_hash: part_update
                            .module_definition_event_hash
                            .clone(),
                        updated_at: event.time,
                        has_definition: false,
                    });
                entry.latest_event_hash = event_hash.clone();
                entry.account_id = event.account_id.clone();
                entry.part_name = part_update.part_name.to_string();
                entry.part_description = part_update.part_description.to_string();
                entry.expression = part_update.expression.clone();
                if part_update.module_definition_event_hash.is_some() {
                    entry.module_definition_event_hash =
                        part_update.module_definition_event_hash.clone();
                }
                entry.updated_at = event.time;
            }
            _ => {}
        }
    }

    let mut snapshots = map.into_values().collect::<Vec<PartSnapshot>>();
    snapshots.sort_by(|a, b| b.updated_at.cmp(&a.updated_at));
    snapshots
}

pub fn find_part_snapshot(
    state: &AppState,
    definition_event_hash: &EventHashId,
) -> Option<PartSnapshot> {
    collect_part_snapshots(state)
        .into_iter()
        .find(|snapshot| &snapshot.definition_event_hash == definition_event_hash)
}

pub fn collect_related_part_events(
    state: &AppState,
    definition_event_hash: &EventHashId,
) -> Vec<(EventHashId, Event)> {
    let mut events = state
        .event_cache
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
                Some((hash.clone(), event.clone()))
            } else {
                None
            }
        })
        .collect::<Vec<(EventHashId, Event)>>();
    events.sort_by(|(_, a), (_, b)| b.time.cmp(&a.time));
    events
}
