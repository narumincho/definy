use std::collections::{HashMap, HashSet};
use std::path::Path;

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct EnumDef {
    pub name: String,
    pub values: Vec<String>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct AttributeDef {
    pub name: String,
    pub type_name: String,
    pub is_readonly: bool,
}

#[derive(Debug, Clone, PartialEq, Eq, Default)]
pub struct InterfaceDef {
    pub name: String,
    pub inherits: Option<String>,
    pub attributes: Vec<AttributeDef>,
    pub includes: Vec<String>,
    pub is_mixin: bool,
}

#[derive(Debug, Clone, Default)]
pub struct IdlDatabase {
    pub interfaces: HashMap<String, InterfaceDef>,
    pub enums: HashMap<String, EnumDef>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ResolvedAttribute {
    pub name: String,
    pub type_name: String,
    pub is_readonly: bool,
    pub enum_values: Option<Vec<String>>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct HtmlElementInfo {
    pub element_name: String,
    pub interface_name: String,
    pub attributes: Vec<ResolvedAttribute>,
}

impl IdlDatabase {
    pub fn parse_file(&mut self, content: &str) -> anyhow::Result<()> {
        let tokens = tokenize(content);
        let mut cursor = 0;

        while cursor < tokens.len() {
            skip_extended_attributes(&tokens, &mut cursor);
            if cursor >= tokens.len() {
                break;
            }

            match tokens[cursor].as_str() {
                "enum" => {
                    cursor += 1;
                    if let Some(enum_def) = parse_enum(&tokens, &mut cursor) {
                        self.enums.insert(enum_def.name.clone(), enum_def);
                    }
                }
                "interface" => {
                    cursor += 1;
                    let mut is_mixin = false;
                    if peek(&tokens, cursor) == Some("mixin") {
                        cursor += 1;
                        is_mixin = true;
                    }
                    if let Some(iface) = parse_interface(&tokens, &mut cursor, is_mixin) {
                        let entry =
                            self.interfaces
                                .entry(iface.name.clone())
                                .or_insert_with(|| InterfaceDef {
                                    name: iface.name.clone(),
                                    is_mixin: iface.is_mixin,
                                    ..Default::default()
                                });
                        if iface.inherits.is_some() {
                            entry.inherits = iface.inherits;
                        }
                        entry.attributes.extend(iface.attributes);
                        entry.includes.extend(iface.includes);
                    }
                }
                "partial" => {
                    cursor += 1;
                    if peek(&tokens, cursor) == Some("interface") {
                        cursor += 1;
                        let mut is_mixin = false;
                        if peek(&tokens, cursor) == Some("mixin") {
                            cursor += 1;
                            is_mixin = true;
                        }
                        if let Some(iface) = parse_interface(&tokens, &mut cursor, is_mixin) {
                            let entry =
                                self.interfaces
                                    .entry(iface.name.clone())
                                    .or_insert_with(|| InterfaceDef {
                                        name: iface.name.clone(),
                                        is_mixin: iface.is_mixin,
                                        ..Default::default()
                                    });
                            entry.attributes.extend(iface.attributes);
                            entry.includes.extend(iface.includes);
                        }
                    } else if peek(&tokens, cursor) == Some("dictionary")
                        || peek(&tokens, cursor) == Some("namespace")
                    {
                        cursor += 1;
                        skip_until_semicolon_or_braces(&tokens, &mut cursor);
                    } else {
                        cursor += 1;
                    }
                }
                "dictionary" | "namespace" | "typedef" | "callback" => {
                    cursor += 1;
                    skip_until_semicolon_or_braces(&tokens, &mut cursor);
                }
                ident if peek(&tokens, cursor + 1) == Some("includes") => {
                    let target = ident.to_string();
                    cursor += 2; // skip target & "includes"
                    if let Some(mixin) = parse_identifier(&tokens, &mut cursor) {
                        if peek(&tokens, cursor) == Some(";") {
                            cursor += 1;
                        }
                        self.interfaces
                            .entry(target.clone())
                            .or_insert_with(|| InterfaceDef {
                                name: target,
                                ..Default::default()
                            })
                            .includes
                            .push(mixin);
                    }
                }
                _ => {
                    cursor += 1;
                }
            }
        }

        Ok(())
    }

    pub fn load_dir(&mut self, dir_path: &Path) -> anyhow::Result<()> {
        for entry in std::fs::read_dir(dir_path)? {
            let entry = entry?;
            let path = entry.path();
            if path.is_file() && path.extension().and_then(|s| s.to_str()) == Some("idl") {
                let content = std::fs::read_to_string(&path)?;
                self.parse_file(&content)?;
            }
        }
        Ok(())
    }

    /// 指定されたインターフェース（およびその継承元、Mixin）のすべての属性を解決します
    pub fn resolve_interface_attributes(&self, interface_name: &str) -> Vec<ResolvedAttribute> {
        let mut attributes_map: HashMap<String, ResolvedAttribute> = HashMap::new();
        let mut visited_interfaces = HashSet::new();

        self.collect_interface_attributes(
            interface_name,
            &mut attributes_map,
            &mut visited_interfaces,
        );

        let mut result: Vec<_> = attributes_map.into_values().collect();
        result.sort_by(|a, b| a.name.cmp(&b.name));
        result
    }

    fn collect_interface_attributes(
        &self,
        interface_name: &str,
        attributes_map: &mut HashMap<String, ResolvedAttribute>,
        visited: &mut HashSet<String>,
    ) {
        if !visited.insert(interface_name.to_string()) {
            return;
        }

        if let Some(iface) = self.interfaces.get(interface_name) {
            // 直下の属性を収集
            for attr in &iface.attributes {
                let mut enum_vals = self.enums.get(&attr.type_name).map(|e| e.values.clone());

                // WebIDL の enum 型が見つからない場合、知名度の高い HTML 属性キーワートのフォールバックを検索
                if enum_vals.is_none() {
                    enum_vals = get_well_known_html_attribute_enums(interface_name, &attr.name);
                }

                attributes_map
                    .entry(attr.name.clone())
                    .or_insert(ResolvedAttribute {
                        name: attr.name.clone(),
                        type_name: attr.type_name.clone(),
                        is_readonly: attr.is_readonly,
                        enum_values: enum_vals,
                    });
            }

            // includes (Mixin) を収集
            for mixin_name in &iface.includes {
                self.collect_interface_attributes(mixin_name, attributes_map, visited);
            }

            // 親クラス (Inherits) を収集
            if let Some(parent) = &iface.inherits {
                self.collect_interface_attributes(parent, attributes_map, visited);
            }
        }
    }
}

/// 標準的な HTML 属性のキーワード/Enum 値の補助マップ
fn get_well_known_html_attribute_enums(
    interface_name: &str,
    attr_name: &str,
) -> Option<Vec<String>> {
    match (interface_name, attr_name) {
        ("HTMLButtonElement", "type") => Some(vec![
            "submit".to_string(),
            "reset".to_string(),
            "button".to_string(),
        ]),
        ("HTMLInputElement", "type") => Some(vec![
            "text".to_string(),
            "password".to_string(),
            "checkbox".to_string(),
            "radio".to_string(),
            "submit".to_string(),
            "reset".to_string(),
            "button".to_string(),
            "file".to_string(),
            "hidden".to_string(),
            "image".to_string(),
            "datetime-local".to_string(),
            "date".to_string(),
            "month".to_string(),
            "time".to_string(),
            "week".to_string(),
            "number".to_string(),
            "range".to_string(),
            "email".to_string(),
            "url".to_string(),
            "search".to_string(),
            "tel".to_string(),
            "color".to_string(),
        ]),
        (_, "target") => Some(vec![
            "_self".to_string(),
            "_blank".to_string(),
            "_parent".to_string(),
            "_top".to_string(),
        ]),
        (_, "dir") => Some(vec![
            "ltr".to_string(),
            "rtl".to_string(),
            "auto".to_string(),
        ]),
        (_, "autocapitalize") => Some(vec![
            "off".to_string(),
            "none".to_string(),
            "characters".to_string(),
            "words".to_string(),
            "sentences".to_string(),
        ]),
        (_, "preload") => Some(vec![
            "none".to_string(),
            "metadata".to_string(),
            "auto".to_string(),
            "".to_string(),
        ]),
        (_, "wrap") => Some(vec!["soft".to_string(), "hard".to_string()]),
        (_, "crossOrigin") => Some(vec!["anonymous".to_string(), "use-credentials".to_string()]),
        (_, "popover") => Some(vec!["auto".to_string(), "manual".to_string()]),
        _ => None,
    }
}

// -----------------------------------------------------------------------------
// Tokenizer & Parser Utilities
// -----------------------------------------------------------------------------

fn tokenize(input: &str) -> Vec<String> {
    let mut tokens = Vec::new();
    let chars: Vec<char> = input.chars().collect();
    let mut i = 0;

    while i < chars.len() {
        let c = chars[i];

        // Whitespace
        if c.is_whitespace() {
            i += 1;
            continue;
        }

        // Line comment
        if c == '/' && i + 1 < chars.len() && chars[i + 1] == '/' {
            i += 2;
            while i < chars.len() && chars[i] != '\n' {
                i += 1;
            }
            continue;
        }

        // Block comment
        if c == '/' && i + 1 < chars.len() && chars[i + 1] == '*' {
            i += 2;
            while i + 1 < chars.len() && !(chars[i] == '*' && chars[i + 1] == '/') {
                i += 1;
            }
            i += 2; // skip */
            continue;
        }

        // String literal
        if c == '"' {
            let mut s = String::new();
            s.push(c);
            i += 1;
            while i < chars.len() {
                let sc = chars[i];
                s.push(sc);
                i += 1;
                if sc == '\\' && i < chars.len() {
                    s.push(chars[i]);
                    i += 1;
                } else if sc == '"' {
                    break;
                }
            }
            tokens.push(s);
            continue;
        }

        // Symbols
        if "{}();,:=<>?[]".contains(c) {
            tokens.push(c.to_string());
            i += 1;
            continue;
        }

        // Identifiers / Keywords
        if c.is_alphanumeric() || c == '_' || c == '-' || c == '.' {
            let start = i;
            while i < chars.len()
                && (chars[i].is_alphanumeric()
                    || chars[i] == '_'
                    || chars[i] == '-'
                    || chars[i] == '.')
            {
                i += 1;
            }
            let s: String = chars[start..i].iter().collect();
            tokens.push(s);
            continue;
        }

        i += 1;
    }

    tokens
}

fn peek(tokens: &[String], cursor: usize) -> Option<&str> {
    tokens.get(cursor).map(|s| s.as_str())
}

fn skip_extended_attributes(tokens: &[String], cursor: &mut usize) {
    while peek(tokens, *cursor) == Some("[") {
        let mut depth = 0;
        while *cursor < tokens.len() {
            let tok = &tokens[*cursor];
            if tok == "[" {
                depth += 1;
            } else if tok == "]" {
                depth -= 1;
                if depth == 0 {
                    *cursor += 1;
                    break;
                }
            }
            *cursor += 1;
        }
    }
}

fn skip_until_semicolon_or_braces(tokens: &[String], cursor: &mut usize) {
    let mut brace_depth = 0;
    while *cursor < tokens.len() {
        let tok = &tokens[*cursor];
        if tok == "{" {
            brace_depth += 1;
        } else if tok == "}" {
            if brace_depth > 0 {
                brace_depth -= 1;
            }
            if brace_depth == 0 {
                *cursor += 1;
                if peek(tokens, *cursor) == Some(";") {
                    *cursor += 1;
                }
                break;
            }
        } else if tok == ";" && brace_depth == 0 {
            *cursor += 1;
            break;
        }
        *cursor += 1;
    }
}

fn parse_identifier(tokens: &[String], cursor: &mut usize) -> Option<String> {
    if *cursor < tokens.len() {
        let tok = &tokens[*cursor];
        if !"{}(),:=;[]?".contains(tok.as_str()) {
            *cursor += 1;
            return Some(tok.clone());
        }
    }
    None
}

fn parse_enum(tokens: &[String], cursor: &mut usize) -> Option<EnumDef> {
    let name = parse_identifier(tokens, cursor)?;
    if peek(tokens, *cursor) != Some("{") {
        return None;
    }
    *cursor += 1; // skip {

    let mut values = Vec::new();
    while *cursor < tokens.len() {
        if peek(tokens, *cursor) == Some("}") {
            *cursor += 1;
            break;
        }
        let tok = &tokens[*cursor];
        if tok.starts_with('"') && tok.ends_with('"') && tok.len() >= 2 {
            let val = tok[1..tok.len() - 1].to_string();
            values.push(val);
        }
        *cursor += 1;
    }

    if peek(tokens, *cursor) == Some(";") {
        *cursor += 1;
    }

    Some(EnumDef { name, values })
}

fn parse_interface(tokens: &[String], cursor: &mut usize, is_mixin: bool) -> Option<InterfaceDef> {
    let name = parse_identifier(tokens, cursor)?;
    let mut inherits = None;

    if peek(tokens, *cursor) == Some(":") {
        *cursor += 1;
        skip_extended_attributes(tokens, cursor);
        inherits = parse_identifier(tokens, cursor);
    }

    if peek(tokens, *cursor) != Some("{") {
        // 前方宣言等
        skip_until_semicolon_or_braces(tokens, cursor);
        return Some(InterfaceDef {
            name,
            inherits,
            is_mixin,
            ..Default::default()
        });
    }
    *cursor += 1; // skip {

    let mut attributes = Vec::new();

    while *cursor < tokens.len() {
        skip_extended_attributes(tokens, cursor);
        if peek(tokens, *cursor) == Some("}") {
            *cursor += 1;
            break;
        }

        let start_cursor = *cursor;

        let mut is_readonly = false;
        if peek(tokens, *cursor) == Some("readonly") {
            is_readonly = true;
            *cursor += 1;
            skip_extended_attributes(tokens, cursor);
        }

        if peek(tokens, *cursor) == Some("attribute") {
            *cursor += 1;
            skip_extended_attributes(tokens, cursor);
            let type_name = parse_type(tokens, cursor);
            skip_extended_attributes(tokens, cursor);
            if let Some(attr_name) = parse_identifier(tokens, cursor)
                && is_valid_attribute_name(&attr_name)
            {
                attributes.push(AttributeDef {
                    name: attr_name,
                    type_name,
                    is_readonly,
                });
            }
            skip_until_semicolon(tokens, cursor);
        } else {
            // attribute 以外（operation, const, constructor 等）はスキップ
            *cursor = start_cursor;
            skip_member(tokens, cursor);
        }
    }

    if peek(tokens, *cursor) == Some(";") {
        *cursor += 1;
    }

    Some(InterfaceDef {
        name,
        inherits,
        attributes,
        includes: Vec::new(),
        is_mixin,
    })
}

fn is_valid_attribute_name(name: &str) -> bool {
    !name.is_empty()
        && !"{}(),:=;[]?".contains(name)
        && name
            .chars()
            .next()
            .is_some_and(|c| c.is_alphabetic() || c == '_')
}

fn parse_type(tokens: &[String], cursor: &mut usize) -> String {
    skip_extended_attributes(tokens, cursor);
    let mut parts = Vec::new();
    let mut paren_depth = 0;

    while *cursor < tokens.len() {
        skip_extended_attributes(tokens, cursor);
        if *cursor >= tokens.len() {
            break;
        }

        let tok = &tokens[*cursor];
        if tok == "(" {
            paren_depth += 1;
            parts.push(tok.clone());
            *cursor += 1;
        } else if tok == ")" {
            if paren_depth > 0 {
                paren_depth -= 1;
                parts.push(tok.clone());
                *cursor += 1;
            } else {
                break;
            }
        } else if tok == ";" {
            break;
        } else if paren_depth == 0 {
            if !parts.is_empty()
                && is_identifier_token(tok)
                && peek(tokens, *cursor + 1)
                    .is_none_or(|next| next == ";" || next == "=" || is_valid_attribute_name(next))
            {
                break;
            }
            parts.push(tok.clone());
            *cursor += 1;
        } else {
            parts.push(tok.clone());
            *cursor += 1;
        }
    }

    let mut result = parts.join("");
    result = result.trim_end_matches('?').to_string();
    result
}

fn is_identifier_token(tok: &str) -> bool {
    !"{}(),:=;[]?".contains(tok)
}

fn skip_until_semicolon(tokens: &[String], cursor: &mut usize) {
    while *cursor < tokens.len() {
        if tokens[*cursor] == ";" {
            *cursor += 1;
            break;
        }
        *cursor += 1;
    }
}

fn skip_member(tokens: &[String], cursor: &mut usize) {
    let mut brace_depth = 0;
    while *cursor < tokens.len() {
        let tok = &tokens[*cursor];
        if tok == "{" {
            brace_depth += 1;
        } else if tok == "}" {
            if brace_depth > 0 {
                brace_depth -= 1;
            } else {
                break;
            }
        } else if tok == ";" && brace_depth == 0 {
            *cursor += 1;
            break;
        }
        *cursor += 1;
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_enum_and_interface() {
        let idl = r#"
            enum CanvasFillRule { "nonzero", "evenodd" };

            [Exposed=Window]
            interface HTMLButtonElement : HTMLElement {
                [CEReactions] attribute boolean disabled;
                [CEReactions] attribute CanvasFillRule fillRule;
                readonly attribute DOMString type;
            };

            HTMLElement includes HTMLOrSVGElement;

            interface mixin HTMLOrSVGElement {
                attribute DOMString nonce;
            };
        "#;

        let mut db = IdlDatabase::default();
        db.parse_file(idl).unwrap();

        assert_eq!(
            db.enums.get("CanvasFillRule"),
            Some(&EnumDef {
                name: "CanvasFillRule".to_string(),
                values: vec!["nonzero".to_string(), "evenodd".to_string()]
            })
        );

        let resolved = db.resolve_interface_attributes("HTMLButtonElement");
        let disabled_attr = resolved.iter().find(|a| a.name == "disabled").unwrap();
        assert_eq!(disabled_attr.type_name, "boolean");

        let fill_rule_attr = resolved.iter().find(|a| a.name == "fillRule").unwrap();
        assert_eq!(
            fill_rule_attr.enum_values,
            Some(vec!["nonzero".to_string(), "evenodd".to_string()])
        );

        let nonce_attr = resolved.iter().find(|a| a.name == "nonce").unwrap();
        assert_eq!(nonce_attr.type_name, "DOMString");

        let type_attr = resolved.iter().find(|a| a.name == "type").unwrap();
        assert_eq!(
            type_attr.enum_values,
            Some(vec![
                "submit".to_string(),
                "reset".to_string(),
                "button".to_string()
            ])
        );
    }
}
