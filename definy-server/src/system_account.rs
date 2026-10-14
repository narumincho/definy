//! ビルトインモジュール（`definy`, `core`, `std`, `wasi`, `sample`）を所有するシステムアカウント。
//!
//! 鍵は環境変数で指定します（値はいずれも UI の秘密鍵・公開鍵と同じ URL-safe base64 (パディングなし)）。
//!
//! - `DEFINY_SYSTEM_ACCOUNT_PUBLIC_KEY`: システムアカウントの公開鍵。サーバーはこのアカウントを
//!   ビルトインモジュールの所有者として扱う。
//! - `DEFINY_SYSTEM_ACCOUNT_SECRET_KEY`: システムアカウントの秘密鍵。seed からブートストラップ用
//!   イベントへ署名する場所（DB の初期化、Cloudflare Workers 向け seed バンドルの生成）でだけ必要。
//!
//! どちらも未設定の場合は、リポジトリに埋め込まれた **開発用の鍵** を使います（秘密鍵が公開されて
//! いるので本番では使わないこと）。鍵ペアは `cargo run -p definy-server -- --generate-system-key`
//! または UI の「アカウント作成」で生成できます。

use std::sync::OnceLock;

use base64::Engine as _;
use definy_event::event::AccountId;
use ed25519_dalek::{SigningKey, VerifyingKey};

/// 開発用システムアカウントの秘密鍵シード。公開されているため本番では使わない。
pub const DEV_SYSTEM_KEY_SEED: [u8; 32] = *b"definy-compiler-system-key-2026\0";

pub const PUBLIC_KEY_ENV: &str = "DEFINY_SYSTEM_ACCOUNT_PUBLIC_KEY";
pub const SECRET_KEY_ENV: &str = "DEFINY_SYSTEM_ACCOUNT_SECRET_KEY";

/// 環境変数から解決したシステムアカウントの鍵。
#[derive(Debug, Clone)]
pub struct SystemAccountKeys {
    pub account_id: AccountId,
    /// 署名に使える秘密鍵（公開鍵だけが設定されている場合は `None`）
    pub signing_key: Option<SigningKey>,
    /// 開発用の公開鍵を使っているか
    pub is_dev_key: bool,
}

fn decode_key_bytes(name: &str, value: &str) -> Result<[u8; 32], String> {
    let bytes = base64::engine::general_purpose::URL_SAFE_NO_PAD
        .decode(value.trim())
        .map_err(|e| format!("{name} is not URL-safe base64 (no padding): {e}"))?;
    <[u8; 32]>::try_from(bytes.as_slice())
        .map_err(|_| format!("{name} must be 32 bytes, got {}", bytes.len()))
}

fn non_empty_env(name: &str) -> Option<String> {
    std::env::var(name).ok().filter(|v| !v.trim().is_empty())
}

/// 環境変数の値からシステムアカウントの鍵を解決します（テストしやすいよう環境変数から分離）。
pub fn resolve_system_account_keys(
    public_key: Option<&str>,
    secret_key: Option<&str>,
) -> Result<SystemAccountKeys, String> {
    let signing_key = secret_key
        .map(|value| decode_key_bytes(SECRET_KEY_ENV, value).map(|b| SigningKey::from_bytes(&b)))
        .transpose()?;
    let public = public_key
        .map(|value| {
            let bytes = decode_key_bytes(PUBLIC_KEY_ENV, value)?;
            VerifyingKey::from_bytes(&bytes)
                .map_err(|e| format!("{PUBLIC_KEY_ENV} is not a valid ed25519 public key: {e}"))
        })
        .transpose()?;

    match (public, signing_key) {
        (Some(public), Some(signing_key)) => {
            if signing_key.verifying_key() != public {
                return Err(format!("{SECRET_KEY_ENV} does not match {PUBLIC_KEY_ENV}"));
            }
            Ok(SystemAccountKeys {
                account_id: AccountId(public),
                signing_key: Some(signing_key),
                is_dev_key: false,
            })
        }
        (Some(public), None) => Ok(SystemAccountKeys {
            account_id: AccountId(public),
            signing_key: None,
            is_dev_key: false,
        }),
        (None, Some(signing_key)) => Ok(SystemAccountKeys {
            account_id: AccountId(signing_key.verifying_key()),
            signing_key: Some(signing_key),
            is_dev_key: false,
        }),
        (None, None) => {
            let signing_key = SigningKey::from_bytes(&DEV_SYSTEM_KEY_SEED);
            Ok(SystemAccountKeys {
                account_id: AccountId(signing_key.verifying_key()),
                signing_key: Some(signing_key),
                is_dev_key: true,
            })
        }
    }
}

static SYSTEM_ACCOUNT_KEYS: OnceLock<SystemAccountKeys> = OnceLock::new();

/// 環境変数から解決したシステムアカウントの鍵を返します（プロセス内で 1 回だけ解決）。
///
/// # Panics
///
/// 環境変数の値が不正な場合。
pub fn system_account_keys() -> &'static SystemAccountKeys {
    SYSTEM_ACCOUNT_KEYS.get_or_init(|| {
        let keys = resolve_system_account_keys(
            non_empty_env(PUBLIC_KEY_ENV).as_deref(),
            non_empty_env(SECRET_KEY_ENV).as_deref(),
        )
        .unwrap_or_else(|e| panic!("invalid system account configuration: {e}"));
        if keys.is_dev_key {
            eprintln!(
                "{PUBLIC_KEY_ENV} / {SECRET_KEY_ENV} not set; using the public development system account key"
            );
        }
        keys
    })
}

/// システムアカウントの ID を返します。
#[must_use]
pub fn system_account_id() -> AccountId {
    system_account_keys().account_id.clone()
}

/// システムアカウントの秘密鍵を返します。公開鍵だけが設定されている場合はエラーです。
pub fn system_signing_key() -> Result<SigningKey, anyhow::Error> {
    system_account_keys().signing_key.clone().ok_or_else(|| {
        anyhow::anyhow!(
            "{SECRET_KEY_ENV} is required to sign builtin seed events (only {PUBLIC_KEY_ENV} is set)"
        )
    })
}

/// 公開鍵を UI と同じ URL-safe base64 (パディングなし) で返します。
#[must_use]
pub fn encode_public_key(account_id: &AccountId) -> String {
    base64::engine::general_purpose::URL_SAFE_NO_PAD.encode(account_id.0.as_bytes())
}

/// 新しいシステムアカウントの鍵ペアを生成し、環境変数として設定する形式で返します。
#[must_use]
pub fn generate_system_key_env_lines() -> String {
    use rand::RngCore as _;
    let mut seed = [0u8; 32];
    rand::rngs::OsRng.fill_bytes(&mut seed);
    let signing_key = SigningKey::from_bytes(&seed);
    format!(
        "{PUBLIC_KEY_ENV}={}\n{SECRET_KEY_ENV}={}\n",
        base64::engine::general_purpose::URL_SAFE_NO_PAD
            .encode(signing_key.verifying_key().as_bytes()),
        base64::engine::general_purpose::URL_SAFE_NO_PAD.encode(signing_key.to_bytes()),
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    fn encode(bytes: &[u8]) -> String {
        base64::engine::general_purpose::URL_SAFE_NO_PAD.encode(bytes)
    }

    #[test]
    fn test_defaults_to_dev_key() {
        let keys = resolve_system_account_keys(None, None).unwrap();
        assert!(keys.is_dev_key);
        let dev = SigningKey::from_bytes(&DEV_SYSTEM_KEY_SEED);
        assert_eq!(keys.account_id, AccountId(dev.verifying_key()));
        assert!(keys.signing_key.is_some());
    }

    #[test]
    fn test_public_key_only_has_no_signing_key() {
        let key = SigningKey::from_bytes(&[7u8; 32]);
        let public = encode(key.verifying_key().as_bytes());
        let keys = resolve_system_account_keys(Some(&public), None).unwrap();
        assert!(!keys.is_dev_key);
        assert_eq!(keys.account_id, AccountId(key.verifying_key()));
        assert!(keys.signing_key.is_none());
    }

    #[test]
    fn test_secret_key_derives_public_key() {
        let key = SigningKey::from_bytes(&[9u8; 32]);
        let keys = resolve_system_account_keys(None, Some(&encode(&key.to_bytes()))).unwrap();
        assert_eq!(keys.account_id, AccountId(key.verifying_key()));
        assert!(keys.signing_key.is_some());
    }

    #[test]
    fn test_mismatched_keys_are_rejected() {
        let a = SigningKey::from_bytes(&[1u8; 32]);
        let b = SigningKey::from_bytes(&[2u8; 32]);
        let result = resolve_system_account_keys(
            Some(&encode(a.verifying_key().as_bytes())),
            Some(&encode(&b.to_bytes())),
        );
        assert!(result.is_err());
    }

    #[test]
    fn test_invalid_base64_is_rejected() {
        assert!(resolve_system_account_keys(Some("not base64!!"), None).is_err());
        assert!(resolve_system_account_keys(None, Some(&encode(&[1u8; 16]))).is_err());
    }

    #[test]
    fn test_generated_keys_round_trip() {
        let lines = generate_system_key_env_lines();
        let mut public = None;
        let mut secret = None;
        for line in lines.lines() {
            if let Some(v) = line.strip_prefix(&format!("{PUBLIC_KEY_ENV}=")) {
                public = Some(v.to_string());
            }
            if let Some(v) = line.strip_prefix(&format!("{SECRET_KEY_ENV}=")) {
                secret = Some(v.to_string());
            }
        }
        let keys = resolve_system_account_keys(public.as_deref(), secret.as_deref()).unwrap();
        assert!(keys.signing_key.is_some());
    }
}
