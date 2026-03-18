use definy_event::{
    EventHashId,
    event::{AccountId, Event, EventContent},
};

use crate::AppState;

#[derive(Clone)]
pub struct ModuleSnapshot {
    pub definition_event_hash: EventHashId,
    pub latest_event_hash: EventHashId,
    pub account_id: AccountId,
    pub module_name: String,
    pub module_description: String,
    pub updated_at: chrono::DateTime<chrono::Utc>,
    pub has_definition: bool,
}

pub fn collect_module_snapshots(state: &AppState) -> Vec<ModuleSnapshot> {
    let mut events = state
        .event_cache
        .iter()
        .filter_map(|(hash, event_result)| {
            let (_, event) = event_result.as_ref().ok()?;
            Some((hash.clone(), event.clone()))
        })
        .collect::<Vec<(EventHashId, Event)>>();
    events.sort_by_key(|(_, event)| event.time);

    let mut map = std::collections::HashMap::<EventHashId, ModuleSnapshot>::new();
    for (event_hash, event) in events {
        match &event.content {
            EventContent::ModuleDefinition(module_definition) => {
                map.insert(
                    event_hash.clone(),
                    ModuleSnapshot {
                        definition_event_hash: event_hash.clone(),
                        latest_event_hash: event_hash,
                        account_id: event.account_id.clone(),
                        module_name: module_definition.module_name.to_string(),
                        module_description: module_definition.description.to_string(),
                        updated_at: event.time,
                        has_definition: true,
                    },
                );
            }
            EventContent::ModuleUpdate(module_update) => {
                let entry = map
                    .entry(module_update.module_definition_event_hash.clone())
                    .or_insert_with(|| ModuleSnapshot {
                        definition_event_hash: module_update.module_definition_event_hash.clone(),
                        latest_event_hash: event_hash.clone(),
                        account_id: event.account_id.clone(),
                        module_name: String::new(),
                        module_description: String::new(),
                        updated_at: event.time,
                        has_definition: false,
                    });
                entry.latest_event_hash = event_hash.clone();
                entry.account_id = event.account_id.clone();
                entry.module_name = module_update.module_name.to_string();
                entry.module_description = module_update.module_description.to_string();
                entry.updated_at = event.time;
            }
            _ => {}
        }
    }

    let mut snapshots = map.into_values().collect::<Vec<ModuleSnapshot>>();
    snapshots.sort_by(|a, b| b.updated_at.cmp(&a.updated_at));
    snapshots
}

pub fn find_module_snapshot(
    state: &AppState,
    definition_event_hash: &EventHashId,
) -> Option<ModuleSnapshot> {
    collect_module_snapshots(state)
        .into_iter()
        .find(|snapshot| &snapshot.definition_event_hash == definition_event_hash)
}

pub fn resolve_module_name(
    state: &AppState,
    definition_event_hash: &EventHashId,
) -> Option<String> {
    let mut events = state
        .event_cache
        .iter()
        .filter_map(|(hash, event_result)| {
            let (_, event) = event_result.as_ref().ok()?;
            Some((hash, event))
        })
        .collect::<Vec<(&EventHashId, &definy_event::event::Event)>>();
    events.sort_by_key(|(_, event)| event.time);

    let mut name = None::<String>;
    for (hash, event) in events {
        match &event.content {
            definy_event::event::EventContent::ModuleDefinition(module_definition)
                if hash == definition_event_hash =>
            {
                name = Some(module_definition.module_name.to_string());
            }
            definy_event::event::EventContent::ModuleUpdate(module_update)
                if &module_update.module_definition_event_hash == definition_event_hash =>
            {
                if name.is_some() {
                    name = Some(module_update.module_name.to_string());
                }
            }
            _ => {}
        }
    }
    name
}
