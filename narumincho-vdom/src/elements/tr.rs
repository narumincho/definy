// このファイルは narumincho-vdom-build によって自動生成されました。

/// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/tr
pub struct Tr {
    ///
    pub align: std::option::Option<String>,
    ///
    pub bgcolor: std::option::Option<String>,
    ///
    pub char: std::option::Option<String>,
    ///
    pub charoff: std::option::Option<String>,
    ///
    pub valign: std::option::Option<String>,
}

pub fn tr() -> Tr {
    Tr {
        align: None,
        bgcolor: None,
        char: None,
        charoff: None,
        valign: None,
    }
}
impl Tr {
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
    pub fn valign(mut self, value: impl Into<String>) -> Self {
        self.valign = Some(value.into());
        self
    }

    pub fn to_element(self, children: Vec<super::Node>) -> super::Element {
        super::Element {
            global_attributes: super::GlobalAttributes::default(),
            element_content: super::ElementContent::Tr(self),
            children,
        }
    }
}
