use std::path::Path;

use definy_event::event::ModuleSeed;
use definy_server::seed::{
    builtin_system_account_id, export_seeds_to_disk, find_builtin_part, find_stale_seed_files,
    generate_module_seed_schema_json, get_builtin_module_seeds, load_module_seed_from_str,
    render_seed_files,
};

#[test]
fn test_generate_module_seed_schema() {
    let schema_json = generate_module_seed_schema_json().expect("Failed to generate schema");
    assert!(schema_json.contains("ModuleSeed"));
    assert!(schema_json.contains("module_name"));
    assert!(schema_json.contains("parts"));
}

/// コミット済みの `seeds/`（正本）が正規化済みの形式で保存され、JSON Schema も最新であることを検証します。
///
/// このテストはディスクへ書き込みません。不一致の場合は
/// `cargo run -p definy-server -- --export-seeds seeds` で整形し直してコミットしてください。
#[test]
fn test_committed_seeds_are_normalized() {
    let seeds_dir = seeds_dir();

    let stale = find_stale_seed_files(&seeds_dir).expect("Render seeds");
    assert!(
        stale.is_empty(),
        "seeds/ is not normalized: {stale:?}\nRun `cargo run -p definy-server -- --export-seeds seeds` and commit the result."
    );

    let schema_content = std::fs::read_to_string(seeds_dir.join("schemas/module-seed.schema.json"))
        .expect("Read schema file");
    let schema_val: serde_json::Value =
        serde_json::from_str(&schema_content).expect("Schema must be valid JSON");
    assert!(schema_val.get("definitions").is_some() || schema_val.get("$defs").is_some());

    let names: Vec<&str> = get_builtin_module_seeds()
        .iter()
        .map(|seed| &*seed.module_name)
        .collect();
    assert_eq!(names, vec!["definy", "core", "std", "wasi", "sample"]);
}

/// パーツ名は全ビルトインモジュールで一意であること（`find_builtin_part` の前提）を検証します。
#[test]
fn test_builtin_part_names_are_unique() {
    let mut seen = std::collections::HashSet::new();
    for seed in get_builtin_module_seeds() {
        for part in &seed.parts {
            assert!(
                seen.insert(part.name.clone()),
                "duplicate builtin part name: {} (module {})",
                part.name,
                seed.module_name
            );
        }
    }
    assert!(find_builtin_part("type-check").is_some());
    assert!(find_builtin_part("no-such-part").is_none());
}

/// 整形されていない seed を検出できること自体を検証します（一時ディレクトリを使用）。
#[test]
fn test_find_stale_seed_files_detects_drift() {
    let tmp = std::env::temp_dir().join(format!("definy-seed-drift-{}", std::process::id()));
    let _ = std::fs::remove_dir_all(&tmp);

    // 空ディレクトリでは全ファイルが stale
    std::fs::create_dir_all(&tmp).expect("Create tmp dir");
    let expected_count = render_seed_files().expect("Render").len();
    assert_eq!(
        find_stale_seed_files(&tmp).expect("Check").len(),
        expected_count
    );

    // 書き出し直後は stale なし
    export_seeds_to_disk(&tmp).expect("Export");
    assert!(find_stale_seed_files(&tmp).expect("Check").is_empty());

    // 1 ファイルを改変すると検出される
    let std_path = tmp.join("std.json");
    let mut content = std::fs::read_to_string(&std_path).expect("Read std.json");
    content.push('\n');
    std::fs::write(&std_path, content).expect("Write std.json");
    assert_eq!(
        find_stale_seed_files(&tmp).expect("Check"),
        vec![std::path::PathBuf::from("std.json")]
    );

    let _ = std::fs::remove_dir_all(&tmp);
}

fn seeds_dir() -> std::path::PathBuf {
    Path::new(env!("CARGO_MANIFEST_DIR"))
        .parent()
        .expect("Workspace root")
        .join("seeds")
}

#[test]
fn test_self_hosted_type_checking_of_seed_files() {
    let seeds_dir = seeds_dir();
    let account_id = builtin_system_account_id();

    // Load sample module seed from disk and run self-hosted type checker
    let sample_content =
        std::fs::read_to_string(seeds_dir.join("sample.json")).expect("Read sample.json");
    let mut sample_seed: ModuleSeed =
        load_module_seed_from_str(&sample_content).expect("Parse sample.json");

    // Filter out parts with expressions not yet represented in self-hosted core.expression (e.g. string_concat)
    // or external cross-module references (e.g. sample-ast-calc), or match requiring module-id for Variant type tag
    sample_seed.parts.retain(|p| {
        &*p.name != "greet"
            && &*p.name != "sample-ast-calc"
            && &*p.name != "match-option-sample"
            && &*p.name != "self-hosted-definy-server"
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
