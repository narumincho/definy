// このファイルは narumincho-vdom-build によって自動生成されました。

/// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/br
pub struct Br {

    /// 
    pub clear: std::option::Option<String>,
}


pub fn br() -> Br {
    Br{
        clear: None,
    }
}
impl Br {
    /// 
    pub fn clear(mut self, value: impl Into<String>) -> Self {
        self.clear = Some(value.into());
        self
    }

    pub fn to_element(self) -> super::Element {
        super::Element {
            global_attributes: super::GlobalAttributes {},
            element_content: super::ElementContent::Br(self),
        }
    }
}
