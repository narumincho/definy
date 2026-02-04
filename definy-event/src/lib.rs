use crate::event::Event;

pub mod cbor_datetime_tag1;
pub mod event;

#[derive(serde::Serialize, serde::Deserialize)]
pub struct SignedEvent {
    pub signature: ed25519_dalek::Signature,

    /// cbor にエンコードするときは, 内部でcborのバイナリにエンコードされる
    pub event_binary: serde_cbor::tags::Tagged<Vec<u8>>,
}

pub fn sign_and_serialize(
    event: event::Event,
    secret: &ed25519_dalek::SigningKey,
) -> Result<Vec<u8>, serde_cbor::Error> {
    let event_as_binary = serde_cbor::to_vec(&event)?;

    let signature = ed25519_dalek::Signer::sign(secret, &event_as_binary);
    let signed_event = SignedEvent {
        signature,
        // Tag 24: encoded CBOR data item
        event_binary: serde_cbor::tags::Tagged::new(Some(24), event_as_binary),
    };
    serde_cbor::to_vec(&signed_event)
}

pub fn verify_and_deserialize(data: &[u8]) -> anyhow::Result<(Event, ed25519_dalek::Signature)> {
    let signed_event: SignedEvent = serde_cbor::from_slice(data)?;
    let event: Event = serde_cbor::from_slice(&signed_event.event_binary.value)?;

    let public_key = ed25519_dalek::VerifyingKey::from_bytes(event.account_id.0.as_ref())?;
    ed25519_dalek::Verifier::verify(
        &public_key,
        &signed_event.event_binary.value,
        &signed_event.signature,
    )?;

    Ok((event, signed_event.signature))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_sign_and_verify() {
        let mut csprng = rand::rngs::OsRng;
        let signing_key = ed25519_dalek::SigningKey::generate(&mut csprng);
        let verifying_key = signing_key.verifying_key();

        let account_id = event::AccountId(Box::new(verifying_key.to_bytes()));

        let event = event::Event {
            account_id: account_id.clone(),
            time: chrono::Utc::now(),
            content: event::EventContent::CreateAccount(event::CreateAccountEvent {
                account_name: "test_user".into(),
            }),
        };

        // Clone event for comparison later as sign_and_serialize moves it (if it does, but based on signature it takes by value)
        // Actually sign_and_serialize takes event by value. Let's create another one for comparison or use the one returned.
        // Wait, CreateAccountEvent doesn't implement Clone or PartialEq yet, maybe I should add them or check fields manually.
        // Adding Debug to verify_and_deserialize return makes it easier.

        let serialized = sign_and_serialize(
            event::Event {
                account_id,
                time: event.time,
                content: event::EventContent::CreateAccount(event::CreateAccountEvent {
                    account_name: "test_user".into(),
                }),
            },
            &signing_key,
        )
        .unwrap();

        let (deserialized, _) = verify_and_deserialize(&serialized).unwrap();

        assert_eq!(deserialized.account_id.0, event.account_id.0);
        assert_eq!(deserialized.content, event.content);
        assert_eq!(
            deserialized.time.timestamp_millis(),
            event.time.timestamp_millis()
        );
    }

    #[test]
    fn test_tampered_data() {
        let mut csprng = rand::rngs::OsRng;
        let signing_key = ed25519_dalek::SigningKey::generate(&mut csprng);
        let verifying_key = signing_key.verifying_key();

        let account_id = event::AccountId(Box::new(verifying_key.to_bytes()));

        let event = event::Event {
            account_id,
            time: chrono::Utc::now(),
            content: event::EventContent::CreateAccount(event::CreateAccountEvent {
                account_name: "test_user".into(),
            }),
        };

        let mut serialized = sign_and_serialize(event, &signing_key).unwrap();

        // Tamper with the data (flip the last bit)
        let len = serialized.len();
        serialized[len - 1] ^= 0xFF;

        let result = verify_and_deserialize(&serialized);
        assert!(result.is_err());
    }
}
