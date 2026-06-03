// このファイルは narumincho-vdom-build によって自動生成されました。

/// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/source
pub struct Source {
    ///
    pub height: std::option::Option<String>,
    ///
    pub media: std::option::Option<String>,
    ///
    pub sizes: std::option::Option<String>,
    ///
    pub src: std::option::Option<String>,
    ///
    pub srcset: std::option::Option<String>,
    ///
    pub r#type: std::option::Option<String>,
    ///
    pub width: std::option::Option<String>,
}

pub fn source() -> Source {
    Source {
        height: None,
        media: None,
        sizes: None,
        src: None,
        srcset: None,
        r#type: None,
        width: None,
    }
}
impl Source {
    ///
    pub fn height(mut self, value: impl Into<String>) -> Self {
        self.height = Some(value.into());
        self
    }

    ///
    pub fn media(mut self, value: impl Into<String>) -> Self {
        self.media = Some(value.into());
        self
    }

    ///
    pub fn sizes(mut self, value: impl Into<String>) -> Self {
        self.sizes = Some(value.into());
        self
    }

    ///
    pub fn src(mut self, value: impl Into<String>) -> Self {
        self.src = Some(value.into());
        self
    }

    ///
    pub fn srcset(mut self, value: impl Into<String>) -> Self {
        self.srcset = Some(value.into());
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
            global_attributes: super::GlobalAttributes::default(),
            element_content: super::ElementContent::Source(self),
        }
    }
}
