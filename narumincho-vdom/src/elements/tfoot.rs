// このファイルは narumincho-vdom-build によって自動生成されました。

/// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/tfoot
pub struct Tfoot {
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

pub fn tfoot() -> Tfoot {
    Tfoot {
        align: None,
        bgcolor: None,
        char: None,
        charoff: None,
        valign: None,
    }
}
impl Tfoot {
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

    pub fn to_element(self) -> super::Element {
        super::Element {
            global_attributes: super::GlobalAttributes::default(),
            element_content: super::ElementContent::Tfoot(self),
        }
    }
}
