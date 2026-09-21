#[derive(Debug, Clone, PartialEq)]
pub struct LayoutOptions {
    pub max_width: f32,
    pub char_width: f32,
    pub line_height: f32,
    pub indent_size: f32,
    pub chip_padding_x: f32,
}

impl Default for LayoutOptions {
    fn default() -> Self {
        Self {
            max_width: 600.0,
            char_width: 8.5,
            line_height: 26.0,
            indent_size: 20.0,
            chip_padding_x: 8.0,
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum LayoutMode {
    /// 1行に収まるため横並びで配置
    Inline,
    /// 1行に収まらないため複数行にインデント展開
    Multiline,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum NodeKind {
    LiteralNumber,
    LiteralString,
    LiteralBoolean,
    Identifier,
    Keyword,
    Operator,
    Delimiter,
    Group,
    Block,
    Table,
}

#[derive(Debug, Clone, PartialEq)]
pub struct LayoutNode {
    pub id: String,
    pub label: String,
    pub kind: NodeKind,
    pub children: Vec<LayoutNode>,
    pub computed_width: f32,
    pub computed_height: f32,
    pub layout_mode: LayoutMode,
    /// Table の場合、各カラムの計算幅
    pub columns_width: Vec<f32>,
    /// テーブルのヘッダーラベル（キー名など）
    pub table_headers: Vec<String>,
}

impl LayoutNode {
    pub fn new(id: impl Into<String>, label: impl Into<String>, kind: NodeKind) -> Self {
        Self {
            id: id.into(),
            label: label.into(),
            kind,
            children: Vec::new(),
            computed_width: 0.0,
            computed_height: 0.0,
            layout_mode: LayoutMode::Inline,
            columns_width: Vec::new(),
            table_headers: Vec::new(),
        }
    }

    pub fn with_children(mut self, children: Vec<LayoutNode>) -> Self {
        self.children = children;
        self
    }
}

#[derive(Debug, Clone, PartialEq)]
pub struct LayoutResult {
    pub root: LayoutNode,
    pub total_width: f32,
    pub total_height: f32,
    pub node_count: usize,
    pub max_depth: usize,
}
