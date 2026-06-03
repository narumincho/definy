// このファイルは narumincho-vdom-build によって自動生成されました。

/// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/meta
pub struct Meta {

    /// 
    pub charset: std::option::Option<String>,
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Attributes/content
    pub content: std::option::Option<String>,
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/meta/http-equiv
    pub http_equiv: std::option::Option<String>,
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/meta/name
    pub name: std::option::Option<String>,
    /// 
    pub scheme: std::option::Option<String>,
}


pub fn meta() -> Meta {
    Meta{
        charset: None,
        content: None,
        http_equiv: None,
        name: None,
        scheme: None,
    }
}
impl Meta {
    /// 
    pub fn charset(mut self, value: impl Into<String>) -> Self {
        self.charset = Some(value.into());
        self
    }

    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Attributes/content
    pub fn content(mut self, value: impl Into<String>) -> Self {
        self.content = Some(value.into());
        self
    }

    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/meta/http-equiv
    pub fn http_equiv(mut self, value: impl Into<String>) -> Self {
        self.http_equiv = Some(value.into());
        self
    }

    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/meta/name
    pub fn name(mut self, value: impl Into<String>) -> Self {
        self.name = Some(value.into());
        self
    }

    /// 
    pub fn scheme(mut self, value: impl Into<String>) -> Self {
        self.scheme = Some(value.into());
        self
    }

    pub fn to_element(self) -> super::Element {
        super::Element {
            global_attributes: super::GlobalAttributes {},
            element_content: super::ElementContent::Meta(self),
        }
    }
}
