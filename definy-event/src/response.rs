#[derive(serde::Serialize, serde::Deserialize)]
pub struct EventsResponse {
    pub events: Box<[Vec<u8>]>,
    pub next_cursor: Option<Vec<u8>>,
}
