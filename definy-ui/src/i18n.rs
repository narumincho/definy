use crate::AppState;

#[derive(Clone, Copy, PartialEq, Eq)]
enum Lang {
    En,
    Ja,
    Eo,
}

fn lang_from_code(code: &str) -> Lang {
    match code {
        "ja" => Lang::Ja,
        "eo" => Lang::Eo,
        _ => Lang::En,
    }
}

pub fn tr<'a>(state: &AppState, en: &'a str, ja: &'a str, eo: &'a str) -> &'a str {
    match lang_from_code(state.language.code) {
        Lang::En => en,
        Lang::Ja => ja,
        Lang::Eo => eo,
    }
}

pub fn tr_lang<'a>(lang_code: &str, en: &'a str, ja: &'a str, eo: &'a str) -> &'a str {
    match lang_from_code(lang_code) {
        Lang::En => en,
        Lang::Ja => ja,
        Lang::Eo => eo,
    }
}
