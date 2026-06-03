// このファイルは narumincho-vdom-build によって自動生成されました。

/// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/style
pub struct Style {

    /// 
    pub blocking: std::option::Option<String>,
    /// 
    pub media: std::option::Option<String>,
    /// 
    pub r#type: std::option::Option<String>,
}


pub fn style() -> Style {
    Style{
        blocking: None,
        media: None,
        r#type: None,
    }
}
impl Style {
    /// 
    pub fn blocking(mut self, value: impl Into<String>) -> Self {
        self.blocking = Some(value.into());
        self
    }

    /// 
    pub fn media(mut self, value: impl Into<String>) -> Self {
        self.media = Some(value.into());
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
            element_content: super::ElementContent::Style(self),
        }
    }
}
