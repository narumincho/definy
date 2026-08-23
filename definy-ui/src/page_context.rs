use crate::Location;
use crate::language::{Language, resolve_language};
use crate::query::parse_query;
use definy_event::event::EventType;
use narumincho_vdom::Route;

#[derive(Clone, PartialEq, Eq, Debug)]
pub struct PageContext {
    pub location: Option<Location>,
    pub language: Language,
    pub language_requested_code: Option<String>,
    pub filter_event_type: Option<EventType>,
}

impl PageContext {
    pub fn from_path_and_query(
        path: &str,
        query: &str,
        accept_or_browser_language: Option<&str>,
    ) -> Self {
        let query_opt = if query.is_empty() { None } else { Some(query) };
        let location = Location::from_url(path);
        let query_params = parse_query(query_opt);
        let filter_event_type = query_params.event_type;
        let language_resolution = resolve_language(query_opt, accept_or_browser_language);
        Self {
            location,
            language: language_resolution.language,
            language_requested_code: language_resolution.unsupported_query_lang,
            filter_event_type,
        }
    }

    pub fn build_url(
        location: &Location,
        lang_code: &str,
        event_type: Option<EventType>,
    ) -> String {
        let mut url = location.to_url();
        let query = crate::query::build_query(crate::query::QueryParams {
            lang: Some(lang_code.to_string()),
            event_type: if matches!(location, Location::Home) {
                event_type
            } else {
                None
            },
        });
        if let Some(query) = query {
            url.push('?');
            url.push_str(query.as_str());
        }
        url
    }

    pub fn url_with_lang(&self, location: &Location) -> String {
        Self::build_url(location, self.language.to_code(), self.filter_event_type)
    }

    pub fn home_url_with_lang(&self, event_type: Option<EventType>) -> String {
        Self::build_url(&Location::Home, self.language.to_code(), event_type)
    }

    pub fn href_with_lang(&self, location: Location) -> narumincho_vdom::Href<Location> {
        narumincho_vdom::Href::External(self.url_with_lang(&location))
    }
}
