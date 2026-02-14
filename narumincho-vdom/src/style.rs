use std::collections::HashMap;

#[derive(Debug, Clone, PartialEq)]
pub struct Style(HashMap<String, String>);

impl Style {
    pub fn new() -> Self {
        Self(HashMap::new())
    }

    pub fn color(mut self, color: &str) -> Self {
        self.0.insert("color".to_string(), color.to_string());
        self
    }

    pub fn background_color(mut self, color: &str) -> Self {
        self.0
            .insert("background-color".to_string(), color.to_string());
        self
    }

    pub fn set(mut self, key: &str, value: &str) -> Self {
        self.0.insert(key.to_string(), value.to_string());
        self
    }

    pub fn iter(&self) -> std::collections::hash_map::Iter<'_, String, String> {
        self.0.iter()
    }

    pub fn get(&self, key: &str) -> Option<&String> {
        self.0.get(key)
    }
}

impl From<&str> for Style {
    fn from(s: &str) -> Self {
        let mut style = Self::new();
        for declaration in s.split(';') {
            let declaration = declaration.trim();
            if declaration.is_empty() {
                continue;
            }
            if let Some((key, value)) = declaration.split_once(':') {
                style = style.set(key.trim(), value.trim());
            }
        }
        style
    }
}
