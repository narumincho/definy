#[derive(serde::Serialize, serde::Deserialize)]
#[cfg_attr(feature = "utoipa", derive(utoipa::ToSchema))]
pub struct EventsResponse {
    #[cfg_attr(feature = "utoipa", schema(value_type = Vec<String>))]
    pub events: Box<[Vec<u8>]>,
    pub next_cursor: Option<Vec<u8>>,
}
