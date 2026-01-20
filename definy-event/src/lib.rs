use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateAccountEvent {
    // pub account_id: AccountId,
    pub name: String,
    pub time: chrono::DateTime<chrono::Utc>,
}

// #[derive(Serialize, Deserialize)]
// pub struct AccountId {
//     pub id: String,
// }

pub fn serialize(event: CreateAccountEvent) -> Result<Vec<u8>, serde_cbor::Error> {
    serde_cbor::to_vec(&event)
}
