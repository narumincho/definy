use std::path::{Path, PathBuf};

use definy_event::event::{AccountId, Description, ModuleSeed};
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

/// ビルトインモジュール（core, std, wasi, sample）の ModuleSeed リストを取得します。
pub fn get_builtin_module_seeds(account_id: &AccountId) -> Vec<ModuleSeed> {
    let core_module_id = definy_event::event::derive_module_id(account_id, "core");
    let std_module_id = definy_event::event::derive_module_id(account_id, "std");
    let wasi_module_id = definy_event::event::derive_module_id(account_id, "wasi");

    let definy_module_id = definy_event::event::derive_module_id(account_id, "definy");

    vec![
        ModuleSeed::new(
            "definy",
            Description::localized(vec![
                ("en", "Definy platform runtime and preview features"),
                (
                    "ja",
                    "definy プラットフォームのランタイムおよびプレビュー機能",
                ),
            ]),
            "Initial commit for definy module",
            crate::builtin_definy_parts::create_definy_module_parts(
                &definy_module_id,
                &std_module_id,
            ),
        ),
        ModuleSeed::new(
            "core",
            Description::localized(vec![
                ("en", "Core built-in module for definy"),
                ("ja", "definy のコア組み込みモジュール"),
            ]),
            "Initial commit for core module",
            crate::builtin_core_parts::create_core_module_parts(&core_module_id),
        ),
        ModuleSeed::new(
            "std",
            Description::localized(vec![
                (
                    "en",
                    "Definy standard utility functions (pure math, logic, list, UTF-8 stream, URL operations)",
                ),
                (
                    "ja",
                    "definy の標準ユーティリティ関数群 (数学・論理・リスト・UTF-8ストリーム・URL操作)",
                ),
            ]),
            "Initial commit for std module",
            crate::builtin_std_functions::create_std_module_parts(&std_module_id),
        ),
        ModuleSeed::new(
            "wasi",
            Description::localized(vec![
                (
                    "en",
                    "WASI 0.3 capabilities (Clocks, Random, I/O) for capability-based DI",
                ),
                (
                    "ja",
                    "WASI 0.3 能力インターフェース (時計・乱数・I/O) と能力注入基盤",
                ),
            ]),
            "Initial commit for wasi module",
            crate::builtin_wasi::create_wasi_module_parts(&wasi_module_id),
        ),
        ModuleSeed::new(
            "sample",
            Description::localized(vec![
                (
                    "en",
                    "Sample programs showcasing definy expressions and computations",
                ),
                (
                    "ja",
                    "definy の計算式や機能を体験できるサンプルプログラム集",
                ),
            ]),
            "Initial commit for sample module",
            crate::builtin_sample_parts::create_sample_module_parts(
                &core_module_id,
                &std_module_id,
                &definy_module_id,
            ),
        ),
    ]
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

/// JSON Schema とビルトイン Seed JSON ファイル群の内容を、ディスクに触れずに生成します。
pub fn render_seed_files(account_id: &AccountId) -> Result<Vec<RenderedSeedFile>, anyhow::Error> {
    let mut files = vec![RenderedSeedFile {
        relative_path: Path::new("schemas").join("module-seed.schema.json"),
        content: generate_module_seed_schema_json()?,
    }];
    for seed in get_builtin_module_seeds(account_id) {
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
pub fn export_seeds_to_disk(base_dir: &Path, account_id: &AccountId) -> Result<(), anyhow::Error> {
    for file in render_seed_files(account_id)? {
        let path = base_dir.join(&file.relative_path);
        if let Some(parent) = path.parent() {
            std::fs::create_dir_all(parent)?;
        }
        std::fs::write(path, file.content)?;
    }
    Ok(())
}

/// ディスク上の Seed ファイル群が、現在のビルトイン定義から生成される内容とバイト単位で一致するか検証します。
///
/// 一致しないファイル（存在しない場合を含む）の相対パス一覧を返します。空なら最新です。
pub fn find_stale_seed_files(
    base_dir: &Path,
    account_id: &AccountId,
) -> Result<Vec<PathBuf>, anyhow::Error> {
    let mut stale = Vec::new();
    for file in render_seed_files(account_id)? {
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
    let seeds = get_builtin_module_seeds(account_id);
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
