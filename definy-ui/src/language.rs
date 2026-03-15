use std::collections::HashSet;

use crate::query::parse_query;

#[derive(Clone, Copy, PartialEq, Eq)]
pub struct Language {
    pub code: &'static str,
    pub english_name: &'static str,
    pub native_name: &'static str,
}

#[derive(Clone)]
pub struct LanguageResolution {
    pub language: Language,
    pub unsupported_query_lang: Option<String>,
}

pub const SUPPORTED_LANGUAGES: &[Language] = &[
    Language {
        code: "en",
        english_name: "English",
        native_name: "English",
    },
    Language {
        code: "ja",
        english_name: "Japanese",
        native_name: "日本語",
    },
    Language {
        code: "eo",
        english_name: "Esperanto",
        native_name: "Esperanto",
    },
];

pub fn supported_languages() -> &'static [Language] {
    SUPPORTED_LANGUAGES
}

pub fn default_language() -> Language {
    SUPPORTED_LANGUAGES[0]
}

pub fn language_from_tag(tag: &str) -> Option<Language> {
    let tag = tag.trim();
    if tag.is_empty() {
        return None;
    }
    let primary = tag
        .split(|c| c == '-' || c == '_')
        .next()
        .unwrap_or(tag)
        .to_ascii_lowercase();
    SUPPORTED_LANGUAGES
        .iter()
        .find(|lang| lang.code == primary)
        .copied()
}

pub fn language_from_query(query: Option<&str>) -> Option<Language> {
    let params = parse_query(query);
    params.lang.as_deref().and_then(language_from_tag)
}

pub fn language_label(language: &Language) -> String {
    format!("{} ({})", language.native_name, language.english_name)
}

pub fn preferred_languages() -> Vec<Language> {
    let mut ordered = Vec::new();
    let mut seen = HashSet::new();
    for tag in browser_language_tags() {
        if let Some(lang) = language_from_tag(tag.as_str()) {
            if seen.insert(lang.code) {
                ordered.push(lang);
            }
        }
    }
    for lang in SUPPORTED_LANGUAGES.iter().copied() {
        if seen.insert(lang.code) {
            ordered.push(lang);
        }
    }
    ordered
}

pub fn best_language_from_browser() -> Option<Language> {
    for tag in browser_language_tags() {
        if let Some(lang) = language_from_tag(tag.as_str()) {
            return Some(lang);
        }
    }
    None
}

pub fn resolve_language(query: Option<&str>, accept_language: Option<&str>) -> LanguageResolution {
    let params = parse_query(query);
    if let Some(requested_lang) = params.lang {
        if let Some(language) = language_from_tag(requested_lang.as_str()) {
            return LanguageResolution {
                language,
                unsupported_query_lang: None,
            };
        }
        let fallback =
            language_from_accept_language(accept_language).unwrap_or_else(default_language);
        return LanguageResolution {
            language: fallback,
            unsupported_query_lang: Some(requested_lang),
        };
    }
    LanguageResolution {
        language: language_from_accept_language(accept_language).unwrap_or_else(default_language),
        unsupported_query_lang: None,
    }
}

pub fn best_language_from_accept_language(header: Option<&str>) -> Language {
    language_from_accept_language(header).unwrap_or_else(default_language)
}

pub fn language_from_accept_language(header: Option<&str>) -> Option<Language> {
    let header = match header {
        Some(header) => header,
        None => return None,
    };
    let mut candidates = Vec::new();
    for part in header.split(',') {
        let part = part.trim();
        if part.is_empty() {
            continue;
        }
        let mut pieces = part.split(';');
        let tag = pieces.next().unwrap_or("").trim();
        if tag.is_empty() {
            continue;
        }
        let mut q = 1.0_f32;
        for param in pieces {
            let param = param.trim();
            let mut kv = param.splitn(2, '=');
            let key = kv.next().unwrap_or("").trim().to_ascii_lowercase();
            if key == "q" {
                if let Some(val) = kv.next() {
                    q = val.trim().parse::<f32>().unwrap_or(1.0);
                }
            }
        }
        candidates.push((tag.to_string(), q));
    }
    candidates.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap_or(std::cmp::Ordering::Equal));
    for (tag, _) in candidates {
        if tag == "*" {
            return Some(default_language());
        }
        if let Some(lang) = language_from_tag(tag.as_str()) {
            return Some(lang);
        }
    }
    None
}

#[cfg(target_arch = "wasm32")]
fn browser_language_tags() -> Vec<String> {
    let mut tags = Vec::new();
    if let Some(window) = web_sys::window() {
        let navigator = window.navigator();
        let languages = navigator.languages();
        for value in languages.iter() {
            if let Some(value) = value.as_string() {
                if !value.trim().is_empty() {
                    tags.push(value);
                }
            }
        }
        if tags.is_empty() {
            if let Some(lang) = navigator.language() {
                if !lang.trim().is_empty() {
                    tags.push(lang);
                }
            }
        }
    }
    tags
}

#[cfg(not(target_arch = "wasm32"))]
fn browser_language_tags() -> Vec<String> {
    Vec::new()
}
