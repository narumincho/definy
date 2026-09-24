use std::net::SocketAddr;
use std::str::FromStr;

use definy_event::{
    EventHashId,
    event::{
        AccountId, Description, Event, EventContent, Expression, ModuleDefinitionEvent,
        PartDefinitionEvent, PartType, PartUpdateEvent,
    },
};
use definy_ui::AppState as UiAppState;
use definy_ui::expression_eval::{evaluate_expression, expression_to_source};
use definy_ui::module_projection::collect_module_snapshots;
use definy_ui::part_projection::{PartSnapshot, collect_part_snapshots};
use ed25519_dalek::SigningKey;
use serde_json::{Value, json};
use surrealdb::Surreal;
use surrealdb::engine::any::Any;

use super::protocol::ToolCallResult;
use crate::db::{get_event, get_events, save_event};

pub const AI_AGENT_KEY_SEED: [u8; 32] = *b"definy-mcp-ai-agent-key-2026\0\0\0\0";

fn get_signing_key_and_account() -> (SigningKey, AccountId) {
    let signing_key = SigningKey::from_bytes(&AI_AGENT_KEY_SEED);
    let account_id = AccountId(signing_key.verifying_key());
    (signing_key, account_id)
}

pub async fn build_ui_app_state(db: &Surreal<Any>) -> Result<UiAppState, String> {
    let event_binaries = get_events(db, None, Some(1000), Some(0))
        .await
        .map_err(|e| format!("Failed to get events: {:?}", e))?;

    let events = event_binaries
        .iter()
        .map(|bin| {
            let hash = EventHashId::from_bytes(bin.as_slice());
            (hash, definy_event::verify_and_deserialize(bin.as_slice()))
        })
        .collect::<Vec<_>>();

    Ok(definy_ui::build_initial_state(
        events, false, false, None, None, true,
    ))
}

pub use super::tool_definitions::all_tools;

pub async fn handle_tool_call(
    name: &str,
    arguments: Option<Value>,
    db: &Surreal<Any>,
) -> ToolCallResult {
    let args = arguments.unwrap_or_else(|| json!({}));

    match name {
        "list_modules" => tool_list_modules(db).await,
        "list_parts" => tool_list_parts(args, db).await,
        "get_part" => tool_get_part(args, db).await,
        "eval_expression" => tool_eval_expression(args, db).await,
        "eval_part" => tool_eval_part(args, db).await,
        "create_module" => tool_create_module(args, db).await,
        "create_part" => tool_create_part(args, db).await,
        "update_part" => tool_update_part(args, db).await,
        "list_events" => tool_list_events(args, db).await,
        "get_event" => tool_get_event(args, db).await,
        _ => ToolCallResult::error(format!("Unknown tool: {}", name)),
    }
}

async fn tool_list_modules(db: &Surreal<Any>) -> ToolCallResult {
    let state = match build_ui_app_state(db).await {
        Ok(s) => s,
        Err(e) => return ToolCallResult::error(e),
    };
    let modules = collect_module_snapshots(&state);
    let result = modules
        .into_iter()
        .map(|m| {
            json!({
                "hash": m.definition_event_hash.to_string(),
                "name": m.module_name,
                "description": m.description_for(definy_ui::language::Language::English),
                "updated_at": m.updated_at.to_rfc3339()
            })
        })
        .collect::<Vec<_>>();

    ToolCallResult::text(serde_json::to_string_pretty(&result).unwrap())
}

async fn tool_list_parts(args: Value, db: &Surreal<Any>) -> ToolCallResult {
    let state = match build_ui_app_state(db).await {
        Ok(s) => s,
        Err(e) => return ToolCallResult::error(e),
    };
    let module_filter = args.get("module").and_then(|v| v.as_str());
    let name_filter = args.get("name_filter").and_then(|v| v.as_str());

    let modules = collect_module_snapshots(&state);
    let parts = collect_part_snapshots(&state);

    let filtered = parts
        .into_iter()
        .filter(|p| {
            if let Some(nf) = name_filter
                && !p.part_name.to_lowercase().contains(&nf.to_lowercase())
            {
                return false;
            }
            if let Some(mf) = module_filter {
                let mod_match = modules.iter().any(|m| {
                    (m.module_name == mf || m.definition_event_hash.to_string() == mf)
                        && m.definition_event_hash == p.module_definition_event_hash
                });
                if !mod_match && p.module_definition_event_hash.to_string() != mf {
                    return false;
                }
            }
            true
        })
        .map(|p| {
            let mod_name = modules
                .iter()
                .find(|m| m.definition_event_hash == p.module_definition_event_hash)
                .map(|m| m.module_name.as_str())
                .unwrap_or("unknown");
            json!({
                "definition_event_hash": p.definition_event_hash.to_string(),
                "name": p.part_name,
                "module_name": mod_name,
                "module_hash": p.module_definition_event_hash.to_string(),
                "part_type": p.part_type.clone().map(crate_part_type_summary),
                "description": p.description_for(definy_ui::language::Language::English),
                "has_expression": p.expression.is_some()
            })
        })
        .collect::<Vec<_>>();

    ToolCallResult::text(serde_json::to_string_pretty(&filtered).unwrap())
}

fn crate_part_type_summary(pt: PartType) -> Value {
    match pt {
        PartType::Number => json!("number"),
        PartType::String => json!("string"),
        PartType::Boolean => json!("boolean"),
        PartType::Type => json!("type"),
        PartType::TypePart(h) => json!({ "type-part": h.to_string() }),
        PartType::List(sub) => json!({ "list": crate_part_type_summary(*sub) }),
        PartType::Function {
            parameter,
            return_type,
        } => json!({
            "function": {
                "parameter": crate_part_type_summary(*parameter),
                "return": crate_part_type_summary(*return_type)
            }
        }),
        PartType::Record(fields) => {
            let fields_json: serde_json::Value = fields
                .into_iter()
                .map(|f| (f.key.to_string(), crate_part_type_summary(*f.value)))
                .collect::<serde_json::Map<String, serde_json::Value>>()
                .into();
            json!({ "record": fields_json })
        }
        PartType::Union(variants) => {
            let vars = variants
                .into_iter()
                .map(|v| {
                    json!({
                        "tag": v.tag,
                        "payload": v.payload.map(|p| crate_part_type_summary(*p))
                    })
                })
                .collect::<Vec<_>>();
            json!({ "Union": vars })
        }
    }
}

fn find_part(state: &UiAppState, identifier: &str) -> Option<PartSnapshot> {
    let parts = collect_part_snapshots(state);
    parts.into_iter().find(|p| {
        p.part_name == identifier
            || p.definition_event_hash.to_string() == identifier
            || p.latest_event_hash.to_string() == identifier
    })
}

async fn tool_get_part(args: Value, db: &Surreal<Any>) -> ToolCallResult {
    let ident = match args.get("identifier").and_then(|v| v.as_str()) {
        Some(s) => s,
        None => return ToolCallResult::error("Missing 'identifier' argument"),
    };
    let state = match build_ui_app_state(db).await {
        Ok(s) => s,
        Err(e) => return ToolCallResult::error(e),
    };
    let part = match find_part(&state, ident) {
        Some(p) => p,
        None => return ToolCallResult::error(format!("Part '{}' not found", ident)),
    };

    let modules = collect_module_snapshots(&state);
    let mod_name = modules
        .iter()
        .find(|m| m.definition_event_hash == part.module_definition_event_hash)
        .map(|m| m.module_name.as_str())
        .unwrap_or("unknown");

    let source = part.expression.as_ref().map(expression_to_source);
    let evaluated = part.expression.as_ref().map(|expr| {
        match evaluate_expression(expr, &state.events_with_hash()) {
            Ok(v) => json!({ "ok": v.to_string() }),
            Err(e) => json!({ "error": format!("{:?}", e) }),
        }
    });

    let res = json!({
        "definition_event_hash": part.definition_event_hash.to_string(),
        "latest_event_hash": part.latest_event_hash.to_string(),
        "name": part.part_name,
        "module_name": mod_name,
        "module_hash": part.module_definition_event_hash.to_string(),
        "part_type": part.part_type.clone().map(crate_part_type_summary),
        "description": part.description_for(definy_ui::language::Language::English),
        "expression_ast": part.expression,
        "source_code": source,
        "evaluated": evaluated,
        "updated_at": part.updated_at.to_rfc3339()
    });

    ToolCallResult::text(serde_json::to_string_pretty(&res).unwrap())
}

async fn tool_eval_expression(args: Value, db: &Surreal<Any>) -> ToolCallResult {
    let expr_val = match args.get("expression") {
        Some(v) => v.clone(),
        None => return ToolCallResult::error("Missing 'expression' argument"),
    };
    let expr: Expression = match serde_json::from_value(expr_val) {
        Ok(e) => e,
        Err(e) => return ToolCallResult::error(format!("Invalid Expression AST: {:?}", e)),
    };

    let state = match build_ui_app_state(db).await {
        Ok(s) => s,
        Err(e) => return ToolCallResult::error(e),
    };

    let source = expression_to_source(&expr);
    let evaluated = match evaluate_expression(&expr, &state.events_with_hash()) {
        Ok(v) => json!({ "status": "success", "value": v.to_string() }),
        Err(e) => json!({ "status": "error", "error": format!("{:?}", e) }),
    };

    let res = json!({
        "source_code": source,
        "evaluated": evaluated
    });

    ToolCallResult::text(serde_json::to_string_pretty(&res).unwrap())
}

async fn tool_eval_part(args: Value, db: &Surreal<Any>) -> ToolCallResult {
    let ident = match args.get("identifier").and_then(|v| v.as_str()) {
        Some(s) => s,
        None => return ToolCallResult::error("Missing 'identifier' argument"),
    };
    let state = match build_ui_app_state(db).await {
        Ok(s) => s,
        Err(e) => return ToolCallResult::error(e),
    };
    let part = match find_part(&state, ident) {
        Some(p) => p,
        None => return ToolCallResult::error(format!("Part '{}' not found", ident)),
    };

    let expr = match &part.expression {
        Some(e) => e,
        None => {
            return ToolCallResult::error(format!("Part '{}' has no expression defined", ident));
        }
    };

    let source = expression_to_source(expr);
    let val = match evaluate_expression(expr, &state.events_with_hash()) {
        Ok(v) => v.to_string(),
        Err(e) => format!("Error: {:?}", e),
    };

    let res = json!({
        "name": part.part_name,
        "definition_event_hash": part.definition_event_hash.to_string(),
        "source_code": source,
        "value": val
    });

    ToolCallResult::text(serde_json::to_string_pretty(&res).unwrap())
}

async fn sign_and_save_ai_event(
    content: EventContent,
    db: &Surreal<Any>,
) -> Result<EventHashId, String> {
    let (signing_key, account_id) = get_signing_key_and_account();
    let event = Event {
        account_id,
        time: chrono::Utc::now(),
        content,
    };
    let binary = definy_event::sign_and_serialize(event.clone(), &signing_key)
        .map_err(|e| format!("Failed to sign event: {:?}", e))?;
    let hash = EventHashId::from_bytes(&binary);
    let dummy_addr: SocketAddr = "127.0.0.1:0".parse().unwrap();
    let (sig, _) = definy_event::verify_and_deserialize(&binary)
        .map_err(|e| format!("Failed to verify event immediately after signing: {:?}", e))?;

    save_event(&event, &sig, &binary, dummy_addr, db)
        .await
        .map_err(|e| format!("Failed to save event to DB: {:?}", e))?;

    Ok(hash)
}

async fn tool_create_module(args: Value, db: &Surreal<Any>) -> ToolCallResult {
    let name = match args.get("name").and_then(|v| v.as_str()) {
        Some(s) => s.to_string(),
        None => return ToolCallResult::error("Missing 'name' argument"),
    };
    if !definy_event::naming::is_valid_name(&name) {
        return ToolCallResult::error(format!(
            "Invalid module name '{}': must be lowercase alphanumeric with hyphens (e.g. 'my-module')",
            name
        ));
    }
    let desc = match args.get("description").and_then(|v| v.as_str()) {
        Some(s) => s.to_string(),
        None => return ToolCallResult::error("Missing 'description' argument"),
    };

    let content = EventContent::ModuleDefinition(ModuleDefinitionEvent {
        module_name: name.clone().into(),
        description: Description::Plain(desc.into()),
    });

    let hash = match sign_and_save_ai_event(content, db).await {
        Ok(h) => h,
        Err(e) => return ToolCallResult::error(e),
    };

    let res = json!({
        "status": "created",
        "module_hash": hash.to_string(),
        "module_name": name
    });
    ToolCallResult::text(serde_json::to_string_pretty(&res).unwrap())
}

async fn tool_create_part(args: Value, db: &Surreal<Any>) -> ToolCallResult {
    let module_ident = match args.get("module").and_then(|v| v.as_str()) {
        Some(s) => s,
        None => return ToolCallResult::error("Missing 'module' argument"),
    };
    let name = match args.get("name").and_then(|v| v.as_str()) {
        Some(s) => s.to_string(),
        None => return ToolCallResult::error("Missing 'name' argument"),
    };
    if !definy_event::naming::is_valid_name(&name) {
        return ToolCallResult::error(format!(
            "Invalid part name '{}': must be lowercase alphanumeric with hyphens (e.g. 'my-part')",
            name
        ));
    }
    let desc = match args.get("description").and_then(|v| v.as_str()) {
        Some(s) => s.to_string(),
        None => return ToolCallResult::error("Missing 'description' argument"),
    };
    let expr_val = match args.get("expression") {
        Some(v) => v.clone(),
        None => return ToolCallResult::error("Missing 'expression' argument"),
    };
    let expression: Expression = match serde_json::from_value(expr_val) {
        Ok(e) => e,
        Err(e) => return ToolCallResult::error(format!("Invalid Expression AST: {:?}", e)),
    };

    let part_type: Option<PartType> = match args.get("part_type") {
        Some(v) if !v.is_null() => serde_json::from_value(v.clone()).ok(),
        _ => None,
    };

    let state = match build_ui_app_state(db).await {
        Ok(s) => s,
        Err(e) => return ToolCallResult::error(e),
    };
    let modules = collect_module_snapshots(&state);
    let module_hash = match modules.iter().find(|m| {
        m.module_name == module_ident || m.definition_event_hash.to_string() == module_ident
    }) {
        Some(m) => m.definition_event_hash.clone(),
        None => {
            if let Ok(h) = EventHashId::from_str(module_ident) {
                h
            } else {
                return ToolCallResult::error(format!("Module '{}' not found", module_ident));
            }
        }
    };

    let content = EventContent::PartDefinition(PartDefinitionEvent {
        part_name: name.clone().into(),
        description: Description::Plain(desc.into()),
        module_definition_event_hash: module_hash,
        part_type,
        expression: Some(expression),
    });

    let hash = match sign_and_save_ai_event(content, db).await {
        Ok(h) => h,
        Err(e) => return ToolCallResult::error(e),
    };

    let res = json!({
        "status": "created",
        "part_definition_hash": hash.to_string(),
        "part_name": name
    });
    ToolCallResult::text(serde_json::to_string_pretty(&res).unwrap())
}

async fn tool_update_part(args: Value, db: &Surreal<Any>) -> ToolCallResult {
    let part_ident = match args.get("part_identifier").and_then(|v| v.as_str()) {
        Some(s) => s,
        None => return ToolCallResult::error("Missing 'part_identifier' argument"),
    };

    let state = match build_ui_app_state(db).await {
        Ok(s) => s,
        Err(e) => return ToolCallResult::error(e),
    };
    let part = match find_part(&state, part_ident) {
        Some(p) => p,
        None => return ToolCallResult::error(format!("Part '{}' not found", part_ident)),
    };

    let name = args.get("name").and_then(|v| v.as_str()).map(String::from);
    if let Some(ref n) = name
        && !definy_event::naming::is_valid_name(n)
    {
        return ToolCallResult::error(format!(
            "Invalid part name '{}': must be lowercase alphanumeric with hyphens (e.g. 'my-part')",
            n
        ));
    }
    let desc = args
        .get("description")
        .and_then(|v| v.as_str())
        .map(|s| Description::Plain(s.to_string().into()));

    let expression: Option<Option<Expression>> = match args.get("expression") {
        Some(v) if !v.is_null() => match serde_json::from_value(v.clone()) {
            Ok(e) => Some(Some(e)),
            Err(e) => return ToolCallResult::error(format!("Invalid Expression AST: {:?}", e)),
        },
        Some(_) => Some(None),
        None => None,
    };

    let part_name: Box<str> = name.unwrap_or_else(|| part.part_name.clone()).into();
    let part_description: Description = desc.unwrap_or_else(|| part.part_description.clone());
    let final_expression: Option<Expression> = if let Some(opt) = expression {
        opt
    } else {
        part.expression.clone()
    };

    let content = EventContent::PartUpdate(PartUpdateEvent {
        part_definition_event_hash: part.definition_event_hash.clone(),
        part_name,
        part_description,
        expression: final_expression,
        module_definition_event_hash: part.module_definition_event_hash.clone(),
    });

    let hash = match sign_and_save_ai_event(content, db).await {
        Ok(h) => h,
        Err(e) => return ToolCallResult::error(e),
    };

    let res = json!({
        "status": "updated",
        "update_event_hash": hash.to_string(),
        "part_definition_hash": part.definition_event_hash.to_string()
    });
    ToolCallResult::text(serde_json::to_string_pretty(&res).unwrap())
}

async fn tool_list_events(args: Value, db: &Surreal<Any>) -> ToolCallResult {
    let limit = args
        .get("limit")
        .and_then(|v| v.as_u64())
        .unwrap_or(20)
        .min(100) as usize;
    let offset = args.get("offset").and_then(|v| v.as_u64()).unwrap_or(0) as usize;

    let event_binaries = match get_events(db, None, Some(limit), Some(offset)).await {
        Ok(e) => e,
        Err(e) => return ToolCallResult::error(format!("Failed to fetch events: {:?}", e)),
    };

    let list = event_binaries
        .iter()
        .map(|bin| {
            let hash = EventHashId::from_bytes(bin.as_slice());
            match definy_event::verify_and_deserialize(bin.as_slice()) {
                Ok((_, ev)) => {
                    let ev_type = strum::IntoDiscriminant::discriminant(&ev.content);
                    json!({
                        "hash": hash.to_string(),
                        "type": format!("{:?}", ev_type),
                        "account_id": hex::encode(ev.account_id.0.as_bytes()),
                        "time": ev.time.to_rfc3339(),
                    })
                }
                Err(_) => json!({ "hash": hash.to_string(), "corrupted": true }),
            }
        })
        .collect::<Vec<_>>();

    ToolCallResult::text(serde_json::to_string_pretty(&list).unwrap())
}

async fn tool_get_event(args: Value, db: &Surreal<Any>) -> ToolCallResult {
    let hash_str = match args.get("hash").and_then(|v| v.as_str()) {
        Some(s) => s,
        None => return ToolCallResult::error("Missing 'hash' argument"),
    };

    let hash_bytes = match EventHashId::from_str(hash_str) {
        Ok(h) => h.as_ref().to_vec(),
        Err(_) => match hex::decode(hash_str) {
            Ok(b) => b,
            Err(_) => return ToolCallResult::error("Invalid hash format (must be base64 or hex)"),
        },
    };

    let bin = match get_event(db, &hash_bytes).await {
        Ok(Some(b)) => b,
        Ok(None) => return ToolCallResult::error(format!("Event '{}' not found", hash_str)),
        Err(e) => return ToolCallResult::error(format!("DB error: {:?}", e)),
    };

    match definy_event::verify_and_deserialize(&bin) {
        Ok((sig, ev)) => {
            let res = json!({
                "hash": EventHashId::from_bytes(&bin).to_string(),
                "signature": hex::encode(sig.to_bytes()),
                "account_id": hex::encode(ev.account_id.0.as_bytes()),
                "time": ev.time.to_rfc3339(),
                "content": ev.content
            });
            ToolCallResult::text(serde_json::to_string_pretty(&res).unwrap())
        }
        Err(e) => ToolCallResult::error(format!("Failed to deserialize event: {:?}", e)),
    }
}
