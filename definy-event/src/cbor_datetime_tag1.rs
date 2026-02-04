use chrono::{DateTime, TimeZone, Utc};
use serde::{Deserialize, Deserializer, Serializer};
use serde_cbor::tags::Tagged;

pub fn serialize<S>(dt: &DateTime<Utc>, serializer: S) -> Result<S::Ok, S::Error>
where
    S: Serializer,
{
    // epoch seconds（小数対応したいなら f64 に）
    let secs = dt.timestamp();
    serde::Serialize::serialize(&Tagged::new(Some(1), secs), serializer)
}

pub fn deserialize<'de, D>(deserializer: D) -> Result<DateTime<Utc>, D::Error>
where
    D: Deserializer<'de>,
{
    let tagged: Tagged<i64> = Tagged::deserialize(deserializer)?;

    if tagged.tag != Some(1) {
        return Err(serde::de::Error::custom("expected CBOR tag 1"));
    }

    Ok(Utc
        .timestamp_opt(tagged.value, 0)
        .single()
        .ok_or_else(|| serde::de::Error::custom("invalid timestamp"))?)
}
