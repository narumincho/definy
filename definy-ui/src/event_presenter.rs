use definy_event::event::{Event, EventContent};

use crate::expression_eval::expression_to_source;

pub fn event_summary_text(event: &Event) -> String {
    match &event.content {
        EventContent::CreateAccount(create_account_event) => {
            format!("Account created: {}", create_account_event.account_name)
        }
        EventContent::ChangeProfile(change_profile_event) => {
            format!("Profile changed: {}", change_profile_event.account_name)
        }
        EventContent::PartDefinition(part_definition_event) => format!(
            "{} = {}{}",
            part_definition_event.part_name,
            expression_to_source(&part_definition_event.expression),
            if part_definition_event.description.is_empty() {
                String::new()
            } else {
                format!(" - {}", part_definition_event.description)
            }
        ),
        EventContent::PartUpdate(part_update_event) => format!(
            "Part updated: {}{} | {}",
            part_update_event.part_name,
            if part_update_event.part_description.is_empty() {
                String::new()
            } else {
                format!(" - {}", part_update_event.part_description)
            },
            expression_to_source(&part_update_event.expression)
        ),
        EventContent::ModuleDefinition(module_definition_event) => {
            if module_definition_event.description.is_empty() {
                format!("Module created: {}", module_definition_event.module_name)
            } else {
                format!(
                    "Module created: {} - {}",
                    module_definition_event.module_name, module_definition_event.description
                )
            }
        }
        EventContent::ModuleUpdate(module_update_event) => {
            if module_update_event.module_description.is_empty() {
                format!("Module updated: {}", module_update_event.module_name)
            } else {
                format!(
                    "Module updated: {} - {}",
                    module_update_event.module_name, module_update_event.module_description
                )
            }
        }
    }
}

pub fn event_kind_label(event: &Event) -> String {
    match &event.content {
        EventContent::CreateAccount(_) => "CreateAccount".to_string(),
        EventContent::ChangeProfile(_) => "ChangeProfile".to_string(),
        EventContent::PartDefinition(part_definition) => {
            format!("PartDefinition: {}", part_definition.part_name)
        }
        EventContent::PartUpdate(part_update) => format!("PartUpdate: {}", part_update.part_name),
        EventContent::ModuleDefinition(module_definition) => {
            format!("ModuleDefinition: {}", module_definition.module_name)
        }
        EventContent::ModuleUpdate(module_update) => {
            format!("ModuleUpdate: {}", module_update.module_name)
        }
    }
}
