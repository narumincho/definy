use definy_event::event::{Event, EventContent};

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
        EventContent::ModuleCommit(module_commit_event) => {
            let action = if module_commit_event.parent_commit_hash.is_none() {
                language.label("Created module", "モジュール作成", "Modulo kreita")
            } else {
                language.label("Committed module", "モジュールコミット", "Modulo enmetita")
            };
            format!(
                "{} {}: {} ({} parts)",
                action,
                module_commit_event.module_name,
                module_commit_event.message,
                module_commit_event.parts.len()
            )
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
        EventContent::ModuleCommit(module_commit) => {
            format!(
                "{} {}: {}",
                language.label("ModuleCommit:", "モジュールコミット:", "Modulo-enmeto:"),
                module_commit.module_name,
                module_commit.message
            )
        }
    }
}
