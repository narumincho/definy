// このファイルは narumincho-vdom-build によって自動生成されました。

/// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/li
pub struct Li {

    /// 
    pub r#type: std::option::Option<String>,
    /// 
    pub value: std::option::Option<String>,
}


pub fn li() -> Li {
    Li{
        r#type: None,
        value: None,
    }
}
impl Li {
    /// 
    pub fn r#type(mut self, value: impl Into<String>) -> Self {
        self.r#type = Some(value.into());
        self
    }

    /// 
    pub fn value(mut self, value: impl Into<String>) -> Self {
        self.value = Some(value.into());
        self
    }

    pub fn to_element(self) -> super::Element {
        super::Element {
            global_attributes: super::GlobalAttributes {},
            element_content: super::ElementContent::Li(self),
        }
    }
}
