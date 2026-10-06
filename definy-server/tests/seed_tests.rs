use std::path::Path;

use definy_event::event::{AccountId, ModuleSeed};
use definy_server::builtin_migration::COMPILER_SYSTEM_KEY_SEED;
use definy_server::seed::{
    export_seeds_to_disk, generate_module_seed_schema_json, get_builtin_module_seeds,
    load_module_seed_from_str,
};

#[test]
fn test_generate_module_seed_schema() {
    let schema_json = generate_module_seed_schema_json().expect("Failed to generate schema");
    assert!(schema_json.contains("ModuleSeed"));
    assert!(schema_json.contains("module_name"));
    assert!(schema_json.contains("parts"));
}

#[test]
fn test_export_and_verify_builtin_seeds() {
    let workspace_root = Path::new(env!("CARGO_MANIFEST_DIR"))
        .parent()
        .expect("Workspace root");
    let seeds_dir = workspace_root.join("seeds");

    let signing_key = ed25519_dalek::SigningKey::from_bytes(&COMPILER_SYSTEM_KEY_SEED);
    let verifying_key = signing_key.verifying_key();
    let account_id = AccountId(verifying_key);

    // 1. Export schema and seed JSON files to seeds/
    export_seeds_to_disk(&seeds_dir, &account_id).expect("Failed to export seeds to disk");

    // 2. Verify that schema file exists and is valid JSON
    let schema_path = seeds_dir.join("schemas/module-seed.schema.json");
    assert!(schema_path.exists(), "Schema file must exist");
    let schema_content = std::fs::read_to_string(&schema_path).expect("Read schema file");
    let schema_val: serde_json::Value =
        serde_json::from_str(&schema_content).expect("Schema must be valid JSON");
    assert!(schema_val.get("definitions").is_some() || schema_val.get("$defs").is_some());

    // 3. Verify each module seed JSON matches the in-memory generation
    let expected_seeds = get_builtin_module_seeds(&account_id);
    for expected in expected_seeds {
        let file_name = format!("{}.json", expected.module_name);
        let file_path = seeds_dir.join(&file_name);
        assert!(file_path.exists(), "Seed file {file_name} must exist");

        let content = std::fs::read_to_string(&file_path).expect("Read seed file");
        let loaded: ModuleSeed =
            load_module_seed_from_str(&content).expect("Parse module seed JSON");

        assert_eq!(
            loaded.module_name, expected.module_name,
            "Module name must match"
        );
        assert_eq!(
            loaded.parts.len(),
            expected.parts.len(),
            "Part count must match for {}",
            expected.module_name
        );

        for (loaded_part, expected_part) in loaded.parts.iter().zip(expected.parts.iter()) {
            assert_eq!(loaded_part.name, expected_part.name, "Part name must match");
            assert_eq!(
                loaded_part.part_type, expected_part.part_type,
                "Part type must match for {}",
                loaded_part.name
            );
            assert_eq!(
                loaded_part.expression, expected_part.expression,
                "Expression must match for {}",
                loaded_part.name
            );
        }
    }
}

#[test]
fn test_self_hosted_type_checking_of_seed_files() {
    let workspace_root = Path::new(env!("CARGO_MANIFEST_DIR"))
        .parent()
        .expect("Workspace root");
    let seeds_dir = workspace_root.join("seeds");

    let signing_key = ed25519_dalek::SigningKey::from_bytes(&COMPILER_SYSTEM_KEY_SEED);
    let verifying_key = signing_key.verifying_key();
    let account_id = AccountId(verifying_key);

    // Ensure seed files are exported
    export_seeds_to_disk(&seeds_dir, &account_id).expect("Export seeds");

    // Load sample module seed from disk and run self-hosted type checker
    let sample_content =
        std::fs::read_to_string(seeds_dir.join("sample.json")).expect("Read sample.json");
    let mut sample_seed: ModuleSeed =
        load_module_seed_from_str(&sample_content).expect("Parse sample.json");

    // Filter out parts with expressions not yet represented in self-hosted core.expression (e.g. string_concat)
    // or external cross-module references (e.g. sample-ast-calc), or match requiring module-id for Variant type tag
    sample_seed.parts.retain(|p| {
        &*p.name != "greet" && &*p.name != "sample-ast-calc" && &*p.name != "match-option-sample"
    });

    for part in &sample_seed.parts {
        let single_part_seed = ModuleSeed::new(
            "sample",
            sample_seed.module_description.clone(),
            "test commit",
            vec![part.clone()],
        );
        let part_result = definy_server::seed::validate_module_seed_with_type_checker(
            &single_part_seed,
            &account_id,
        );
        assert!(
            part_result.is_ok(),
            "Part '{}' must pass self-hosted type check: {:?}",
            part.name,
            part_result
        );
    }

    let result =
        definy_server::seed::validate_module_seed_with_type_checker(&sample_seed, &account_id);
    assert!(
        result.is_ok(),
        "sample module seed must pass self-hosted type checking: {:?}",
        result
    );
}
