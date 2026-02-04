pub mod cbor_datetime_tag1;
pub mod event;
pub mod signed_event;

// pub fn sign_and_serialize(
//     event: Event,
//     secret: &ed25519_dalek::SigningKey,
// ) -> Result<Vec<u8>, serde_cbor::Error> {
//     let data = {
//         let mut map = BTreeMap::new();
//         map.insert(
//             serde_cbor::Value::Text("type".to_string()),
//             serde_cbor::Value::Text("create_account".to_string()),
//         );
//         map.insert(
//             serde_cbor::Value::Text("account_id".to_string()),
//             serde_cbor::Value::Bytes(event.account_id.0.to_vec()),
//         );
//         map.insert(
//             serde_cbor::Value::Text("account_name".to_string()),
//             serde_cbor::Value::Text(event.account_name.into()),
//         );
//         map.insert(
//             serde_cbor::Value::Text("time".to_string()),
//             serde_cbor::Value::Tag(
//                 2,
//                 Box::new(serde_cbor::Value::Integer(
//                     event.time.timestamp_millis() as i128
//                 )),
//             ),
//         );
//         serde_cbor::to_vec(&serde_cbor::Value::Map(map))?
//     };
//     let mut map = BTreeMap::new();
//     map.insert(
//         serde_cbor::Value::Text("signature".to_string()),
//         serde_cbor::Value::Bytes(secret.sign(&data).to_vec()),
//     );
//     map.insert(
//         serde_cbor::Value::Text("data".to_string()),
//         serde_cbor::Value::Bytes(data),
//     );

//     serde_cbor::to_vec(&serde_cbor::Value::Map(map))
// }

// pub fn verify_and_deserialize(
//     data: &[u8],
// ) -> anyhow::Result<(CreateAccountEvent, ed25519_dalek::Signature)> {
//     let map: BTreeMap<String, serde_cbor::Value> = serde_cbor::from_slice(data)?;
//     let data = match map.get("data") {
//         Some(serde_cbor::Value::Bytes(b)) => b,
//         _ => anyhow::bail!("data not found or not bytes"),
//     };
//     let signature_bytes = match map.get("signature") {
//         Some(serde_cbor::Value::Bytes(b)) => b,
//         _ => anyhow::bail!("signature not found or not bytes"),
//     };

//     let map: BTreeMap<&str, serde_cbor::Value> = serde_cbor::from_slice(data)?;
//     let account_id = AccountId(match map.get("account_id") {
//         Some(serde_cbor::Value::Bytes(bytes)) => Box::new(bytes.as_slice().try_into()?),
//         Some(_) => anyhow::bail!("account_id is not bytes"),
//         None => anyhow::bail!("account_id not found"),
//     });
//     let public_key = ed25519_dalek::VerifyingKey::from_bytes(account_id.0.as_ref())?;
//     let signature = ed25519_dalek::Signature::from_bytes(signature_bytes.as_slice().try_into()?);
//     public_key.verify(&data, &signature)?;

//     Ok((
//         CreateAccountEvent {
//             account_id,
//             account_name: match map.get("account_name") {
//                 Some(serde_cbor::Value::Text(account_name)) => {
//                     account_name.clone().into_boxed_str()
//                 }
//                 Some(_) => anyhow::bail!("account_name is not text"),
//                 None => anyhow::bail!("account_name not found"),
//             },
//             time: match map.get("time") {
//                 Some(serde_cbor::Value::Tag(_, box_value)) => match box_value.as_ref() {
//                     serde_cbor::Value::Integer(time) => {
//                         chrono::DateTime::<chrono::Utc>::from_timestamp_millis(*time as i64)
//                             .ok_or(anyhow::anyhow!("time not found"))?
//                     }
//                     _ => anyhow::bail!("time is not integer"),
//                 },
//                 Some(_) => anyhow::bail!("time is not integer"),
//                 None => anyhow::bail!("time not found"),
//             },
//         },
//         signature,
//     ))
// }

// #[cfg(test)]
// mod tests {
//     use super::*;

//     #[test]
//     fn test_sign_and_verify() {
//         let mut csprng = rand::rngs::OsRng;
//         let signing_key = ed25519_dalek::SigningKey::generate(&mut csprng);
//         let verifying_key = signing_key.verifying_key();

//         let account_id = AccountId(Box::new(verifying_key.to_bytes()));

//         let event = CreateAccountEvent {
//             account_id,
//             account_name: "test_user".into(),
//             time: chrono::Utc::now(),
//         };

//         // Clone event for comparison later as sign_and_serialize moves it (if it does, but based on signature it takes by value)
//         // Actually sign_and_serialize takes event by value. Let's create another one for comparison or use the one returned.
//         // Wait, CreateAccountEvent doesn't implement Clone or PartialEq yet, maybe I should add them or check fields manually.
//         // Adding Debug to verify_and_deserialize return makes it easier.

//         let serialized = sign_and_serialize(
//             CreateAccountEvent {
//                 account_id: AccountId(Box::new(verifying_key.to_bytes())),
//                 account_name: "test_user".into(),
//                 time: event.time,
//             },
//             &signing_key,
//         )
//         .unwrap();

//         let (deserialized, _) = verify_and_deserialize(&serialized).unwrap();

//         assert_eq!(deserialized.account_id.0, event.account_id.0);
//         assert_eq!(deserialized.account_name, event.account_name);
//         assert_eq!(
//             deserialized.time.timestamp_millis(),
//             event.time.timestamp_millis()
//         );
//     }

//     #[test]
//     fn test_tampered_data() {
//         let mut csprng = rand::rngs::OsRng;
//         let signing_key = ed25519_dalek::SigningKey::generate(&mut csprng);
//         let verifying_key = signing_key.verifying_key();

//         let account_id = AccountId(Box::new(verifying_key.to_bytes()));

//         let event = CreateAccountEvent {
//             account_id,
//             account_name: "test_user".into(),
//             time: chrono::Utc::now(),
//         };

//         let mut serialized = sign_and_serialize(event, &signing_key).unwrap();

//         // Tamper with the data (flip the last bit)
//         let len = serialized.len();
//         serialized[len - 1] ^= 0xFF;

//         let result = verify_and_deserialize(&serialized);
//         assert!(result.is_err());
//     }
// }
