use definy_event::event::EventType;

pub fn event_filter_from_query(query: Option<&str>) -> Option<EventType> {
    event_filter_from_query_str(query.unwrap_or(""))
}

pub fn event_filter_from_query_str(query: &str) -> Option<EventType> {
    crate::query::parse_query(Some(query)).event_type
}

pub fn event_filter_query_string(event_type: Option<EventType>) -> Option<String> {
    crate::query::build_query(crate::query::QueryParams {
        lang: None,
        event_type,
    })
}
