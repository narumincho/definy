//! seed のパーツを自己ホスト型チェッカー (`definy_core::self_hosted_type_check`) で検査する

use definy_core::self_hosted_type_check::{
    PartToCheck, PartTypeEntry, SelfHostedCoreParts, SelfHostedTypeCheckOutcome, check_parts,
};
use definy_server::seed::{builtin_system_account_id, get_builtin_module_seeds};

struct SeedPart {
    module_name: String,
    name: String,
    hash: definy_event::EventHashId,
    part_type: definy_event::event::PartType,
    expression: definy_event::event::Expression,
}

fn seed_parts() -> Vec<SeedPart> {
    let account_id = builtin_system_account_id();
    get_builtin_module_seeds()
        .iter()
        .flat_map(|seed| {
            let module_id = definy_event::event::derive_module_id(&account_id, &seed.module_name);
            seed.parts.iter().filter_map(move |part| {
                Some(SeedPart {
                    module_name: seed.module_name.to_string(),
                    name: part.name.to_string(),
                    hash: definy_event::event::derive_module_part_id(&module_id, &part.name),
                    part_type: part.part_type.clone()?,
                    expression: part.expression.clone()?,
                })
            })
        })
        .collect()
}

fn seed_events() -> Vec<definy_core::EventWithHash> {
    let account_id = builtin_system_account_id();
    // 評価器は署名を検証しないため, ダミー署名で評価用イベントを作る
    let dummy_signature = ed25519_dalek::Signature::from_bytes(&[0u8; 64]);
    get_builtin_module_seeds()
        .iter()
        .map(|seed| {
            let event = definy_event::event::Event {
                account_id: account_id.clone(),
                time: chrono::DateTime::from_timestamp(1548909361, 0).unwrap(),
                content: definy_event::event::EventContent::ModuleCommit(
                    seed.to_module_commit_event(),
                ),
            };
            let hash = definy_event::EventHashId::from_bytes(
                format!("definy:self-hosted-type-check:{}", seed.module_name).as_bytes(),
            );
            (hash, Ok((dummy_signature, event)))
        })
        .collect()
}

fn check_seed_parts() -> Vec<(SeedPart, SelfHostedTypeCheckOutcome)> {
    let parts = seed_parts();
    let core_module_id =
        definy_event::event::derive_module_id(&builtin_system_account_id(), "core");
    let core = SelfHostedCoreParts::from_core_module_id(&core_module_id);
    let env = parts
        .iter()
        .map(|part| PartTypeEntry {
            part_definition_event_hash: &part.hash,
            part_type: &part.part_type,
            type_declaration: (part.part_type == definy_event::event::PartType::Type)
                .then_some(&part.expression),
        })
        .collect::<Vec<_>>();
    let to_check = parts
        .iter()
        .map(|part| PartToCheck {
            expression: &part.expression,
            part_type: &part.part_type,
        })
        .collect::<Vec<_>>();
    let outcomes = check_parts(&to_check, &env, &core, &seed_events());
    parts.into_iter().zip(outcomes).collect()
}

/// seed のすべてのパーツが自己ホスト型チェッカーで型エラーにならないこと.
/// `core.expression` で表せないパーツ (コンパイラ組み込みなど) は対象外
#[test]
fn seed_parts_pass_self_hosted_type_check() {
    let results = check_seed_parts();
    let mut type_errors = Vec::new();
    let mut unsupported = Vec::new();
    for (part, outcome) in &results {
        let name = format!("{}.{}", part.module_name, part.name);
        match outcome {
            SelfHostedTypeCheckOutcome::Ok => {}
            SelfHostedTypeCheckOutcome::TypeError(error) => {
                type_errors.push(format!("{name}: {error}"))
            }
            SelfHostedTypeCheckOutcome::Unsupported(message) => {
                unsupported.push(format!("{name}: {message}"))
            }
            SelfHostedTypeCheckOutcome::CheckerFailed(message) => {
                let first_line = message.lines().next().unwrap_or_default();
                type_errors.push(format!("{name}: checker failed: {first_line}"))
            }
        }
    }
    eprintln!(
        "checked {} parts, {} type errors, {} unsupported",
        results.len(),
        type_errors.len(),
        unsupported.len()
    );
    for line in &unsupported {
        eprintln!("unsupported {line}");
    }
    assert!(
        type_errors.is_empty(),
        "type errors:\n{}",
        type_errors.join("\n")
    );
}

#[test]
#[ignore]
fn print_self_hosted_type_check_durations() {
    let parts = seed_parts();
    let core_module_id =
        definy_event::event::derive_module_id(&builtin_system_account_id(), "core");
    let core = SelfHostedCoreParts::from_core_module_id(&core_module_id);
    let env = parts
        .iter()
        .map(|part| PartTypeEntry {
            part_definition_event_hash: &part.hash,
            part_type: &part.part_type,
            type_declaration: (part.part_type == definy_event::event::PartType::Type)
                .then_some(&part.expression),
        })
        .collect::<Vec<_>>();
    let events = seed_events();
    for part in &parts {
        let start = std::time::Instant::now();
        let outcome = check_parts(
            &[PartToCheck {
                expression: &part.expression,
                part_type: &part.part_type,
            }],
            &env,
            &core,
            &events,
        );
        let ok = matches!(outcome[0], SelfHostedTypeCheckOutcome::Ok);
        eprintln!(
            "{:>8.1}ms {} {}.{}",
            start.elapsed().as_secs_f64() * 1000.0,
            if ok { "ok " } else { "NG " },
            part.module_name,
            part.name
        );
    }
}
