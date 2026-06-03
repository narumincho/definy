// このファイルは narumincho-vdom-build によって自動生成されました。

/// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/colgroup
pub struct Colgroup {

    /// 
    pub align: std::option::Option<String>,
    /// 
    pub char: std::option::Option<String>,
    /// 
    pub charoff: std::option::Option<String>,
    /// 
    pub span: std::option::Option<String>,
    /// 
    pub valign: std::option::Option<String>,
    /// 
    pub width: std::option::Option<String>,
}


pub fn colgroup() -> Colgroup {
    Colgroup{
        align: None,
        char: None,
        charoff: None,
        span: None,
        valign: None,
        width: None,
    }
}
impl Colgroup {
    /// 
    pub fn align(mut self, value: impl Into<String>) -> Self {
        self.align = Some(value.into());
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
    pub fn span(mut self, value: impl Into<String>) -> Self {
        self.span = Some(value.into());
        self
    }

    /// 
    pub fn valign(mut self, value: impl Into<String>) -> Self {
        self.valign = Some(value.into());
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
            element_content: super::ElementContent::Colgroup(self),
        }
    }
}
