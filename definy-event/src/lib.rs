use std::collections::BTreeMap;

use ed25519_dalek::{Signer, Verifier};

#[derive(Debug)]
pub struct CreateAccountEvent {
    pub account_id: AccountId,
    pub account_name: Box<str>,
    pub time: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug)]
pub struct AccountId(pub Box<[u8; 32]>);

#[derive(Debug)]
pub struct AccountSecret(pub Box<[u8; 32]>);

pub fn sign_and_serialize(
    event: CreateAccountEvent,
    // TODO event 内のものを使う
    secret: ed25519_dalek::SigningKey,
) -> Result<Vec<u8>, serde_cbor::Error> {
    let data = {
        let mut map = BTreeMap::new();
        map.insert(
            serde_cbor::Value::Text("type".to_string()),
            serde_cbor::Value::Text("create_account".to_string()),
        );
        map.insert(
            serde_cbor::Value::Text("account_id".to_string()),
            serde_cbor::Value::Bytes(event.account_id.0.to_vec()),
        );
        map.insert(
            serde_cbor::Value::Text("account_name".to_string()),
            serde_cbor::Value::Text(event.account_name.into()),
        );
        map.insert(
            serde_cbor::Value::Text("time".to_string()),
            serde_cbor::Value::Tag(
                2,
                Box::new(serde_cbor::Value::Integer(
                    event.time.timestamp_millis() as i128
                )),
            ),
        );
        serde_cbor::to_vec(&serde_cbor::Value::Map(map))?
    };
    let mut map = BTreeMap::new();
    map.insert(
        serde_cbor::Value::Text("signature".to_string()),
        serde_cbor::Value::Bytes(secret.sign(&data).to_vec()),
    );
    map.insert(
        serde_cbor::Value::Text("data".to_string()),
        serde_cbor::Value::Bytes(data),
    );

    serde_cbor::to_vec(&serde_cbor::Value::Map(map))
}

pub fn verify_and_deserialize(data: &[u8]) -> anyhow::Result<CreateAccountEvent> {
    let map: BTreeMap<&str, Box<[u8]>> = serde_cbor::from_slice(data)?;
    let data = map.get("data").ok_or(anyhow::anyhow!("data not found"))?;
    let signature = map
        .get("signature")
        .ok_or(anyhow::anyhow!("signature not found"))?;

    let map: BTreeMap<&str, serde_cbor::Value> = serde_cbor::from_slice(data)?;
    let account_id = AccountId(match map.get("account_id") {
        Some(serde_cbor::Value::Bytes(bytes)) => Box::new(bytes.as_slice().try_into()?),
        Some(_) => anyhow::bail!("account_id is not bytes"),
        None => anyhow::bail!("account_id not found"),
    });
    let public_key = ed25519_dalek::VerifyingKey::from_bytes(signature.as_ref().try_into()?)?;
    public_key.verify(
        &data,
        &ed25519_dalek::Signature::from_bytes(signature.as_ref().try_into()?),
    )?;

    Ok(CreateAccountEvent {
        account_id,
        account_name: match map.get("account_name") {
            Some(serde_cbor::Value::Text(account_name)) => account_name.clone().into_boxed_str(),
            Some(_) => anyhow::bail!("account_name is not text"),
            None => anyhow::bail!("account_name not found"),
        },
        time: match map.get("time") {
            Some(serde_cbor::Value::Tag(_, box_value)) => match box_value.as_ref() {
                serde_cbor::Value::Integer(time) => {
                    chrono::DateTime::<chrono::Utc>::from_timestamp_millis(*time as i64)
                        .ok_or(anyhow::anyhow!("time not found"))?
                }
                _ => anyhow::bail!("time is not integer"),
            },
            Some(_) => anyhow::bail!("time is not integer"),
            None => anyhow::bail!("time not found"),
        },
    })
}
