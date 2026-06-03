// このファイルは narumincho-vdom-build によって自動生成されました。

/// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/q
pub struct Q {

    /// 
    pub cite: std::option::Option<String>,
}


pub fn q() -> Q {
    Q{
        cite: None,
    }
}
impl Q {
    /// 
    pub fn cite(mut self, value: impl Into<String>) -> Self {
        self.cite = Some(value.into());
        self
    }

    pub fn to_element(self) -> super::Element {
        super::Element {
            global_attributes: super::GlobalAttributes {},
            element_content: super::ElementContent::Q(self),
        }
    }
}
