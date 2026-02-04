use chrono::{DateTime, TimeZone, Utc};
use serde::{Deserialize, Deserializer, Serializer};
use serde_cbor::tags::Tagged;

pub fn serialize<S>(dt: &DateTime<Utc>, serializer: S) -> Result<S::Ok, S::Error>
where
    S: Serializer,
{
    // epoch seconds（小数対応済み）
    let secs = dt.timestamp() as f64 + (dt.timestamp_subsec_nanos() as f64 / 1_000_000_000.0);
    serde::Serialize::serialize(&Tagged::new(Some(1), secs), serializer)
}

pub fn deserialize<'de, D>(deserializer: D) -> Result<DateTime<Utc>, D::Error>
where
    D: Deserializer<'de>,
{
    let tagged: Tagged<f64> = Tagged::deserialize(deserializer)?;

    if tagged.tag != Some(1) {
        return Err(serde::de::Error::custom("expected CBOR tag 1"));
    }

    let secs = tagged.value.trunc() as i64;
    let nanos = (tagged.value.fract() * 1_000_000_000.0).round() as u32;

    Ok(Utc
        .timestamp_opt(secs, nanos)
        .single()
        .ok_or_else(|| serde::de::Error::custom("invalid timestamp"))?)
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde::{Deserialize, Serialize};

    #[derive(Debug, Serialize, Deserialize, PartialEq)]
    struct Wrapper {
        #[serde(with = "super")]
        time: DateTime<Utc>,
    }

    #[test]
    fn test_round_trip() {
        let dt = Utc.timestamp_opt(1700000000, 500_000_000).unwrap();
        let wrapper = Wrapper { time: dt };

        let serialized = serde_cbor::to_vec(&wrapper).unwrap();
        let deserialized: Wrapper = serde_cbor::from_slice(&serialized).unwrap();

        assert_eq!(dt, deserialized.time);
    }

    #[test]
    fn test_cbor_structure() {
        let dt = Utc.timestamp_opt(1600000000, 0).unwrap();
        let wrapper = Wrapper { time: dt };

        let serialized = serde_cbor::to_vec(&wrapper).unwrap();

        // CBOR structure check
        // A map with 1 element: "time" -> Tag 1 (float)
        // This is hard to check byte-by-byte exactly without re-implementing CBOR,
        // but we can check if it deserializes to a generic Value and inspect.
        let value: serde_cbor::Value = serde_cbor::from_slice(&serialized).unwrap();

        if let serde_cbor::Value::Map(map) = value {
            let key = serde_cbor::Value::Text("time".to_string());
            let val = map.get(&key).expect("should have time key");

            if let serde_cbor::Value::Tag(tag, content) = val {
                assert_eq!(*tag, 1);
                if let serde_cbor::Value::Float(f) = **content {
                    assert!((f - 1600000000.0).abs() < 0.001);
                } else {
                    panic!("Expected Float content inside Tag 1");
                }
            } else {
                panic!("Expected Tag 1");
            }
        } else {
            panic!("Expected Map");
        }
    }
}
