use std::path::{Path, PathBuf};

use definy_event::event::{AccountId, ModulePartEntry, ModuleSeed};
use schemars::schema_for;

/// ModuleSeed の JSON Schema を生成します。
pub fn generate_module_seed_schema() -> schemars::schema::RootSchema {
    schema_for!(ModuleSeed)
}

/// JSON Schema 文字列を生成します。
///
/// seed ファイルではパーツ ID（`EventHashId`）を `{"$part": "module.name"}` の名前参照で書くため、
/// `EventHashId` の定義にその形を追加します。
pub fn generate_module_seed_schema_json() -> Result<String, serde_json::Error> {
    let mut schema = serde_json::to_value(generate_module_seed_schema())?;
    if let Some(definition) = schema.pointer_mut("/definitions/EventHashId") {
        let raw = definition.take();
        *definition = serde_json::json!({
            "anyOf": [
                {
                    "description": "ビルトインパーツへの名前参照 (`module.part-name`)。読み込み時にシステムアカウントから ID を導出する",
                    "type": "object",
                    "required": ["$part"],
                    "properties": { "$part": { "type": "string" } },
                    "additionalProperties": false
                },
                raw
            ]
        });
    }
    serde_json::to_string_pretty(&schema)
}

/// `{"$part": "module.name"}` 形式の名前参照のキー
const PART_REFERENCE_KEY: &str = "$part";

/// `module.part-name` をシステムアカウントのパーツ ID に変換します（モジュール名は `.` を含まない）。
fn resolve_qualified_part_id(
    account_id: &AccountId,
    qualified: &str,
) -> Result<definy_event::EventHashId, String> {
    let (module_name, part_name) = qualified
        .split_once('.')
        .ok_or_else(|| format!("invalid part reference `{qualified}` (expected module.part)"))?;
    Ok(definy_event::event::derive_module_part_id(
        &definy_event::event::derive_module_id(account_id, module_name),
        part_name,
    ))
}

/// seed JSON 中の `{"$part": "module.name"}` をパーツ ID（バイト配列）に置き換えます。
pub fn resolve_part_references(
    value: &mut serde_json::Value,
    account_id: &AccountId,
) -> Result<(), String> {
    match value {
        serde_json::Value::Array(items) => {
            for item in items {
                resolve_part_references(item, account_id)?;
            }
        }
        serde_json::Value::Object(map) => {
            if map.len() == 1
                && let Some(serde_json::Value::String(qualified)) = map.get(PART_REFERENCE_KEY)
            {
                let id = resolve_qualified_part_id(account_id, qualified)?;
                *value = serde_json::to_value(id).map_err(|e| e.to_string())?;
                return Ok(());
            }
            for item in map.values_mut() {
                resolve_part_references(item, account_id)?;
            }
        }
        _ => {}
    }
    Ok(())
}

/// パーツ ID（バイト配列）→ `module.name` の対応表を作ります。
fn part_reference_table(
    account_id: &AccountId,
    seeds: &[ModuleSeed],
) -> std::collections::HashMap<Vec<u8>, String> {
    let mut table = std::collections::HashMap::new();
    for seed in seeds {
        let module_id = definy_event::event::derive_module_id(account_id, &seed.module_name);
        for part in &seed.parts {
            let id = definy_event::event::derive_module_part_id(&module_id, &part.name);
            table.insert(
                id.as_bytes().to_vec(),
                format!("{}.{}", seed.module_name, part.name),
            );
        }
    }
    table
}

/// JSON 中のパーツ ID（32 要素の数値配列）のうち、対応表にあるものを名前参照に置き換えます。
fn symbolize_part_references(
    value: &mut serde_json::Value,
    table: &std::collections::HashMap<Vec<u8>, String>,
) {
    match value {
        serde_json::Value::Array(items) => {
            if items.len() == 32 {
                let bytes: Option<Vec<u8>> = items
                    .iter()
                    .map(|item| item.as_u64().and_then(|n| u8::try_from(n).ok()))
                    .collect();
                if let Some(name) = bytes.and_then(|bytes| table.get(&bytes)) {
                    let mut reference = serde_json::Map::new();
                    reference.insert(
                        PART_REFERENCE_KEY.to_string(),
                        serde_json::Value::String(name.clone()),
                    );
                    *value = serde_json::Value::Object(reference);
                    return;
                }
            }
            for item in items {
                symbolize_part_references(item, table);
            }
        }
        serde_json::Value::Object(map) => {
            for item in map.values_mut() {
                symbolize_part_references(item, table);
            }
        }
        _ => {}
    }
}

/// seed を、パーツ ID を名前参照に置き換えた整形済み JSON 文字列にします。
///
/// `known_seeds` に含まれるモジュールのパーツへの参照が名前参照になります。
pub fn module_seed_to_json(
    seed: &ModuleSeed,
    account_id: &AccountId,
    known_seeds: &[ModuleSeed],
) -> Result<String, anyhow::Error> {
    let table = part_reference_table(account_id, known_seeds);
    let mut value = serde_json::to_value(seed)?;
    symbolize_part_references(&mut value, &table);
    Ok(serde_json::to_string_pretty(&value)?)
}

/// リポジトリにコミットされたビルトインモジュールの seed JSON（正本）。
///
/// 並び順はブートストラップ時のイベント発行順に影響しないが、出力の安定性のため固定する。
const BUILTIN_SEED_JSONS: [(&str, &str); 5] = [
    ("definy", include_str!("../../seeds/definy.json")),
    ("core", include_str!("../../seeds/core.json")),
    ("std", include_str!("../../seeds/std.json")),
    ("wasi", include_str!("../../seeds/wasi.json")),
    ("sample", include_str!("../../seeds/sample.json")),
];

static BUILTIN_MODULE_SEEDS: std::sync::OnceLock<Vec<ModuleSeed>> = std::sync::OnceLock::new();

/// ビルトインモジュール（definy, core, std, wasi, sample）の ModuleSeed リストを取得します。
///
/// 正本は `seeds/*.json` で、バイナリに埋め込まれています。seed 中の名前参照
/// `{"$part": "module.name"}` は、システムアカウント（[`crate::system_account`]）から導出した
/// パーツ ID に置き換えて読み込みます。
///
/// # Panics
///
/// 埋め込まれた seed JSON が不正な場合（`seed_tests` で検出されます）。
pub fn get_builtin_module_seeds() -> &'static [ModuleSeed] {
    BUILTIN_MODULE_SEEDS.get_or_init(|| {
        BUILTIN_SEED_JSONS
            .iter()
            .map(|(name, json)| {
                let seed = load_module_seed_from_str(json, &builtin_system_account_id())
                    .unwrap_or_else(|e| panic!("invalid builtin seed seeds/{name}.json: {e}"));
                assert_eq!(
                    &*seed.module_name, *name,
                    "module_name mismatch in seeds/{name}.json"
                );
                seed
            })
            .collect()
    })
}

/// ビルトインモジュールから名前でパーツ定義を取得します（パーツ名は全モジュールで一意）。
#[must_use]
pub fn find_builtin_part(name: &str) -> Option<&'static ModulePartEntry> {
    get_builtin_module_seeds()
        .iter()
        .flat_map(|seed| seed.parts.iter())
        .find(|part| &*part.name == name)
}

/// JSON 文字列から ModuleSeed をパースします。名前参照は `account_id` のパーツ ID に解決します。
pub fn load_module_seed_from_str(
    json: &str,
    account_id: &AccountId,
) -> Result<ModuleSeed, anyhow::Error> {
    let mut value: serde_json::Value = serde_json::from_str(json)?;
    resolve_part_references(&mut value, account_id).map_err(|e| anyhow::anyhow!(e))?;
    Ok(serde_json::from_value(value)?)
}

/// ビルトインモジュールを所有するシステムアカウントの ID を返します。
///
/// [`crate::system_account::system_account_id`] の別名です。
#[must_use]
pub fn builtin_system_account_id() -> AccountId {
    crate::system_account::system_account_id()
}

/// seed ディレクトリからの相対パスと、そこに書き出すべきファイル内容の組。
pub struct RenderedSeedFile {
    pub relative_path: PathBuf,
    pub content: String,
}

/// JSON Schema とビルトイン Seed JSON ファイル群の正規化済み内容を、ディスクに触れずに生成します。
///
/// seed JSON はそれ自体が正本なので、ここでの生成内容は「パースして整形し直した結果」です。
/// 手編集した seed の整形・スキーマ更新には `--export-seeds` を使います。
pub fn render_seed_files() -> Result<Vec<RenderedSeedFile>, anyhow::Error> {
    let mut files = vec![RenderedSeedFile {
        relative_path: Path::new("schemas").join("module-seed.schema.json"),
        content: generate_module_seed_schema_json()?,
    }];
    let seeds = get_builtin_module_seeds();
    let account_id = builtin_system_account_id();
    for seed in seeds {
        files.push(RenderedSeedFile {
            relative_path: PathBuf::from(format!("{}.json", seed.module_name)),
            content: module_seed_to_json(seed, &account_id, seeds)?,
        });
    }
    Ok(files)
}

/// ディスク上に JSON Schema とビルトイン Seed JSON ファイル群を書き出します。
///
/// `cargo run -p definy-server -- --export-seeds seeds` から呼び出されます。
pub fn export_seeds_to_disk(base_dir: &Path) -> Result<(), anyhow::Error> {
    for file in render_seed_files()? {
        let path = base_dir.join(&file.relative_path);
        if let Some(parent) = path.parent() {
            std::fs::create_dir_all(parent)?;
        }
        std::fs::write(path, file.content)?;
    }
    Ok(())
}

/// ディスク上の Seed ファイル群が、正規化済みの内容（[`render_seed_files`]）とバイト単位で一致するか検証します。
///
/// 一致しないファイル（存在しない場合を含む）の相対パス一覧を返します。空なら最新です。
pub fn find_stale_seed_files(base_dir: &Path) -> Result<Vec<PathBuf>, anyhow::Error> {
    let mut stale = Vec::new();
    for file in render_seed_files()? {
        let on_disk = std::fs::read_to_string(base_dir.join(&file.relative_path)).ok();
        if on_disk.as_deref() != Some(file.content.as_str()) {
            stale.push(file.relative_path);
        }
    }
    Ok(stale)
}

/// 自己ホスト型チェッカー (`core.type-check-against`) を用いて、
/// 指定された ModuleSeed のすべてのパーツ・式の型妥当性を検証します。
///
/// サーバーがモジュールのコミットを受け付けるときと同じ
/// [`definy_core::self_hosted_type_check::check_module_commit`] を使います。
/// 型環境には、検証するモジュール以外のビルトインモジュールの seed も入れます
pub fn validate_module_seed_with_type_checker(
    seed: &ModuleSeed,
    account_id: &AccountId,
) -> Result<(), String> {
    let core = definy_core::self_hosted_type_check::SelfHostedCoreParts::from_core_module_id(
        &definy_event::event::derive_module_id(account_id, "core"),
    );
    let module_id = definy_event::event::derive_module_id(account_id, &seed.module_name);
    // 評価器は署名を検証しないため、ダミー署名で評価用イベントを作る（秘密鍵を必要としない）
    let dummy_signature = ed25519_dalek::Signature::from_bytes(&[0u8; 64]);
    let events = get_builtin_module_seeds()
        .iter()
        .filter(|other| other.module_name != seed.module_name)
        .map(|other| {
            let event = definy_event::event::Event {
                account_id: account_id.clone(),
                time: chrono::DateTime::from_timestamp(1548909361, 0).unwrap(),
                content: definy_event::event::EventContent::ModuleCommit(
                    other.to_module_commit_event(),
                ),
            };
            let hash = definy_event::EventHashId::from_bytes(
                format!("definy:seed-validation:{}", other.module_name).as_bytes(),
            );
            (hash, Ok((dummy_signature, event)))
        })
        .collect::<Vec<definy_core::EventWithHash>>();
    definy_core::self_hosted_type_check::check_module_commit(
        &seed.to_module_commit_event(),
        &module_id,
        &events,
        &core,
        true,
    )
    .map_err(|error| format!("module '{}': {error}", seed.module_name))
}
