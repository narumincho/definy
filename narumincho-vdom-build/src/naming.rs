pub fn escape_identifier(s: &str) -> String {
    match s {
        "type" | "loop" | "for" | "as" | "async" | "use" | "switch" | "in" | "match" | "fn"
        | "struct" | "enum" | "trait" | "where" | "impl" | "ref" | "static" | "const"
        | "unsafe" | "mod" | "pub" | "crate" | "super" | "self" | "default" => format!("r#{s}"),
        _ => s.replace('-', "_"),
    }
}

pub fn escape_method_name(s: &str) -> String {
    let snake = to_snake_case(s);
    if snake == "class" || snake == "class_name" {
        return "class".to_string();
    }
    match snake.as_str() {
        "type" | "loop" | "for" | "as" | "async" | "use" | "switch" | "in" | "match" | "fn"
        | "struct" | "enum" | "trait" | "where" | "impl" | "ref" | "static" | "const"
        | "unsafe" | "mod" | "pub" | "crate" | "super" | "self" | "default" => format!("{snake}_"),
        _ => snake,
    }
}

pub fn escape_attribute_field_name(s: &str) -> String {
    let snake = to_snake_case(s);
    if snake == "class" || snake == "class_name" {
        return "class".to_string();
    }
    match snake.as_str() {
        "type" | "loop" | "for" | "as" | "async" | "use" | "switch" | "in" | "match" | "fn"
        | "struct" | "enum" | "trait" | "where" | "impl" | "ref" | "static" | "const"
        | "unsafe" | "mod" | "pub" | "crate" | "super" | "self" | "default" => format!("r#{snake}"),
        _ => snake,
    }
}

pub fn escape_variant_name(s: &str) -> String {
    let cap = capitalize(s);
    match cap.as_str() {
        "Self" | "Super" | "Crate" | "Type" | "Loop" | "For" | "As" | "Async" | "Use"
        | "Switch" | "In" | "Match" | "Fn" | "Struct" | "Enum" | "Trait" | "Where" | "Impl"
        | "Ref" | "Static" | "Const" | "Unsafe" | "Mod" | "Pub" | "Default" => format!("{cap}_"),
        _ => cap,
    }
}

pub fn to_snake_case(s: &str) -> String {
    let mut result = String::new();
    for (i, c) in s.chars().enumerate() {
        if c == '-' || c == '.' {
            result.push('_');
        } else if c.is_uppercase() {
            if i > 0 {
                result.push('_');
            }
            for lc in c.to_lowercase() {
                result.push(lc);
            }
        } else {
            result.push(c);
        }
    }
    result
}

pub fn capitalize(s: &str) -> String {
    let mut result = String::new();
    let parts: Vec<&str> = s.split(['-', '_', '.', '/']).collect();
    for part in parts {
        let mut chars = part.chars();
        if let Some(first) = chars.next() {
            result.push_val(first.to_ascii_uppercase());
            for rest in chars {
                result.push(rest);
            }
        }
    }
    if result.is_empty() {
        s.to_string()
    } else {
        result
    }
}

trait PushValExt {
    fn push_val(&mut self, c: char);
}

impl PushValExt for String {
    fn push_val(&mut self, c: char) {
        self.push(c);
    }
}
