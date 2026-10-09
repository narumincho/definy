use std::path::Path;

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
    let wasi_module_id = definy_event::event::derive_module_id(account_id, "wasi");

    vec![
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
                    "Definy standard utility functions (pure math, logic, list operations)",
                ),
                (
                    "ja",
                    "definy の標準ユーティリティ関数群 (数学・論理・リスト操作)",
                ),
            ]),
            "Initial commit for std module",
            crate::builtin_std_functions::create_std_module_parts(),
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
            crate::builtin_sample_parts::create_sample_module_parts(&core_module_id),
        ),
    ]
}

/// JSON 文字列から ModuleSeed をパースします。
pub fn load_module_seed_from_str(json: &str) -> Result<ModuleSeed, serde_json::Error> {
    serde_json::from_str(json)
}

/// ディスク上に JSON Schema とビルトイン Seed JSON ファイル群を書き出します。
pub fn export_seeds_to_disk(base_dir: &Path, account_id: &AccountId) -> Result<(), anyhow::Error> {
    let schema_dir = base_dir.join("schemas");
    std::fs::create_dir_all(&schema_dir)?;

    let schema_json = generate_module_seed_schema_json()?;
    std::fs::write(schema_dir.join("module-seed.schema.json"), schema_json)?;

    let seeds = get_builtin_module_seeds(account_id);
    for seed in seeds {
        let file_name = format!("{}.json", seed.module_name);
        let file_path = base_dir.join(file_name);
        let json = serde_json::to_string_pretty(&seed)?;
        std::fs::write(file_path, json)?;
    }

    Ok(())
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
