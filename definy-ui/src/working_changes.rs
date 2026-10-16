//! 作業中の変更 (コミット前のパーツの編集).
//!
//! git の作業ツリーのように, パーツの編集はまずブラウザのローカル (localStorage) に覚えておき,
//! 変更ページ (`/changes`) で複数のパーツの変更をまとめて 1 つのコミットにする.
//! コミットは モジュールごとの [`ModuleCommitEvent`] なので, 複数のモジュールにまたがる変更は
//! モジュールの数だけコミットになる

use definy_event::EventHashId;
use definy_event::event::{
    EventContent, ModuleCommitEvent, ModulePartEntry, PartType, derive_module_part_id,
};
use dioxus::prelude::*;

use crate::AppState;
use crate::module_projection::{ModuleSnapshot, find_module_snapshot, latest_module_parts};

/// 1 つのパーツの作業中の変更. パーツの定義全体 (名前・型・説明・式) を持つ
#[derive(Clone, Debug, PartialEq, serde::Serialize, serde::Deserialize)]
pub struct PartChange {
    /// 変更を入れるモジュール
    pub module_definition_event_hash: EventHashId,
    /// 変更するパーツの ID (コミット済みのパーツ名から導出したもの).
    /// 新しいパーツは, その名前から導出した ID
    pub part_id: EventHashId,
    /// コミット済みのパーツが無い新しいパーツか
    pub is_new: bool,
    /// 変更を記録したときのモジュールの最新コミット. 新しいモジュールでは None
    pub base_commit_hash: Option<EventHashId>,
    pub entry: ModulePartEntry,
    pub updated_at_ms: i64,
}

#[derive(Clone, Debug, Default, PartialEq, serde::Serialize, serde::Deserialize)]
pub struct WorkingChanges {
    /// 記録した順に並ぶ. 同じ `part_id` の変更は 1 つだけ
    pub changes: Vec<PartChange>,
}

impl WorkingChanges {
    pub fn find(&self, part_id: &EventHashId) -> Option<&PartChange> {
        self.changes
            .iter()
            .find(|change| &change.part_id == part_id)
    }

    pub fn contains(&self, part_id: &EventHashId) -> bool {
        self.find(part_id).is_some()
    }

    pub fn len(&self) -> usize {
        self.changes.len()
    }

    pub fn is_empty(&self) -> bool {
        self.changes.is_empty()
    }

    /// 変更を記録する. 同じパーツの変更があれば置き換える (記録した順は最初のときのまま)
    pub fn upsert(&mut self, change: PartChange) {
        match self
            .changes
            .iter_mut()
            .find(|existing| existing.part_id == change.part_id)
        {
            Some(existing) => *existing = change,
            None => self.changes.push(change),
        }
    }

    pub fn remove(&mut self, part_id: &EventHashId) {
        self.changes.retain(|change| &change.part_id != part_id);
    }

    /// 変更のあるモジュールを, 最初に変更を記録した順に返す
    pub fn modules(&self) -> Vec<EventHashId> {
        let mut modules = Vec::<EventHashId>::new();
        for change in &self.changes {
            if !modules.contains(&change.module_definition_event_hash) {
                modules.push(change.module_definition_event_hash.clone());
            }
        }
        modules
    }

    pub fn changes_in_module<'a>(
        &'a self,
        module: &'a EventHashId,
    ) -> impl Iterator<Item = &'a PartChange> + 'a {
        self.changes
            .iter()
            .filter(move |change| &change.module_definition_event_hash == module)
    }
}

/// 作業中の変更. 起動時は空で, クライアントで [`load_from_storage`] してから使う
/// (SSR の HTML と最初の描画を揃えるため, 初期化のときには localStorage を読まない)
pub static WORKING_CHANGES: GlobalSignal<WorkingChanges> = Signal::global(WorkingChanges::default);

/// [`load_from_storage`] が終わったか. 終わる前にパーツの編集欄が空の変更を記録して,
/// 保存してあった変更を消してしまわないようにする
pub static WORKING_CHANGES_LOADED: GlobalSignal<bool> = Signal::global(|| false);

#[cfg(target_arch = "wasm32")]
const STORAGE_KEY: &str = "definy_working_changes";

/// localStorage から作業中の変更を読み込む. ブラウザ以外では何もしない
pub fn load_from_storage() {
    #[cfg(target_arch = "wasm32")]
    {
        let loaded = web_sys::window()
            .and_then(|window| window.local_storage().ok().flatten())
            .and_then(|storage| storage.get_item(STORAGE_KEY).ok().flatten())
            .and_then(|encoded| decode(&encoded));
        if let Some(loaded) = loaded {
            *WORKING_CHANGES.write() = loaded;
        }
    }
    *WORKING_CHANGES_LOADED.write() = true;
}

#[cfg(target_arch = "wasm32")]
fn save_to_storage(changes: &WorkingChanges) {
    let Some(storage) = web_sys::window().and_then(|window| window.local_storage().ok().flatten())
    else {
        return;
    };
    let _ = if changes.is_empty() {
        storage.remove_item(STORAGE_KEY)
    } else {
        match encode(changes) {
            Some(encoded) => storage.set_item(STORAGE_KEY, &encoded),
            None => return,
        }
    };
}

/// localStorage に入れる文字列. イベントと同じく CBOR にして base64 で文字列にする
pub fn encode(changes: &WorkingChanges) -> Option<String> {
    serde_cbor::to_vec(changes).ok().map(|bytes| {
        base64::Engine::encode(&base64::engine::general_purpose::URL_SAFE_NO_PAD, bytes)
    })
}

pub fn decode(encoded: &str) -> Option<WorkingChanges> {
    let bytes =
        base64::Engine::decode(&base64::engine::general_purpose::URL_SAFE_NO_PAD, encoded).ok()?;
    serde_cbor::from_slice(&bytes).ok()
}

/// 作業中の変更を書き換えて localStorage に保存する
pub fn update(f: impl FnOnce(&mut WorkingChanges)) {
    let mut changes = WORKING_CHANGES.write();
    f(&mut changes);
    #[cfg(target_arch = "wasm32")]
    save_to_storage(&changes);
}

/// UI の型の欄は式で編集するため, 保存するときの型は式から戻したものになる.
/// 比較のときも同じ変換を通して, 編集していないのに差分が出ないようにする
pub fn normalize_part_type(part_type: &Option<PartType>) -> Option<PartType> {
    part_type
        .as_ref()
        .and_then(|t| PartType::from_expression(&t.to_expression()))
}

/// 2 つのパーツの定義が同じか. `content_hash` は式から決まるので比べない
pub fn same_part_definition(a: &ModulePartEntry, b: &ModulePartEntry) -> bool {
    a.name == b.name
        && normalize_part_type(&a.part_type) == normalize_part_type(&b.part_type)
        && a.description == b.description
        && a.expression == b.expression
}

/// モジュールの最新のコミットにある, `part_id` のパーツ
pub fn committed_part(
    state: &AppState,
    module: &ModuleSnapshot,
    part_id: &EventHashId,
) -> Option<ModulePartEntry> {
    latest_module_parts(state, module)?
        .into_iter()
        .find(|part| derive_module_part_id(&module.definition_event_hash, &part.name) == *part_id)
}

/// パーツの一覧に変更を適用する. 編集したパーツは同じ位置で差し替え, 新しいパーツは末尾に足す.
/// パーツの順序を保つのは, seed に書き出したときに順序だけの差分を出さないため
pub fn apply_changes<'a>(
    module_definition_event_hash: &EventHashId,
    mut parts: Vec<ModulePartEntry>,
    changes: impl IntoIterator<Item = &'a PartChange>,
) -> Vec<ModulePartEntry> {
    for change in changes {
        let position = parts.iter().position(|part| {
            derive_module_part_id(module_definition_event_hash, &part.name) == change.part_id
        });
        let index = match position {
            Some(index) => {
                parts[index] = change.entry.clone();
                index
            }
            None => {
                parts.push(change.entry.clone());
                parts.len() - 1
            }
        };
        // 名前を変えて別のパーツと同じ名前になったときは, 変更した方を残す
        let mut current = 0;
        parts.retain(|part| {
            let keep = current == index || part.name != change.entry.name;
            current += 1;
            keep
        });
    }
    parts
}

/// 何も入力しなかったときのコミットメッセージ
pub fn default_commit_message(changes: &[&PartChange]) -> String {
    let names = changes
        .iter()
        .map(|change| format!("'{}'", change.entry.name))
        .collect::<Vec<_>>()
        .join(", ");
    if changes.iter().all(|change| change.is_new) {
        if changes.len() == 1 {
            format!("Add part {names}")
        } else {
            format!("Add parts {names}")
        }
    } else if changes.len() == 1 {
        format!("Update part {names}")
    } else {
        format!("Update parts {names}")
    }
}

/// モジュールの変更をまとめた [`ModuleCommitEvent`] を作る. モジュールが見つからなければ None
pub fn build_module_commit(
    state: &AppState,
    module_definition_event_hash: &EventHashId,
    changes: &[&PartChange],
    message: &str,
) -> Option<EventContent> {
    let module = find_module_snapshot(state, module_definition_event_hash)?;
    let parts = latest_module_parts(state, &module).unwrap_or_default();
    let parts = apply_changes(module_definition_event_hash, parts, changes.iter().copied());
    let message = message.trim();
    let message = if message.is_empty() {
        default_commit_message(changes)
    } else {
        message.to_string()
    };
    Some(EventContent::ModuleCommit(ModuleCommitEvent {
        module_name: module.module_name.into(),
        module_description: module.module_description,
        parent_commit_hash: Some(module.latest_event_hash),
        message: message.into(),
        parts,
    }))
}

/// 変更を記録したあとに, モジュールに別のコミットが入ったか
pub fn is_outdated(state: &AppState, change: &PartChange) -> bool {
    match (
        find_module_snapshot(state, &change.module_definition_event_hash),
        &change.base_commit_hash,
    ) {
        (Some(module), Some(base)) => &module.latest_event_hash != base,
        _ => false,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use definy_event::event::{Expression, NumberExpression};

    fn module_id() -> EventHashId {
        EventHashId::from_bytes(b"module")
    }

    fn part(name: &str, value: i64) -> ModulePartEntry {
        ModulePartEntry {
            name: name.into(),
            part_type: Some(PartType::Number),
            description: Default::default(),
            content_hash: None,
            expression: Some(Expression::Number(NumberExpression { value })),
        }
    }

    fn change(original_name: &str, entry: ModulePartEntry, is_new: bool) -> PartChange {
        PartChange {
            module_definition_event_hash: module_id(),
            part_id: derive_module_part_id(&module_id(), original_name),
            is_new,
            base_commit_hash: None,
            entry,
            updated_at_ms: 0,
        }
    }

    #[test]
    fn apply_changes_replaces_in_place_and_appends_new_parts() {
        let parts = vec![part("a", 1), part("b", 2), part("c", 3)];
        let changes = [
            change("c", part("c", 30), false),
            change("a", part("a", 10), false),
            change("d", part("d", 4), true),
        ];
        let result = apply_changes(&module_id(), parts, changes.iter());
        assert_eq!(
            result,
            vec![part("a", 10), part("b", 2), part("c", 30), part("d", 4)]
        );
    }

    #[test]
    fn apply_changes_handles_rename() {
        let parts = vec![part("a", 1), part("b", 2)];
        let changes = [change("a", part("renamed", 1), false)];
        let result = apply_changes(&module_id(), parts, changes.iter());
        assert_eq!(result, vec![part("renamed", 1), part("b", 2)]);
    }

    #[test]
    fn apply_changes_keeps_changed_part_on_name_collision() {
        let parts = vec![part("a", 1), part("b", 2)];
        let changes = [change("a", part("b", 9), false)];
        let result = apply_changes(&module_id(), parts, changes.iter());
        assert_eq!(result, vec![part("b", 9)]);
    }

    #[test]
    fn upsert_replaces_same_part_and_keeps_order() {
        let mut changes = WorkingChanges::default();
        changes.upsert(change("a", part("a", 1), false));
        changes.upsert(change("b", part("b", 2), false));
        changes.upsert(change("a", part("a", 3), false));
        assert_eq!(changes.len(), 2);
        assert_eq!(changes.changes[0].entry, part("a", 3));
        changes.remove(&derive_module_part_id(&module_id(), "a"));
        assert_eq!(changes.len(), 1);
        assert_eq!(changes.modules(), vec![module_id()]);
    }

    #[test]
    fn encode_decode_round_trip() {
        let mut changes = WorkingChanges::default();
        changes.upsert(change("a", part("a", 1), false));
        changes.upsert(change("new", part("new", 2), true));
        let encoded = encode(&changes).unwrap();
        assert_eq!(decode(&encoded), Some(changes));
    }

    #[test]
    fn same_part_definition_ignores_content_hash() {
        let a = part("a", 1);
        let mut b = part("a", 1);
        b.content_hash = b
            .expression
            .as_ref()
            .and_then(|e| definy_event::ContentHash::from_expression(e).ok());
        assert!(same_part_definition(&a, &b));
        assert!(!same_part_definition(&a, &part("a", 2)));
    }

    #[test]
    fn default_message_lists_part_names() {
        let a = change("a", part("a", 1), false);
        let b = change("b", part("b", 1), true);
        assert_eq!(default_commit_message(&[&a]), "Update part 'a'");
        assert_eq!(default_commit_message(&[&a, &b]), "Update parts 'a', 'b'");
        assert_eq!(default_commit_message(&[&b]), "Add part 'b'");
    }
}
