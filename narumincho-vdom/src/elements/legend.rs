// このファイルは narumincho-vdom-build によって自動生成されました。

/// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/legend
pub struct Legend {
    ///
    pub align: std::option::Option<String>,
}

pub fn legend() -> Legend {
    Legend { align: None }
}
impl Legend {
    ///
    pub fn align(mut self, value: impl Into<String>) -> Self {
        self.align = Some(value.into());
        self
    }

    pub fn to_element(self) -> super::Element {
        super::Element {
            global_attributes: super::GlobalAttributes::default(),
            element_content: super::ElementContent::Legend(self),
        }
    }
}
