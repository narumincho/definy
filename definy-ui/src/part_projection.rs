use definy_event::{
    ContentHash, EventHashId,
    event::{AccountId, Event, EventContent, Expression, derive_module_id, derive_module_part_id},
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
        if let EventContent::ModuleCommit(module_commit) = &event.content {
            let module_id = derive_module_id(&event.account_id, &module_commit.module_name);

            for part in &module_commit.parts {
                let part_id = derive_module_part_id(&module_id, &part.name);
                let content_hash = part
                    .expression
                    .as_ref()
                    .and_then(|e| ContentHash::from_expression(e).ok());

                let entry = map.entry(part_id.clone()).or_insert_with(|| PartSnapshot {
                    definition_event_hash: part_id.clone(),
                    latest_event_hash: event_hash.clone(),
                    account_id: event.account_id.clone(),
                    part_name: part.name.to_string(),
                    part_type: part.part_type.clone(),
                    part_description: part.description.clone(),
                    content_hash: content_hash.clone(),
                    expression: part.expression.clone(),
                    module_definition_event_hash: module_id.clone(),
                    updated_at: event.time,
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
                entry.module_definition_event_hash = module_id.clone();
                entry.updated_at = event.time;
            }
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
    let mut sorted_events = state
        .event_cache
        .iter()
        .filter_map(|(hash, event_result)| {
            let (_, event) = event_result.as_ref().ok()?;
            Some((hash.clone(), event.clone()))
        })
        .collect::<Vec<(EventHashId, Event)>>();
    sorted_events.sort_by_key(|(_, event)| event.time);

    let mut related = Vec::new();
    for (event_hash, event) in sorted_events {
        if let EventContent::ModuleCommit(module_commit) = &event.content {
            let module_id = derive_module_id(&event.account_id, &module_commit.module_name);

            let contains_part = module_commit.parts.iter().any(|p| {
                let pid = derive_module_part_id(&module_id, &p.name);
                &pid == definition_event_hash
            });
            if contains_part {
                related.push((event_hash, event));
            }
        }
    }
    related.reverse();
    related
}

#[cfg(test)]
mod tests {
    use super::*;
    use definy_event::event::*;

    #[test]
    fn test_part_snapshots_with_multiple_parts_in_same_commit() {
        let dummy_key = ed25519_dalek::VerifyingKey::from_bytes(&[0; 32]).unwrap();
        let dummy_account = AccountId(dummy_key);
        let commit_hash = definy_event::EventHashId::from_bytes(&[51u8; 32]);
        let dummy_sig = ed25519_dalek::Signature::from_bytes(&[0u8; 64]);

        let add_ten_expr = Expression::Function(FunctionExpression {
            parameter_id: 1,
            parameter_name: "x".into(),
            body: Box::new(Expression::Add(AddExpression {
                left: Box::new(Expression::Variable(VariableExpression { variable_id: 1 })),
                right: Box::new(Expression::Number(NumberExpression { value: 10 })),
            })),
        });
        let add_ten_content_hash =
            definy_event::ContentHash::from_expression(&add_ten_expr).unwrap();

        let commit_event = Event {
            account_id: dummy_account,
            time: chrono::DateTime::UNIX_EPOCH,
            content: EventContent::ModuleCommit(ModuleCommitEvent {
                module_name: "math".into(),
                module_description: "".into(),
                parent_commit_hash: None,
                message: "Initial commit with math functions".into(),
                parts: vec![
                    ModulePartEntry {
                        name: "add_ten".into(),
                        part_type: Some(PartType::Function {
                            parameter: Box::new(PartType::Number),
                            return_type: Box::new(PartType::Number),
                        }),
                        description: Description::Plain("adds 10 to input".into()),
                        content_hash: Some(add_ten_content_hash.clone()),
                        expression: Some(add_ten_expr),
                    },
                    ModulePartEntry {
                        name: "forty_two".into(),
                        part_type: Some(PartType::Number),
                        description: Description::Plain("the answer".into()),
                        content_hash: None,
                        expression: Some(Expression::Number(NumberExpression { value: 42 })),
                    },
                ],
            }),
        };

        let mut state = AppState::default();
        state
            .event_cache
            .insert(commit_hash, Ok((dummy_sig, commit_event)));

        let snapshots = collect_part_snapshots(&state);
        assert_eq!(snapshots.len(), 2);
        let s_add_ten = snapshots.iter().find(|s| s.part_name == "add_ten").unwrap();
        let s_forty_two = snapshots
            .iter()
            .find(|s| s.part_name == "forty_two")
            .unwrap();

        assert_eq!(s_add_ten.content_hash, Some(add_ten_content_hash));
        assert_eq!(
            s_forty_two.content_hash,
            Some(
                definy_event::ContentHash::from_expression(&Expression::Number(NumberExpression {
                    value: 42
                }))
                .unwrap()
            )
        );
    }
}
