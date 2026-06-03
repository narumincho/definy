// このファイルは narumincho-vdom-build によって自動生成されました。

/// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/caption
pub struct Caption {

    /// 
    pub align: std::option::Option<String>,
}


pub fn caption() -> Caption {
    Caption{
        align: None,
    }
}
impl Caption {
    /// 
    pub fn align(mut self, value: impl Into<String>) -> Self {
        self.align = Some(value.into());
        self
    }

    pub fn to_element(self) -> super::Element {
        super::Element {
            global_attributes: super::GlobalAttributes {},
            element_content: super::ElementContent::Caption(self),
        }
    }
}
