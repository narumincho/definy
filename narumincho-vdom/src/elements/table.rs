// このファイルは narumincho-vdom-build によって自動生成されました。

/// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/table
pub struct Table {
    ///
    pub align: std::option::Option<String>,
    ///
    pub bgcolor: std::option::Option<String>,
    ///
    pub border: std::option::Option<String>,
    ///
    pub cellpadding: std::option::Option<String>,
    ///
    pub cellspacing: std::option::Option<String>,
    ///
    pub frame: std::option::Option<String>,
    ///
    pub rules: std::option::Option<String>,
    ///
    pub summary: std::option::Option<String>,
    ///
    pub width: std::option::Option<String>,
}

pub fn table() -> Table {
    Table {
        align: None,
        bgcolor: None,
        border: None,
        cellpadding: None,
        cellspacing: None,
        frame: None,
        rules: None,
        summary: None,
        width: None,
    }
}
impl Table {
    ///
    pub fn align(mut self, value: impl Into<String>) -> Self {
        self.align = Some(value.into());
        self
    }

    ///
    pub fn bgcolor(mut self, value: impl Into<String>) -> Self {
        self.bgcolor = Some(value.into());
        self
    }

    ///
    pub fn border(mut self, value: impl Into<String>) -> Self {
        self.border = Some(value.into());
        self
    }

    ///
    pub fn cellpadding(mut self, value: impl Into<String>) -> Self {
        self.cellpadding = Some(value.into());
        self
    }

    ///
    pub fn cellspacing(mut self, value: impl Into<String>) -> Self {
        self.cellspacing = Some(value.into());
        self
    }

    ///
    pub fn frame(mut self, value: impl Into<String>) -> Self {
        self.frame = Some(value.into());
        self
    }

    ///
    pub fn rules(mut self, value: impl Into<String>) -> Self {
        self.rules = Some(value.into());
        self
    }

    ///
    pub fn summary(mut self, value: impl Into<String>) -> Self {
        self.summary = Some(value.into());
        self
    }

    ///
    pub fn width(mut self, value: impl Into<String>) -> Self {
        self.width = Some(value.into());
        self
    }

    pub fn to_element(self, children: Vec<super::Node>) -> super::Element {
        super::Element {
            global_attributes: super::GlobalAttributes::default(),
            element_content: super::ElementContent::Table(self),
            children,
        }
    }
}
