//! コミット履歴のグラフ (VS Code の Git Graph 拡張のような, 枝分かれを線で描いた一覧) の計算.
//!
//! 各 [`ModuleCommitEvent`] は親コミット (`parent_commit_hash`) を 1 つだけ持つので,
//! マージは無く, 同じ親から複数のコミットが作られたときだけ枝分かれする.
//! モジュールごとに別の木になるので, 全モジュールを並べるとモジュールごとに別のレーンになる

use definy_event::EventHashId;
use definy_event::event::{AccountId, EventContent, ModuleCommitEvent, ModulePartEntry};

use crate::AppState;

#[derive(Clone, PartialEq)]
pub struct CommitNode {
    pub hash: EventHashId,
    pub parent: Option<EventHashId>,
    pub module_definition_event_hash: EventHashId,
    pub account_id: AccountId,
    pub time: chrono::DateTime<chrono::Utc>,
    pub commit: ModuleCommitEvent,
}

/// 取得済みのモジュールのコミットを新しい順に返す. `module` を指定するとそのモジュールだけ
pub fn collect_commits(state: &AppState, module: Option<&EventHashId>) -> Vec<CommitNode> {
    let mut commits = state
        .event_cache
        .iter()
        .filter_map(|(hash, event_result)| {
            let (_, event) = event_result.as_ref().ok()?;
            let EventContent::ModuleCommit(commit) = &event.content else {
                return None;
            };
            let module_id =
                definy_event::event::derive_module_id(&event.account_id, &commit.module_name);
            if module.is_some_and(|module| module != &module_id) {
                return None;
            }
            Some(CommitNode {
                hash: hash.clone(),
                parent: commit.parent_commit_hash.clone(),
                module_definition_event_hash: module_id,
                account_id: event.account_id.clone(),
                time: event.time,
                commit: commit.clone(),
            })
        })
        .collect::<Vec<_>>();
    // 時刻が同じ (seed など) ときも順序が変わらないようハッシュでも並べる
    commits.sort_by(|a, b| b.time.cmp(&a.time).then_with(|| b.hash.cmp(&a.hash)));
    commits
}

/// グラフの 1 行 (1 コミット) に描く線
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum Segment {
    /// 上端から下端まで, このレーンをまっすぐ通る (このコミットとは関係のない枝)
    Pass(usize),
    /// 上端の `from` のレーンから, このコミットの点へ入る (子コミットからの線)
    Into { from: usize },
    /// このコミットの点から下端へ, 親コミットへ向かう
    Out,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct GraphRow {
    /// コミットの点を置くレーン
    pub column: usize,
    pub segments: Vec<Segment>,
}

impl GraphRow {
    /// この行で使っているレーンの数 (描画の幅)
    pub fn width(&self) -> usize {
        self.segments
            .iter()
            .map(|segment| match segment {
                Segment::Pass(lane) => *lane,
                Segment::Into { from } => *from,
                Segment::Out => self.column,
            })
            .chain(std::iter::once(self.column))
            .max()
            .unwrap_or(0)
            + 1
    }
}

/// 新しい順に並んだコミットの (ハッシュ, 親) から, 各行に描く線を計算する.
///
/// レーンごとに「次にこのレーンに来るはずのコミット」を覚えておき, 上から順に置いていく.
/// 親が一覧に無い (まだ取得していない, または最初のコミット) ときはそのレーンを閉じる
pub fn layout(commits: &[(EventHashId, Option<EventHashId>)]) -> Vec<GraphRow> {
    let known = commits
        .iter()
        .map(|(hash, _)| hash.clone())
        .collect::<std::collections::HashSet<_>>();
    let mut lanes: Vec<Option<EventHashId>> = Vec::new();
    let mut rows = Vec::with_capacity(commits.len());
    for (hash, parent) in commits {
        let children = lanes
            .iter()
            .enumerate()
            .filter(|(_, expected)| expected.as_ref() == Some(hash))
            .map(|(lane, _)| lane)
            .collect::<Vec<_>>();
        let column = match children.first() {
            Some(lane) => *lane,
            None => match lanes.iter().position(Option::is_none) {
                Some(free) => free,
                None => {
                    lanes.push(None);
                    lanes.len() - 1
                }
            },
        };
        let mut segments = Vec::new();
        for (lane, expected) in lanes.iter().enumerate() {
            if expected.is_none() {
                continue;
            }
            if children.contains(&lane) {
                segments.push(Segment::Into { from: lane });
            } else {
                segments.push(Segment::Pass(lane));
            }
        }
        // 枝分かれしていた子のレーンはここで合流して閉じる
        for lane in &children {
            lanes[*lane] = None;
        }
        let next = parent.clone().filter(|parent| known.contains(parent));
        if next.is_some() {
            segments.push(Segment::Out);
        }
        lanes[column] = next;
        while lanes.last().is_some_and(Option::is_none) {
            lanes.pop();
        }
        rows.push(GraphRow { column, segments });
    }
    rows
}

/// 親コミットと比べたパーツの変化
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum PartDiff {
    Added(String),
    Modified(String),
    Removed(String),
}

/// コミットで変わったパーツ. 親が取得できていなければ, 全パーツを追加として扱う
pub fn diff_parts(parent: Option<&[ModulePartEntry]>, parts: &[ModulePartEntry]) -> Vec<PartDiff> {
    let parent = parent.unwrap_or(&[]);
    let mut diffs = Vec::new();
    for part in parts {
        match parent.iter().find(|p| p.name == part.name) {
            None => diffs.push(PartDiff::Added(part.name.to_string())),
            Some(before) => {
                if !crate::working_changes::same_part_definition(before, part) {
                    diffs.push(PartDiff::Modified(part.name.to_string()));
                }
            }
        }
    }
    for before in parent {
        if !parts.iter().any(|p| p.name == before.name) {
            diffs.push(PartDiff::Removed(before.name.to_string()));
        }
    }
    diffs
}

/// 取得済みのコミットのパーツ一覧
pub fn commit_parts(state: &AppState, hash: &EventHashId) -> Option<Vec<ModulePartEntry>> {
    let (_, event) = state.event_cache.get(hash)?.as_ref().ok()?;
    match &event.content {
        EventContent::ModuleCommit(commit) => Some(commit.parts.clone()),
        _ => None,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn h(name: &str) -> EventHashId {
        EventHashId::from_bytes(name.as_bytes())
    }

    #[test]
    fn linear_history_uses_one_lane() {
        let commits = vec![
            (h("c"), Some(h("b"))),
            (h("b"), Some(h("a"))),
            (h("a"), None),
        ];
        let rows = layout(&commits);
        assert_eq!(
            rows,
            vec![
                GraphRow {
                    column: 0,
                    segments: vec![Segment::Out]
                },
                GraphRow {
                    column: 0,
                    segments: vec![Segment::Into { from: 0 }, Segment::Out]
                },
                GraphRow {
                    column: 0,
                    segments: vec![Segment::Into { from: 0 }]
                },
            ]
        );
    }

    #[test]
    fn branch_from_same_parent_uses_second_lane_and_joins() {
        // b1 と b2 が同じ親 a から作られた
        let commits = vec![
            (h("b2"), Some(h("a"))),
            (h("b1"), Some(h("a"))),
            (h("a"), None),
        ];
        let rows = layout(&commits);
        assert_eq!(rows[0].column, 0);
        assert_eq!(rows[1].column, 1);
        assert_eq!(
            rows[1].segments,
            vec![Segment::Pass(0), Segment::Out],
            "b1 は 2 本目のレーン. 1 本目は b2 から a への線が通る"
        );
        assert_eq!(rows[2].column, 0);
        assert_eq!(
            rows[2].segments,
            vec![Segment::Into { from: 0 }, Segment::Into { from: 1 }]
        );
        assert_eq!(rows[1].width(), 2);
    }

    #[test]
    fn separate_modules_get_separate_lanes() {
        let commits = vec![(h("x2"), Some(h("x1"))), (h("y1"), None), (h("x1"), None)];
        let rows = layout(&commits);
        assert_eq!(rows[0].column, 0);
        assert_eq!(rows[1].column, 1);
        assert_eq!(rows[1].segments, vec![Segment::Pass(0)]);
        assert_eq!(rows[2].column, 0);
    }

    #[test]
    fn missing_parent_closes_lane() {
        let commits = vec![(h("b"), Some(h("unknown")))];
        let rows = layout(&commits);
        assert_eq!(rows[0].segments, vec![]);
    }

    #[test]
    fn diff_detects_added_modified_removed() {
        let part = |name: &str, value: i64| ModulePartEntry {
            name: name.into(),
            part_type: None,
            description: Default::default(),
            content_hash: None,
            expression: Some(definy_event::event::Expression::Number(
                definy_event::event::NumberExpression { value },
            )),
        };
        let before = vec![part("a", 1), part("b", 1)];
        let after = vec![part("a", 2), part("c", 1)];
        assert_eq!(
            diff_parts(Some(&before), &after),
            vec![
                PartDiff::Modified("a".into()),
                PartDiff::Added("c".into()),
                PartDiff::Removed("b".into()),
            ]
        );
    }
}
