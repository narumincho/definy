// このファイルは narumincho-vdom-build によって自動生成されました。

/// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/embed
pub struct Embed {

    /// 
    pub align: std::option::Option<String>,
    /// 
    pub height: std::option::Option<String>,
    /// 
    pub name: std::option::Option<String>,
    /// 
    pub src: std::option::Option<String>,
    /// 
    pub r#type: std::option::Option<String>,
    /// 
    pub width: std::option::Option<String>,
}


pub fn embed() -> Embed {
    Embed{
        align: None,
        height: None,
        name: None,
        src: None,
        r#type: None,
        width: None,
    }
}
impl Embed {
    /// 
    pub fn align(mut self, value: impl Into<String>) -> Self {
        self.align = Some(value.into());
        self
    }

    /// 
    pub fn height(mut self, value: impl Into<String>) -> Self {
        self.height = Some(value.into());
        self
    }

    /// 
    pub fn name(mut self, value: impl Into<String>) -> Self {
        self.name = Some(value.into());
        self
    }

    /// 
    pub fn src(mut self, value: impl Into<String>) -> Self {
        self.src = Some(value.into());
        self
    }

    /// 
    pub fn r#type(mut self, value: impl Into<String>) -> Self {
        self.r#type = Some(value.into());
        self
    }

    /// 
    pub fn width(mut self, value: impl Into<String>) -> Self {
        self.width = Some(value.into());
        self
    }

    pub fn to_element(self) -> super::Element {
        super::Element {
            global_attributes: super::GlobalAttributes {},
            element_content: super::ElementContent::Embed(self),
        }
    }
}
