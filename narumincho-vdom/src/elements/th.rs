// このファイルは narumincho-vdom-build によって自動生成されました。

/// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/th
pub struct Th {
    ///
    pub abbr: std::option::Option<String>,
    ///
    pub align: std::option::Option<String>,
    ///
    pub axis: std::option::Option<String>,
    ///
    pub bgcolor: std::option::Option<String>,
    ///
    pub char: std::option::Option<String>,
    ///
    pub charoff: std::option::Option<String>,
    ///
    pub colspan: std::option::Option<String>,
    ///
    pub headers: std::option::Option<String>,
    ///
    pub rowspan: std::option::Option<String>,
    ///
    pub scope: std::option::Option<String>,
    ///
    pub valign: std::option::Option<String>,
    ///
    pub width: std::option::Option<String>,
}

pub fn th() -> Th {
    Th {
        abbr: None,
        align: None,
        axis: None,
        bgcolor: None,
        char: None,
        charoff: None,
        colspan: None,
        headers: None,
        rowspan: None,
        scope: None,
        valign: None,
        width: None,
    }
}
impl Th {
    ///
    pub fn abbr(mut self, value: impl Into<String>) -> Self {
        self.abbr = Some(value.into());
        self
    }

    ///
    pub fn align(mut self, value: impl Into<String>) -> Self {
        self.align = Some(value.into());
        self
    }

    ///
    pub fn axis(mut self, value: impl Into<String>) -> Self {
        self.axis = Some(value.into());
        self
    }

    ///
    pub fn bgcolor(mut self, value: impl Into<String>) -> Self {
        self.bgcolor = Some(value.into());
        self
    }

    ///
    pub fn char(mut self, value: impl Into<String>) -> Self {
        self.char = Some(value.into());
        self
    }

    ///
    pub fn charoff(mut self, value: impl Into<String>) -> Self {
        self.charoff = Some(value.into());
        self
    }

    ///
    pub fn colspan(mut self, value: impl Into<String>) -> Self {
        self.colspan = Some(value.into());
        self
    }

    ///
    pub fn headers(mut self, value: impl Into<String>) -> Self {
        self.headers = Some(value.into());
        self
    }

    ///
    pub fn rowspan(mut self, value: impl Into<String>) -> Self {
        self.rowspan = Some(value.into());
        self
    }

    ///
    pub fn scope(mut self, value: impl Into<String>) -> Self {
        self.scope = Some(value.into());
        self
    }

    ///
    pub fn valign(mut self, value: impl Into<String>) -> Self {
        self.valign = Some(value.into());
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
            element_content: super::ElementContent::Th(self),
            children,
        }
    }
}
