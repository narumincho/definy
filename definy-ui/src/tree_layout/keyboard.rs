//! ツリーエディタのキーボードによる選択移動 (docs/key.md).
//!
//! - WASD / 矢印キー: 画面上の配置の方向にある式へ移動
//! - Q: 親の式へ, Shift+Q: ルートの式へ
//! - E: 子の式の先頭へ, Shift+E: 子の式の末尾へ
//!
//! 移動先の決定は DOM に依存しない純粋な関数にしてテストできるようにしている.

use dioxus::prelude::{Key, Modifiers};

use crate::app_state::PathStep;

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum NavKey {
    Up,
    Down,
    Left,
    Right,
    Parent,
    Root,
    FirstChild,
    LastChild,
}

impl NavKey {
    /// キー入力を移動の種類に変換する. Ctrl / Meta / Alt 付き (ブラウザのショートカット) は対象外
    pub fn from_key(key: &Key, modifiers: Modifiers) -> Option<Self> {
        if modifiers.ctrl() || modifiers.meta() || modifiers.alt() {
            return None;
        }
        let shift = modifiers.shift();
        match key {
            Key::ArrowUp => Some(Self::Up),
            Key::ArrowDown => Some(Self::Down),
            Key::ArrowLeft => Some(Self::Left),
            Key::ArrowRight => Some(Self::Right),
            Key::Character(c) => match c.as_str() {
                "w" | "W" => Some(Self::Up),
                "s" | "S" => Some(Self::Down),
                "a" | "A" => Some(Self::Left),
                "d" | "D" => Some(Self::Right),
                "q" if !shift => Some(Self::Parent),
                "q" | "Q" => Some(Self::Root),
                "e" if !shift => Some(Self::FirstChild),
                "e" | "E" => Some(Self::LastChild),
                _ => None,
            },
            _ => None,
        }
    }
}

/// 画面上の矩形 (getBoundingClientRect の値)
#[derive(Clone, Copy, Debug, PartialEq)]
pub struct Rect {
    pub left: f64,
    pub top: f64,
    pub right: f64,
    pub bottom: f64,
}

impl Rect {
    fn center_x(&self) -> f64 {
        (self.left + self.right) / 2.0
    }

    fn center_y(&self) -> f64 {
        (self.top + self.bottom) / 2.0
    }
}

/// 選択できる式の一覧 (表示順) から, `current` を `key` の方向に動かした先の式のパスを返す.
///
/// `nodes` は式のパスごとに 1 つ (その式全体を囲む要素の矩形) で, 画面上の表示順 (行きがけ順) に並んでいること.
/// 未選択のときはルート (先頭) を選ぶ. 移動先がなければ `None`
pub fn navigate(
    nodes: &[(Vec<PathStep>, Rect)],
    current: Option<&[PathStep]>,
    key: NavKey,
) -> Option<Vec<PathStep>> {
    let root = nodes.first().map(|(path, _)| path.clone());
    let Some(current) = current.filter(|c| nodes.iter().any(|(p, _)| p == c)) else {
        return root;
    };
    match key {
        NavKey::Root => root.filter(|r| r != current),
        NavKey::Parent => {
            // 中間のパス (例えば let の束縛) が画面上の式に対応しないこともあるので, 見つかるまで上る
            let mut path = current.to_vec();
            while path.pop().is_some() {
                if nodes.iter().any(|(p, _)| *p == path) {
                    return Some(path);
                }
            }
            None
        }
        NavKey::FirstChild | NavKey::LastChild => {
            let descendants = nodes
                .iter()
                .map(|(p, _)| p)
                .filter(|p| p.len() > current.len() && p.starts_with(current));
            // 直下の子が表示されていなければ, 最も浅い子孫を子とみなす
            let min_depth = descendants.clone().map(Vec::len).min()?;
            let mut children = descendants.filter(|p| p.len() == min_depth);
            if key == NavKey::FirstChild {
                children.next().cloned()
            } else {
                children.next_back().cloned()
            }
        }
        NavKey::Up | NavKey::Down | NavKey::Left | NavKey::Right => {
            find_spatial_neighbor(nodes, current, key)
        }
    }
}

fn find_spatial_neighbor(
    nodes: &[(Vec<PathStep>, Rect)],
    current: &[PathStep],
    key: NavKey,
) -> Option<Vec<PathStep>> {
    let current_rect = nodes.iter().find(|(p, _)| p == current)?.1;
    let c = current_rect;
    let (c_cx, c_cy) = (c.center_x(), c.center_y());

    // 祖先・子孫は Q / E で移動するので, 方向移動の候補からは外す
    let candidates: Vec<&(Vec<PathStep>, Rect)> = nodes
        .iter()
        .filter(|(p, _)| !p.starts_with(current) && !current.starts_with(p))
        .collect();

    let best_in = |candidates: &[&(Vec<PathStep>, Rect)]| -> Option<Vec<PathStep>> {
        candidates
            .iter()
            .filter_map(|(p, r)| {
                let (r_cx, r_cy) = (r.center_x(), r.center_y());
                let (axial, orthogonal) = match key {
                    NavKey::Up if r.bottom <= c_cy || r_cy < c_cy => {
                        ((c.top - r.bottom).max(c_cy - r_cy), (c_cx - r_cx).abs())
                    }
                    NavKey::Down if r.top >= c_cy || r_cy > c_cy => {
                        ((r.top - c.bottom).max(r_cy - c_cy), (c_cx - r_cx).abs())
                    }
                    NavKey::Left if r.right <= c_cx || r_cx < c_cx => {
                        ((c.left - r.right).max(c_cx - r_cx), (c_cy - r_cy).abs())
                    }
                    NavKey::Right if r.left >= c_cx || r_cx > c_cx => {
                        ((r.left - c.right).max(r_cx - c_cx), (c_cy - r_cy).abs())
                    }
                    _ => return None,
                };
                // 進行方向の距離を重く見て, 横ずれの小さいものを優先する
                Some((axial.max(0.0) * 10.0 + orthogonal, p))
            })
            .min_by(|a, b| a.0.total_cmp(&b.0))
            .map(|(_, p)| p.clone())
    };

    // 1. 同じ親を持つ兄弟を優先し, 2. なければ画面上のほかの式から探す
    if let Some((_, parent)) = current.split_last() {
        let siblings: Vec<_> = candidates
            .iter()
            .copied()
            .filter(|(p, _)| p.len() == current.len() && p.starts_with(parent))
            .collect();
        if let Some(target) = best_in(&siblings) {
            return Some(target);
        }
    }
    best_in(&candidates)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn rect(left: f64, top: f64, right: f64, bottom: f64) -> Rect {
        Rect {
            left,
            top,
            right,
            bottom,
        }
    }

    /// `add(1, mul(2, 3))` を 1 行に並べた配置
    /// root:        [0, 0]-[300, 20]
    /// Left (1):    [10, 0]-[30, 20]
    /// Right (mul): [40, 0]-[290, 20]
    /// Right.Left:  [50, 0]-[70, 20]
    /// Right.Right: [80, 0]-[100, 20]
    fn inline_nodes() -> Vec<(Vec<PathStep>, Rect)> {
        vec![
            (vec![], rect(0.0, 0.0, 300.0, 20.0)),
            (vec![PathStep::Left], rect(10.0, 0.0, 30.0, 20.0)),
            (vec![PathStep::Right], rect(40.0, 0.0, 290.0, 20.0)),
            (
                vec![PathStep::Right, PathStep::Left],
                rect(50.0, 0.0, 70.0, 20.0),
            ),
            (
                vec![PathStep::Right, PathStep::Right],
                rect(80.0, 0.0, 100.0, 20.0),
            ),
        ]
    }

    #[test]
    fn selects_root_when_nothing_is_selected() {
        let nodes = inline_nodes();
        assert_eq!(navigate(&nodes, None, NavKey::Right), Some(vec![]));
        assert_eq!(navigate(&nodes, None, NavKey::FirstChild), Some(vec![]));
    }

    #[test]
    fn parent_and_root() {
        let nodes = inline_nodes();
        let deep = [PathStep::Right, PathStep::Left];
        assert_eq!(
            navigate(&nodes, Some(&deep), NavKey::Parent),
            Some(vec![PathStep::Right])
        );
        assert_eq!(navigate(&nodes, Some(&deep), NavKey::Root), Some(vec![]));
        assert_eq!(navigate(&nodes, Some(&[]), NavKey::Parent), None);
        assert_eq!(navigate(&nodes, Some(&[]), NavKey::Root), None);
    }

    #[test]
    fn parent_skips_paths_without_nodes() {
        let nodes = vec![
            (vec![], rect(0.0, 0.0, 100.0, 40.0)),
            (
                vec![PathStep::Left, PathStep::Right],
                rect(10.0, 0.0, 30.0, 20.0),
            ),
        ];
        assert_eq!(
            navigate(
                &nodes,
                Some(&[PathStep::Left, PathStep::Right]),
                NavKey::Parent
            ),
            Some(vec![])
        );
    }

    #[test]
    fn first_and_last_child() {
        let nodes = inline_nodes();
        assert_eq!(
            navigate(&nodes, Some(&[]), NavKey::FirstChild),
            Some(vec![PathStep::Left])
        );
        assert_eq!(
            navigate(&nodes, Some(&[]), NavKey::LastChild),
            Some(vec![PathStep::Right])
        );
        assert_eq!(
            navigate(&nodes, Some(&[PathStep::Left]), NavKey::FirstChild),
            None
        );
    }

    #[test]
    fn horizontal_moves_prefer_siblings() {
        let nodes = inline_nodes();
        assert_eq!(
            navigate(&nodes, Some(&[PathStep::Left]), NavKey::Right),
            Some(vec![PathStep::Right])
        );
        assert_eq!(
            navigate(
                &nodes,
                Some(&[PathStep::Right, PathStep::Left]),
                NavKey::Right
            ),
            Some(vec![PathStep::Right, PathStep::Right])
        );
        // 兄弟が左になければ, 画面上で左にある別の式へ移る
        assert_eq!(
            navigate(
                &nodes,
                Some(&[PathStep::Right, PathStep::Left]),
                NavKey::Left
            ),
            Some(vec![PathStep::Left])
        );
        assert_eq!(
            navigate(&nodes, Some(&[PathStep::Left]), NavKey::Left),
            None
        );
    }

    #[test]
    fn vertical_moves_follow_rows() {
        // 複数行に展開された配置: Left が 1 行目, Right が 2 行目
        let nodes = vec![
            (vec![], rect(0.0, 0.0, 200.0, 60.0)),
            (vec![PathStep::Left], rect(20.0, 5.0, 120.0, 25.0)),
            (vec![PathStep::Right], rect(20.0, 35.0, 80.0, 55.0)),
        ];
        assert_eq!(
            navigate(&nodes, Some(&[PathStep::Left]), NavKey::Down),
            Some(vec![PathStep::Right])
        );
        assert_eq!(
            navigate(&nodes, Some(&[PathStep::Right]), NavKey::Up),
            Some(vec![PathStep::Left])
        );
        assert_eq!(
            navigate(&nodes, Some(&[PathStep::Right]), NavKey::Down),
            None
        );
    }

    #[test]
    fn key_mapping_follows_docs() {
        let none = Modifiers::empty();
        let shift = Modifiers::SHIFT;
        let ch = |s: &str| Key::Character(s.to_string());
        assert_eq!(NavKey::from_key(&ch("w"), none), Some(NavKey::Up));
        assert_eq!(NavKey::from_key(&ch("a"), none), Some(NavKey::Left));
        assert_eq!(NavKey::from_key(&ch("s"), none), Some(NavKey::Down));
        assert_eq!(NavKey::from_key(&ch("d"), none), Some(NavKey::Right));
        assert_eq!(NavKey::from_key(&Key::ArrowUp, none), Some(NavKey::Up));
        assert_eq!(NavKey::from_key(&ch("q"), none), Some(NavKey::Parent));
        assert_eq!(NavKey::from_key(&ch("Q"), shift), Some(NavKey::Root));
        assert_eq!(NavKey::from_key(&ch("e"), none), Some(NavKey::FirstChild));
        assert_eq!(NavKey::from_key(&ch("E"), shift), Some(NavKey::LastChild));
        assert_eq!(NavKey::from_key(&ch("s"), Modifiers::META), None);
        assert_eq!(NavKey::from_key(&ch("x"), none), None);
    }
}
