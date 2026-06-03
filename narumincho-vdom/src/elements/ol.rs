// このファイルは narumincho-vdom-build によって自動生成されました。

/// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/ol
pub struct Ol {

    /// 
    pub compact: std::option::Option<String>,
    /// 
    pub reversed: std::option::Option<String>,
    /// 
    pub start: std::option::Option<String>,
    /// 
    pub r#type: std::option::Option<String>,
}


pub fn ol() -> Ol {
    Ol{
        compact: None,
        reversed: None,
        start: None,
        r#type: None,
    }
}
impl Ol {
    /// 
    pub fn compact(mut self, value: impl Into<String>) -> Self {
        self.compact = Some(value.into());
        self
    }

    /// 
    pub fn reversed(mut self, value: impl Into<String>) -> Self {
        self.reversed = Some(value.into());
        self
    }

    /// 
    pub fn start(mut self, value: impl Into<String>) -> Self {
        self.start = Some(value.into());
        self
    }

    /// 
    pub fn r#type(mut self, value: impl Into<String>) -> Self {
        self.r#type = Some(value.into());
        self
    }

    pub fn to_element(self) -> super::Element {
        super::Element {
            global_attributes: super::GlobalAttributes {},
            element_content: super::ElementContent::Ol(self),
        }
    }
}
