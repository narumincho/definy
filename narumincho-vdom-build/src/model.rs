use std::collections::BTreeSet;

#[derive(serde::Deserialize)]
pub struct WebrefSpecData {
    #[serde(default)]
    pub spec: SpecInfo,
    pub elements: Vec<WebrefElement>,
}

#[derive(serde::Deserialize, Default)]
pub struct SpecInfo {
    #[serde(default)]
    pub title: String,
    #[serde(default)]
    pub url: String,
}

#[derive(serde::Deserialize, Clone)]
pub struct WebrefElement {
    pub name: String,
    #[serde(default)]
    pub interface: String,
    #[serde(default)]
    pub href: String,
    #[serde(default)]
    pub obsolete: Option<bool>,
}

pub struct ElementInfo {
    pub name: String,
    pub interface: String,
    pub href: String,
    pub specs: BTreeSet<String>,
}

pub const GLOBAL_ATTRIBUTES: &[&str] = &[
    "accesskey",
    "autocapitalize",
    "autofocus",
    "class",
    "contenteditable",
    "dir",
    "draggable",
    "enterkeyhint",
    "hidden",
    "id",
    "inert",
    "inputmode",
    "is",
    "lang",
    "nonce",
    "part",
    "popover",
    "slot",
    "spellcheck",
    "style",
    "tabindex",
    "title",
    "translate",
];

pub const OVERLAPPING_TAGS: &[&str] = &["a", "script", "style", "title"];
