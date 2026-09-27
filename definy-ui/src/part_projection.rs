use definy_event::{
    ContentHash, EventHashId,
    event::{AccountId, Event, EventContent, Expression},
};

use crate::AppState;

#[derive(Clone, PartialEq)]
pub struct PartSnapshot {
    pub definition_event_hash: EventHashId,
    pub latest_event_hash: EventHashId,
    pub account_id: AccountId,
    pub part_name: String,
    pub part_type: Option<definy_event::event::PartType>,
    pub part_description: definy_event::event::Description,
    pub expression: Option<Expression>,
    pub content_hash: Option<ContentHash>,
    pub module_definition_event_hash: EventHashId,
    pub updated_at: chrono::DateTime<chrono::Utc>,
    pub has_definition: bool,
}

impl PartSnapshot {
    pub fn description_for(&self, language: crate::language::Language) -> String {
        self.part_description.to_display_string(language.to_code())
    }
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
                        part_description: part_definition.description.clone(),
                        content_hash: part_definition
                            .expression
                            .as_ref()
                            .and_then(|e| ContentHash::from_expression(e).ok()),
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
                        part_description: definy_event::event::Description::default(),
                        content_hash: part_update
                            .expression
                            .as_ref()
                            .and_then(|e| ContentHash::from_expression(e).ok()),
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
                entry.part_description = part_update.part_description.clone();
                if part_update.part_type.is_some() {
                    entry.part_type = part_update.part_type.clone();
                }
                if let Some(expr) = part_update.expression.as_ref() {
                    entry.content_hash = ContentHash::from_expression(expr).ok();
                }
                entry.expression = part_update.expression.clone();
                entry.module_definition_event_hash =
                    part_update.module_definition_event_hash.clone();
                entry.updated_at = event.time;
            }
            EventContent::ModuleCommit(module_commit) => {
                for part in &module_commit.parts {
                    let def_hash = map
                        .values()
                        .find(|s| {
                            s.module_definition_event_hash
                                == module_commit.module_definition_event_hash
                                && s.part_name == part.name.as_ref()
                        })
                        .map(|s| s.definition_event_hash.clone())
                        .unwrap_or_else(|| {
                            let mut hasher = <sha2::Sha256 as sha2::Digest>::new();
                            sha2::Digest::update(
                                &mut hasher,
                                module_commit.module_definition_event_hash.as_bytes(),
                            );
                            sha2::Digest::update(&mut hasher, b":part:");
                            sha2::Digest::update(&mut hasher, part.name.as_bytes());
                            let h: [u8; 32] = sha2::Digest::finalize(hasher).into();
                            EventHashId::from_bytes(&h)
                        });

                    let content_hash = part
                        .expression
                        .as_ref()
                        .and_then(|e| ContentHash::from_expression(e).ok());

                    let entry = map.entry(def_hash.clone()).or_insert_with(|| PartSnapshot {
                        definition_event_hash: def_hash.clone(),
                        latest_event_hash: event_hash.clone(),
                        account_id: event.account_id.clone(),
                        part_name: part.name.to_string(),
                        part_type: part.part_type.clone(),
                        part_description: part.description.clone(),
                        content_hash: content_hash.clone(),
                        expression: part.expression.clone(),
                        module_definition_event_hash: module_commit
                            .module_definition_event_hash
                            .clone(),
                        updated_at: event.time,
                        has_definition: true,
                    });
                    entry.latest_event_hash = event_hash.clone();
                    entry.account_id = event.account_id.clone();
                    entry.part_name = part.name.to_string();
                    entry.part_description = part.description.clone();
                    if part.part_type.is_some() {
                        entry.part_type = part.part_type.clone();
                    }
                    entry.expression = part.expression.clone();
                    entry.content_hash = content_hash;
                    entry.module_definition_event_hash =
                        module_commit.module_definition_event_hash.clone();
                    entry.updated_at = event.time;
                    entry.has_definition = true;
                }
            }
            _ => {}
        }
    }

    let mut snapshots = map.into_values().collect::<Vec<PartSnapshot>>();
    snapshots.sort_by_key(|b| std::cmp::Reverse(b.updated_at));
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
    events.sort_by_key(|(_, b)| std::cmp::Reverse(b.time));
    events
}
