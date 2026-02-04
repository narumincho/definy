use crate::event::Event;
use serde::de::Deserializer;
use serde::de::Error as _;
use serde::ser::Error as _;
use serde::ser::Serializer;
use serde::{Deserialize, Serialize};
use serde_cbor::tags::Tagged;

#[derive(Debug, Clone, PartialEq)]
pub struct SignedEvent {
    pub signature: ed25519_dalek::Signature,

    /// cbor にエンコードするときは, 内部でcborのバイナリにエンコードされる
    pub event_binary: EventBinary,
}

#[derive(Debug, Clone, PartialEq)]
pub struct EventBinary(Event);

impl Serialize for EventBinary {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        // 内部 Event を CBOR にエンコード
        let bytes = serde_cbor::to_vec(&self.0).map_err(S::Error::custom)?;

        // Tag 24: encoded CBOR data item
        Tagged::new(Some(24), bytes).serialize(serializer)
    }
}

impl<'de> Deserialize<'de> for EventBinary {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: Deserializer<'de>,
    {
        let tagged: Tagged<Vec<u8>> = Tagged::deserialize(deserializer)?;

        if tagged.tag != Some(24) {
            return Err(D::Error::custom("expected CBOR tag 24"));
        }

        let event = serde_cbor::from_slice(&tagged.value).map_err(D::Error::custom)?;

        Ok(EventBinary(event))
    }
}
