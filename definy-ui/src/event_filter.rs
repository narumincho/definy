use definy_event::event::EventType;

#[derive(serde::Serialize, serde::Deserialize)]
struct EventFilterQuery {
    event_type: Option<EventType>,
}

pub fn event_filter_from_query(query: Option<&str>) -> Option<EventType> {
    event_filter_from_query_str(query.unwrap_or(""))
}

pub fn event_filter_from_query_str(query: &str) -> Option<EventType> {
    if query.is_empty() {
        return None;
    }
    serde_urlencoded::from_str::<EventFilterQuery>(query)
        .ok()
        .and_then(|parsed| parsed.event_type)
}

pub fn event_filter_query_string(event_type: Option<EventType>) -> Option<String> {
    event_type.and_then(|event_type| {
        serde_urlencoded::to_string(EventFilterQuery {
            event_type: Some(event_type),
        })
        .ok()
    })
}
