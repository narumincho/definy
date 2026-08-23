use definy_event::event::{Event, EventContent};

use crate::expression_eval::expression_to_source;
use crate::language::Language;

pub fn event_summary_text(language: Language, event: &Event) -> String {
    match &event.content {
        EventContent::CreateAccount(create_account_event) => {
            format!(
                "{} {}",
                language.label("Account created:", "アカウント作成:", "Konto kreita:"),
                create_account_event.account_name
            )
        }
        EventContent::ChangeProfile(change_profile_event) => {
            format!(
                "{} {}",
                language.label("Profile changed:", "プロフィール変更:", "Profilo ŝanĝita:"),
                change_profile_event.account_name
            )
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
            "{} {}{} | {}",
            language.label("Part updated:", "パーツ更新:", "Parto ĝisdatigita:"),
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
                format!(
                    "{} {}",
                    language.label("Module created:", "モジュール作成:", "Modulo kreita:"),
                    module_definition_event.module_name
                )
            } else {
                format!(
                    "{} {} - {}",
                    language.label("Module created:", "モジュール作成:", "Modulo kreita:"),
                    module_definition_event.module_name,
                    module_definition_event.description
                )
            }
        }
        EventContent::ModuleUpdate(module_update_event) => {
            if module_update_event.module_description.is_empty() {
                format!(
                    "{} {}",
                    language.label("Module updated:", "モジュール更新:", "Modulo ĝisdatigita:"),
                    module_update_event.module_name
                )
            } else {
                format!(
                    "{} {} - {}",
                    language.label("Module updated:", "モジュール更新:", "Modulo ĝisdatigita:"),
                    module_update_event.module_name,
                    module_update_event.module_description
                )
            }
        }
    }
}

pub fn event_kind_label(language: Language, event: &Event) -> String {
    match &event.content {
        EventContent::CreateAccount(_) => language
            .label("CreateAccount", "アカウント作成", "Konto-kreo")
            .to_string(),
        EventContent::ChangeProfile(_) => language
            .label("ChangeProfile", "プロフィール変更", "Profil-ŝanĝo")
            .to_string(),
        EventContent::PartDefinition(part_definition) => {
            format!(
                "{} {}",
                language.label("PartDefinition:", "パーツ定義:", "Parto-difino:"),
                part_definition.part_name
            )
        }
        EventContent::PartUpdate(part_update) => format!(
            "{} {}",
            language.label("PartUpdate:", "パーツ更新:", "Parto-ĝisdatigo:"),
            part_update.part_name
        ),
        EventContent::ModuleDefinition(module_definition) => {
            format!(
                "{} {}",
                language.label("ModuleDefinition:", "モジュール定義:", "Modulo-difino:"),
                module_definition.module_name
            )
        }
        EventContent::ModuleUpdate(module_update) => {
            format!(
                "{} {}",
                language.label("ModuleUpdate:", "モジュール更新:", "Modulo-ĝisdatigo:"),
                module_update.module_name
            )
        }
    }
}
