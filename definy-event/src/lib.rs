use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug)]
pub struct CreateAccountEvent {
    pub account_id: AccountId,
    pub name: Box<str>,
    pub time: DateTime,
}

#[derive(Debug)]
pub struct AccountId(pub [u8; 32]);

impl serde::Serialize for AccountId {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serde_cbor::Value::Bytes(self.0.to_vec()).serialize(serializer)
    }
}

impl<'de> serde::Deserialize<'de> for AccountId {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: serde::Deserializer<'de>,
    {
        let bytes = serde_cbor::Value::deserialize(deserializer)?;
        match bytes {
            serde_cbor::Value::Bytes(bytes) => Ok(AccountId(bytes.try_into().unwrap())),
            _ => Err(serde::de::Error::custom("Invalid AccountId")),
        }
    }
}

#[derive(Debug)]
pub struct DateTime(pub chrono::DateTime<chrono::Utc>);

impl serde::Serialize for DateTime {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serde_cbor::tags::Tagged::new(Some(1), self.0.timestamp_millis()).serialize(serializer)
    }
}

impl<'de> serde::Deserialize<'de> for DateTime {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: serde::Deserializer<'de>,
    {
        let tagged = serde_cbor::tags::Tagged::<i64>::deserialize(deserializer)?;
        match chrono::DateTime::from_timestamp_millis(tagged.value) {
            Some(datetime) => Ok(DateTime(datetime)),
            None => Err(serde::de::Error::custom("Invalid timestamp")),
        }
    }
}

pub fn serialize(event: CreateAccountEvent) -> Result<Vec<u8>, serde_cbor::Error> {
    serde_cbor::to_vec(&event)
}
