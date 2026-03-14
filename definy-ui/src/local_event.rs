#[derive(Clone, serde::Serialize, serde::Deserialize, PartialEq, Eq)]
pub enum LocalEventStatus {
    Queued,
    Sent,
    Failed,
}

#[derive(Clone, serde::Serialize, serde::Deserialize)]
pub struct LocalEventRecord {
    pub hash: [u8; 32],
    pub event_binary: Vec<u8>,
    pub status: LocalEventStatus,
    pub updated_at_ms: i64,
    pub last_error: Option<String>,
}
