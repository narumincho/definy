use definy_event::event::EventType;

#[derive(serde::Serialize, serde::Deserialize, Default, Clone)]
pub struct QueryParams {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub lang: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub event_type: Option<EventType>,
}

pub fn parse_query(query: Option<&str>) -> QueryParams {
    let query = query.unwrap_or("");
    if query.is_empty() {
        return QueryParams::default();
    }
    let mut params = serde_urlencoded::from_str::<QueryParams>(query).unwrap_or_default();
    if params
        .lang
        .as_ref()
        .is_some_and(|lang| lang.trim().is_empty())
    {
        params.lang = None;
    }
    params
}

pub fn build_query(mut params: QueryParams) -> Option<String> {
    if params
        .lang
        .as_ref()
        .is_some_and(|lang| lang.trim().is_empty())
    {
        params.lang = None;
    }
    let encoded = serde_urlencoded::to_string(params).ok()?;
    if encoded.is_empty() {
        None
    } else {
        Some(encoded)
    }
}
