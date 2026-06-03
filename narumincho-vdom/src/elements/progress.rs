// このファイルは narumincho-vdom-build によって自動生成されました。

/// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/progress
pub struct Progress {

    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Attributes/max
    pub max: std::option::Option<String>,
    /// 
    pub value: std::option::Option<String>,
}


pub fn progress() -> Progress {
    Progress{
        max: None,
        value: None,
    }
}
impl Progress {
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Attributes/max
    pub fn max(mut self, value: impl Into<String>) -> Self {
        self.max = Some(value.into());
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
            element_content: super::ElementContent::Progress(self),
        }
    }
}
