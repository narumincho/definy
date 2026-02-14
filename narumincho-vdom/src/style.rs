use std::collections::HashMap;

#[derive(Debug, Clone, PartialEq)]
pub struct Style(HashMap<String, String>);

impl Style {
    pub fn new() -> Self {
        Self(HashMap::new())
    }

    pub fn color(&mut self, color: &str) -> &mut Self {
        self.0.insert("color".to_string(), color.to_string());
        self
    }

    pub fn background_color(&mut self, color: &str) -> &mut Self {
        self.0
            .insert("background-color".to_string(), color.to_string());
        self
    }

    pub fn iter(&self) -> std::collections::hash_map::Iter<String, String> {
        self.0.iter()
    }

    pub fn get(&self, key: &str) -> Option<&String> {
        self.0.get(key)
    }

    pub fn insert(&mut self, key: String, value: String) {
        self.0.insert(key, value);
    }
}
