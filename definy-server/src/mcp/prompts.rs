use serde_json::Value;

use super::protocol::{Prompt, PromptArgument, PromptMessage, ToolContent};

pub fn all_prompts() -> Vec<Prompt> {
    vec![
        Prompt {
            name: "explain_part".to_string(),
            description: Some(
                "Explain the structure, type, and evaluation of a definy part".to_string(),
            ),
            arguments: Some(vec![PromptArgument {
                name: "part_name".to_string(),
                description: Some("Name of the part to explain".to_string()),
                required: Some(true),
            }]),
        },
        Prompt {
            name: "create_function".to_string(),
            description: Some(
                "Guide on how to construct a new function part using definy AST".to_string(),
            ),
            arguments: Some(vec![PromptArgument {
                name: "function_name".to_string(),
                description: Some("Name of the proposed function".to_string()),
                required: Some(true),
            }]),
        },
    ]
}

pub fn get_prompt(
    name: &str,
    arguments: Option<Value>,
) -> Result<(Option<String>, Vec<PromptMessage>), String> {
    match name {
        "explain_part" => {
            let part_name = arguments
                .as_ref()
                .and_then(|a| a.get("part_name"))
                .and_then(|v| v.as_str())
                .unwrap_or("example");
            let text = format!(
                "Please inspect and explain the definy part '{}'. Use the 'get_part' or 'eval_part' tool to check its definition and behavior.",
                part_name
            );
            Ok((
                Some(format!("Explain definy part '{}'", part_name)),
                vec![PromptMessage {
                    role: "user".to_string(),
                    content: ToolContent::Text { text },
                }],
            ))
        }
        "create_function" => {
            let func_name = arguments
                .as_ref()
                .and_then(|a| a.get("function_name"))
                .and_then(|v| v.as_str())
                .unwrap_or("my_func");
            let text = format!(
                "I want to create a new function part named '{}' in definy. Please help define its parameter, body expression AST, and call 'create_part' to save it.",
                func_name
            );
            Ok((
                Some(format!("Create function '{}' guide", func_name)),
                vec![PromptMessage {
                    role: "user".to_string(),
                    content: ToolContent::Text { text },
                }],
            ))
        }
        _ => Err(format!("Unknown prompt: {}", name)),
    }
}
