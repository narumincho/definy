use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Event {
    pub account_id: AccountId,
    #[serde(with = "crate::cbor_datetime_tag1")]
    pub time: chrono::DateTime<chrono::Utc>,
    pub content: EventContent,
}

impl Event {
    pub fn event_type(&self) -> EventType {
        match self.content {
            EventContent::CreateAccount(_) => EventType::AccountCreated,
            EventContent::Message(_) => EventType::MessagePosted,
        }
    }
}

pub enum EventType {
    AccountCreated,
    MessagePosted,
}

impl EventType {
    pub fn to_str(&self) -> &'static str {
        match self {
            EventType::AccountCreated => "account_created",
            EventType::MessagePosted => "message_posted",
        }
    }
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub enum EventContent {
    CreateAccount(CreateAccountEvent),
    Message(MessageEvent),
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct MessageEvent {
    pub message: Box<str>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct CreateAccountEvent {
    pub account_name: Box<str>,
}

#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct AccountId(pub Box<[u8; 32]>);
