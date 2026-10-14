use std::path::{Path, PathBuf};

use definy_event::event::{AccountId, ModulePartEntry, ModuleSeed};
use schemars::schema_for;

/// ModuleSeed の JSON Schema を生成します。
pub fn generate_module_seed_schema() -> schemars::schema::RootSchema {
    schema_for!(ModuleSeed)
}

/// JSON Schema 文字列を生成します。
pub fn generate_module_seed_schema_json() -> Result<String, serde_json::Error> {
    let schema = generate_module_seed_schema();
    serde_json::to_string_pretty(&schema)
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
/// 正本は `seeds/*.json` で、バイナリに埋め込まれています。パーツ間参照のハッシュは
/// ビルトインシステムアカウント（[`builtin_system_account_id`]）を前提に計算済みです。
///
/// # Panics
///
/// 埋め込まれた seed JSON が不正な場合（`seed_tests` で検出されます）。
pub fn get_builtin_module_seeds() -> &'static [ModuleSeed] {
    BUILTIN_MODULE_SEEDS.get_or_init(|| {
        BUILTIN_SEED_JSONS
            .iter()
            .map(|(name, json)| {
                let seed = load_module_seed_from_str(json)
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

/// JSON 文字列から ModuleSeed をパースします。
pub fn load_module_seed_from_str(json: &str) -> Result<ModuleSeed, serde_json::Error> {
    serde_json::from_str(json)
}

/// ビルトインモジュールを所有するシステムアカウントの ID を返します。
#[must_use]
pub fn builtin_system_account_id() -> AccountId {
    let signing_key =
        ed25519_dalek::SigningKey::from_bytes(&crate::builtin_migration::COMPILER_SYSTEM_KEY_SEED);
    AccountId(signing_key.verifying_key())
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
    for seed in get_builtin_module_seeds() {
        files.push(RenderedSeedFile {
            relative_path: PathBuf::from(format!("{}.json", seed.module_name)),
            content: serde_json::to_string_pretty(&seed)?,
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

/// 自己ホスト型チェッカー (`core.validate-module`) を用いて、
/// 指定された ModuleSeed のすべてのパーツ・式の型妥当性を検証します。
pub fn validate_module_seed_with_type_checker(
    seed: &ModuleSeed,
    account_id: &AccountId,
) -> Result<(), String> {
    let commit = seed.to_module_commit_event();
    let core_module_id = definy_event::event::derive_module_id(account_id, "core");
    let expression_type_hash =
        definy_event::event::derive_module_part_id(&core_module_id, "expression");
    let type_ast_hash = definy_event::event::derive_module_part_id(&core_module_id, "type-ast");
    let validate_module_hash =
        definy_event::event::derive_module_part_id(&core_module_id, "validate-module");
    let module_id = definy_event::event::derive_module_id(account_id, &seed.module_name);

    let module_value = crate::self_hosted_ast::module_commit_to_self_hosted_ast(
        &commit,
        &module_id,
        &expression_type_hash,
        &type_ast_hash,
    )?;

    let signing_key =
        ed25519_dalek::SigningKey::from_bytes(&crate::builtin_migration::COMPILER_SYSTEM_KEY_SEED);
    let seeds = get_builtin_module_seeds();
    let mut events = Vec::new();

    // core モジュールのイベントを準備（型チェッカー自体の定義を含む）
    if let Some(core_seed) = seeds.iter().find(|s| &*s.module_name == "core") {
        let core_event = definy_event::event::Event {
            account_id: account_id.clone(),
            time: chrono::DateTime::from_timestamp(1548909361, 0).unwrap(),
            content: definy_event::event::EventContent::ModuleCommit(
                core_seed.to_module_commit_event(),
            ),
        };
        let core_binary = definy_event::sign_and_serialize(core_event.clone(), &signing_key)
            .map_err(|e| e.to_string())?;
        let core_hash = definy_event::EventHashId::from_bytes(&core_binary);
        events.push((
            core_hash,
            definy_event::verify_and_deserialize(&core_binary),
        ));
    }

    let validation_call =
        definy_event::event::Expression::Call(definy_event::event::CallExpression {
            function: Box::new(definy_event::event::Expression::PartReference(
                definy_event::event::PartReferenceExpression::new(validate_module_hash),
            )),
            arguments: vec![definy_event::event::CallArgument {
                name: "module".into(),
                value: Box::new(module_value),
            }],
        });

    match definy_core::evaluate_expression(&validation_call, &events) {
        Ok(definy_core::Value::Bool(true)) => Ok(()),
        Ok(definy_core::Value::Bool(false)) => Err(format!(
            "self-hosted type checker rejected module '{}'",
            seed.module_name
        )),
        Ok(value) => Err(format!(
            "self-hosted validator returned unexpected value: {value}"
        )),
        Err(error) => Err(format!("self-hosted module validation failed: {error}")),
    }
}
