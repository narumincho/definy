use std::collections::HashSet;

use crate::query::parse_query;

#[derive(Clone, PartialEq, Eq)]
pub enum Language {
    English,
    Japanese,
    Esperanto,
    Unsupported(String),
}

#[derive(Clone, Copy, PartialEq, Eq)]
pub struct LanguageOld {
    pub code: &'static str,
    pub english_name: &'static str,
    pub native_name: &'static str,
}

#[derive(Clone)]
pub struct LanguageResolution {
    pub language: LanguageOld,
    pub unsupported_query_lang: Option<String>,
}

impl LanguageResolution {
    pub fn fallback_notice(&self) -> Option<crate::LanguageFallbackNotice> {
        self.unsupported_query_lang
            .as_ref()
            .map(|req| crate::LanguageFallbackNotice {
                requested: req.clone(),
                fallback_to_code: self.language.code,
            })
    }
}

pub const SUPPORTED_LANGUAGES: &[LanguageOld] = &[
    LanguageOld {
        code: "en",
        english_name: "English",
        native_name: "English",
    },
    LanguageOld {
        code: "ja",
        english_name: "Japanese",
        native_name: "日本語",
    },
    LanguageOld {
        code: "eo",
        english_name: "Esperanto",
        native_name: "Esperanto",
    },
];

pub fn default_language() -> LanguageOld {
    SUPPORTED_LANGUAGES[0]
}

pub fn language_from_tag(tag: &str) -> Option<LanguageOld> {
    let tag = tag.trim();
    if tag.is_empty() {
        return None;
    }
    let primary = tag
        .split(['-', '_'])
        .next()
        .unwrap_or(tag)
        .to_ascii_lowercase();
    SUPPORTED_LANGUAGES
        .iter()
        .find(|lang| lang.code == primary)
        .copied()
}

pub fn language_from_query(query: Option<&str>) -> Option<LanguageOld> {
    let params = parse_query(query);
    params.lang.as_deref().and_then(language_from_tag)
}

pub fn language_label(language: &LanguageOld) -> String {
    format!("{} ({})", language.native_name, language.english_name)
}

pub fn preferred_languages() -> Vec<LanguageOld> {
    let mut ordered = Vec::new();
    let mut seen = HashSet::new();
    for tag in browser_language_tags() {
        if let Some(lang) = language_from_tag(tag.as_str())
            && seen.insert(lang.code)
        {
            ordered.push(lang);
        }
    }
    for lang in SUPPORTED_LANGUAGES.iter().copied() {
        if seen.insert(lang.code) {
            ordered.push(lang);
        }
    }
    ordered
}

pub fn best_language_from_browser() -> Option<LanguageOld> {
    for tag in browser_language_tags() {
        if let Some(lang) = language_from_tag(tag.as_str()) {
            return Some(lang);
        }
    }
    None
}

pub fn resolve_language_with_fallback(
    query: Option<&str>,
    fallback: impl FnOnce() -> LanguageOld,
) -> LanguageResolution {
    let params = parse_query(query);
    if let Some(requested_lang) = params.lang {
        if let Some(language) = language_from_tag(requested_lang.as_str()) {
            return LanguageResolution {
                language,
                unsupported_query_lang: None,
            };
        }
        return LanguageResolution {
            language: fallback(),
            unsupported_query_lang: Some(requested_lang),
        };
    }
    LanguageResolution {
        language: fallback(),
        unsupported_query_lang: None,
    }
}

pub fn resolve_language(query: Option<&str>, accept_language: Option<&str>) -> LanguageResolution {
    resolve_language_with_fallback(query, || {
        language_from_accept_language(accept_language).unwrap_or_else(default_language)
    })
}

pub fn best_language_from_accept_language(header: Option<&str>) -> LanguageOld {
    language_from_accept_language(header).unwrap_or_else(default_language)
}

pub fn language_from_accept_language(header: Option<&str>) -> Option<LanguageOld> {
    let header = header?;
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
            if key == "q"
                && let Some(val) = kv.next()
            {
                q = val.trim().parse::<f32>().unwrap_or(1.0);
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

impl Language {
    pub fn from_code(code: &str) -> Self {
        match code {
            "en" => Language::English,
            "ja" => Language::Japanese,
            "eo" => Language::Esperanto,
            _ => Language::Unsupported(code.to_string()),
        }
    }

    pub fn to_code(&self) -> &str {
        match self {
            Language::English => "en",
            Language::Japanese => "ja",
            Language::Esperanto => "eo",
            Language::Unsupported(code) => code,
        }
    }

    pub fn label<'a>(&self, en: &'a str, ja: &'a str, eo: &'a str) -> &'a str {
        match self {
            Language::English => en,
            Language::Japanese => ja,
            Language::Esperanto => eo,
            Language::Unsupported(_) => en,
        }
    }
}
