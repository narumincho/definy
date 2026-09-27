use definy_event::{
    EventHashId,
    event::{AccountId, Event, EventContent, derive_module_id},
};

use crate::AppState;

#[derive(Clone, PartialEq)]
pub struct ModuleSnapshot {
    pub definition_event_hash: EventHashId,
    pub latest_event_hash: EventHashId,
    pub account_id: AccountId,
    pub module_name: String,
    pub module_description: definy_event::event::Description,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

impl ModuleSnapshot {
    pub fn description_for(&self, language: crate::language::Language) -> String {
        self.module_description
            .to_display_string(language.to_code())
    }
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
        if let EventContent::ModuleCommit(module_commit) = &event.content {
            let module_id = derive_module_id(&event.account_id, &module_commit.module_name);

            let entry = map
                .entry(module_id.clone())
                .or_insert_with(|| ModuleSnapshot {
                    definition_event_hash: module_id.clone(),
                    latest_event_hash: event_hash.clone(),
                    account_id: event.account_id.clone(),
                    module_name: module_commit.module_name.to_string(),
                    module_description: module_commit.module_description.clone(),
                    updated_at: event.time,
                });
            entry.latest_event_hash = event_hash.clone();
            entry.account_id = event.account_id.clone();
            entry.module_name = module_commit.module_name.to_string();
            entry.module_description = module_commit.module_description.clone();
            entry.updated_at = event.time;
        }
    }

    let mut snapshots = map.into_values().collect::<Vec<ModuleSnapshot>>();
    snapshots.sort_by_key(|b| std::cmp::Reverse(b.updated_at));
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
    find_module_snapshot(state, definition_event_hash).map(|m| m.module_name)
}
