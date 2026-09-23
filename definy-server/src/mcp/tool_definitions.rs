use serde_json::json;

use super::protocol::Tool;

pub fn all_tools() -> Vec<Tool> {
    vec![
        Tool {
            name: "list_modules".to_string(),
            description: "List all modules defined in definy with their name, hash, and description.".to_string(),
            input_schema: json!({
                "type": "object",
                "properties": {}
            }),
        },
        Tool {
            name: "list_parts".to_string(),
            description: "List all parts defined in definy. Supports filtering by module or name.".to_string(),
            input_schema: json!({
                "type": "object",
                "properties": {
                    "module": {
                        "type": "string",
                        "description": "Optional module name or module hash to filter by"
                    },
                    "name_filter": {
                        "type": "string",
                        "description": "Optional substring to search within part names"
                    }
                }
            }),
        },
        Tool {
            name: "get_part".to_string(),
            description: "Get detailed information about a part, including its AST expression, source code representation, and evaluated value.".to_string(),
            input_schema: json!({
                "type": "object",
                "properties": {
                    "identifier": {
                        "type": "string",
                        "description": "Part name or definition event hash (base64 or hex)"
                    }
                },
                "required": ["identifier"]
            }),
        },
        Tool {
            name: "eval_expression".to_string(),
            description: "Evaluate a definy expression AST directly. Returns the source code string representation and evaluated runtime Value.".to_string(),
            input_schema: json!({
                "type": "object",
                "properties": {
                    "expression": {
                        "type": "object",
                        "description": "Definy AST Expression in JSON format"
                    }
                },
                "required": ["expression"]
            }),
        },
        Tool {
            name: "eval_part".to_string(),
            description: "Evaluate the expression of a specified part and return its evaluated value and source code.".to_string(),
            input_schema: json!({
                "type": "object",
                "properties": {
                    "identifier": {
                        "type": "string",
                        "description": "Part name or definition event hash"
                    }
                },
                "required": ["identifier"]
            }),
        },
        Tool {
            name: "create_module".to_string(),
            description: "Create a new module in definy signed with the AI agent key.".to_string(),
            input_schema: json!({
                "type": "object",
                "properties": {
                    "name": {
                        "type": "string",
                        "description": "Name of the new module"
                    },
                    "description": {
                        "type": "string",
                        "description": "Description of the module"
                    }
                },
                "required": ["name", "description"]
            }),
        },
        Tool {
            name: "create_part".to_string(),
            description: "Create a new part (function, constant, type, etc.) in definy signed with the AI agent key.".to_string(),
            input_schema: json!({
                "type": "object",
                "properties": {
                    "module": {
                        "type": "string",
                        "description": "Module name or module event hash where this part belongs"
                    },
                    "name": {
                        "type": "string",
                        "description": "Name of the new part"
                    },
                    "description": {
                        "type": "string",
                        "description": "Description of the new part"
                    },
                    "part_type": {
                        "description": "Optional part type (e.g. \"Number\", \"String\", \"Boolean\", or type AST object)",
                        "type": ["string", "object", "null"]
                    },
                    "expression": {
                        "type": "object",
                        "description": "Definy AST Expression in JSON format"
                    }
                },
                "required": ["module", "name", "description", "expression"]
            }),
        },
        Tool {
            name: "update_part".to_string(),
            description: "Update an existing part in definy signed with the AI agent key.".to_string(),
            input_schema: json!({
                "type": "object",
                "properties": {
                    "part_identifier": {
                        "type": "string",
                        "description": "Part name or definition event hash of the part to update"
                    },
                    "name": {
                        "type": "string",
                        "description": "Optional new name for the part"
                    },
                    "description": {
                        "type": "string",
                        "description": "Optional new description for the part"
                    },
                    "expression": {
                        "type": "object",
                        "description": "Optional new definy AST Expression"
                    }
                },
                "required": ["part_identifier"]
            }),
        },
        Tool {
            name: "list_events".to_string(),
            description: "List recent raw events from the definy event store.".to_string(),
            input_schema: json!({
                "type": "object",
                "properties": {
                    "limit": {
                        "type": "integer",
                        "description": "Maximum number of events to return (default: 20)"
                    },
                    "offset": {
                        "type": "integer",
                        "description": "Offset for pagination (default: 0)"
                    }
                }
            }),
        },
        Tool {
            name: "get_event".to_string(),
            description: "Get the full JSON representation of an event by its hash.".to_string(),
            input_schema: json!({
                "type": "object",
                "properties": {
                    "hash": {
                        "type": "string",
                        "description": "Event hash (URL-safe base64 or hex)"
                    }
                },
                "required": ["hash"]
            }),
        },
    ]
}
