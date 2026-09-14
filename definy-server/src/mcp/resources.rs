use definy_ui::module_projection::collect_module_snapshots;
use definy_ui::part_projection::collect_part_snapshots;
use serde_json::json;
use surrealdb::Surreal;
use surrealdb::engine::any::Any;

use super::protocol::{Resource, ResourceContent};
use super::tools::build_ui_app_state;

pub async fn list_resources(db: &Surreal<Any>) -> Vec<Resource> {
    let mut resources = vec![
        Resource {
            uri: "definy://modules".to_string(),
            name: "Modules Overview".to_string(),
            description: Some("Overview of all modules defined in definy".to_string()),
            mime_type: Some("application/json".to_string()),
        },
        Resource {
            uri: "definy://parts".to_string(),
            name: "Parts Overview".to_string(),
            description: Some("Overview of all parts defined in definy".to_string()),
            mime_type: Some("application/json".to_string()),
        },
    ];

    if let Ok(state) = build_ui_app_state(db).await {
        let parts = collect_part_snapshots(&state);
        for p in parts {
            resources.push(Resource {
                uri: format!("definy://parts/{}", p.definition_event_hash),
                name: format!("Part: {}", p.part_name),
                description: Some(p.description_for(definy_ui::language::Language::English)),
                mime_type: Some("text/plain".to_string()),
            });
        }
    }

    resources
}

pub async fn read_resource(uri: &str, db: &Surreal<Any>) -> Result<ResourceContent, String> {
    let state = build_ui_app_state(db).await?;

    if uri == "definy://modules" {
        let modules = collect_module_snapshots(&state);
        let list = modules
            .into_iter()
            .map(|m| {
                json!({
                    "hash": m.definition_event_hash.to_string(),
                    "name": m.module_name,
                    "description": m.description_for(definy_ui::language::Language::English),
                })
            })
            .collect::<Vec<_>>();
        return Ok(ResourceContent {
            uri: uri.to_string(),
            mime_type: Some("application/json".to_string()),
            text: serde_json::to_string_pretty(&list).unwrap(),
        });
    }

    if uri == "definy://parts" {
        let parts = collect_part_snapshots(&state);
        let list = parts
            .into_iter()
            .map(|p| {
                json!({
                    "hash": p.definition_event_hash.to_string(),
                    "name": p.part_name,
                    "description": p.description_for(definy_ui::language::Language::English),
                })
            })
            .collect::<Vec<_>>();
        return Ok(ResourceContent {
            uri: uri.to_string(),
            mime_type: Some("application/json".to_string()),
            text: serde_json::to_string_pretty(&list).unwrap(),
        });
    }

    if let Some(ident) = uri.strip_prefix("definy://parts/") {
        let parts = collect_part_snapshots(&state);
        if let Some(p) = parts.into_iter().find(|p| {
            p.part_name == ident
                || p.definition_event_hash.to_string() == ident
                || p.latest_event_hash.to_string() == ident
        }) {
            let source = p
                .expression
                .as_ref()
                .map(definy_ui::expression_eval::expression_to_source)
                .unwrap_or_else(|| "<no expression>".to_string());
            let text = format!(
                "Part: {}\nHash: {}\nDescription: {}\n\nSource:\n{}",
                p.part_name,
                p.definition_event_hash,
                p.description_for(definy_ui::language::Language::English),
                source
            );
            return Ok(ResourceContent {
                uri: uri.to_string(),
                mime_type: Some("text/plain".to_string()),
                text,
            });
        }
    }

    Err(format!("Resource not found: {}", uri))
}
