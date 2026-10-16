use std::path::Path;

use definy_event::event::ModuleSeed;
use definy_server::seed::{
    builtin_system_account_id, export_seeds_to_disk, find_builtin_part, find_stale_seed_files,
    generate_module_seed_schema_json, get_builtin_module_seeds, load_module_seed_from_str,
    module_seed_to_json, render_seed_files,
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

/// seed はパーツ ID を名前参照で持つため、システムアカウントの鍵に依存しないことを検証します。
#[test]
fn test_seed_json_is_independent_of_system_account_key() {
    let other_account = definy_event::event::AccountId(
        ed25519_dalek::SigningKey::from_bytes(&[42u8; 32]).verifying_key(),
    );
    let seeds_dir = seeds_dir();
    let mut loaded = Vec::new();
    for name in ["definy", "core", "std", "wasi", "sample"] {
        let json = std::fs::read_to_string(seeds_dir.join(format!("{name}.json"))).unwrap();
        loaded.push((
            json.clone(),
            load_module_seed_from_str(&json, &other_account).unwrap(),
        ));
    }
    // パーツ参照を含む core.json は名前参照で書かれている
    assert!(
        loaded[1].0.contains("\"$part\""),
        "core.json must use $part references"
    );
    let seeds: Vec<ModuleSeed> = loaded.iter().map(|(_, seed)| seed.clone()).collect();

    // 別アカウントで読み込んだ seed は、ビルトイン（システムアカウント）版とパーツ参照のハッシュが異なる
    assert_ne!(seeds[1], get_builtin_module_seeds()[1]);

    // 別アカウントで読み込んで書き戻しても、元の JSON と一致する
    for (json, seed) in &loaded {
        let rendered = module_seed_to_json(seed, &other_account, &seeds).unwrap();
        assert!(&rendered == json, "{} must round-trip", seed.module_name);
    }
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
    let sample_seed: ModuleSeed =
        load_module_seed_from_str(&sample_content, &account_id).expect("Parse sample.json");

    let result =
        definy_server::seed::validate_module_seed_with_type_checker(&sample_seed, &account_id);
    assert!(
        result.is_ok(),
        "sample module seed must pass self-hosted type checking: {:?}",
        result
    );
}
