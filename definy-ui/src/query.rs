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
    let mut params = QueryParams::default();
    let pairs = serde_urlencoded::from_str::<Vec<(String, String)>>(query).unwrap_or_default();
    for (key, value) in pairs {
        match key.as_str() {
            "lang" => {
                if value.trim().is_empty() {
                    params.lang = None;
                } else {
                    params.lang = Some(value);
                }
            }
            "event_type" => {
                params.event_type = parse_event_type_value(value.as_str());
            }
            _ => {}
        }
    }
    params
}

fn parse_event_type_value(value: &str) -> Option<EventType> {
    let encoded = serde_urlencoded::to_string([("event_type", value)]).ok()?;
    serde_urlencoded::from_str::<QueryParams>(encoded.as_str())
        .ok()?
        .event_type
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parse_query_preserves_lang_when_event_type_is_invalid() {
        let params = parse_query(Some("lang=ja&event_type=invalid"));
        assert_eq!(params.lang.as_deref(), Some("ja"));
        assert_eq!(params.event_type, None);
    }

    #[test]
    fn parse_query_parses_both_lang_and_event_type() {
        let params = parse_query(Some("lang=ja&event_type=part_definition"));
        assert_eq!(params.lang.as_deref(), Some("ja"));
        assert_eq!(params.event_type, Some(EventType::PartDefinition));
    }
}
