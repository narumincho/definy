// このファイルは narumincho-vdom-build によって自動生成されました。

/// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/link
pub struct Link {
    ///
    pub r#as: std::option::Option<String>,
    ///
    pub blocking: std::option::Option<String>,
    ///
    pub charset: std::option::Option<String>,
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Attributes/crossorigin
    pub crossorigin: std::option::Option<String>,
    ///
    pub disabled: std::option::Option<String>,
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Attributes/fetchpriority
    pub fetchpriority: std::option::Option<String>,
    ///
    pub href: std::option::Option<String>,
    ///
    pub hreflang: std::option::Option<String>,
    ///
    pub imagesizes: std::option::Option<String>,
    ///
    pub imagesrcset: std::option::Option<String>,
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Attributes/integrity
    pub integrity: std::option::Option<String>,
    ///
    pub media: std::option::Option<String>,
    ///
    pub referrerpolicy: std::option::Option<String>,
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Attributes/rel
    pub rel: std::option::Option<String>,
    ///
    pub rev: std::option::Option<String>,
    ///
    pub sizes: std::option::Option<String>,
    ///
    pub target: std::option::Option<String>,
    ///
    pub r#type: std::option::Option<String>,
}

pub fn link() -> Link {
    Link {
        r#as: None,
        blocking: None,
        charset: None,
        crossorigin: None,
        disabled: None,
        fetchpriority: None,
        href: None,
        hreflang: None,
        imagesizes: None,
        imagesrcset: None,
        integrity: None,
        media: None,
        referrerpolicy: None,
        rel: None,
        rev: None,
        sizes: None,
        target: None,
        r#type: None,
    }
}
impl Link {
    ///
    pub fn r#as(mut self, value: impl Into<String>) -> Self {
        self.r#as = Some(value.into());
        self
    }

    ///
    pub fn blocking(mut self, value: impl Into<String>) -> Self {
        self.blocking = Some(value.into());
        self
    }

    ///
    pub fn charset(mut self, value: impl Into<String>) -> Self {
        self.charset = Some(value.into());
        self
    }

    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Attributes/crossorigin
    pub fn crossorigin(mut self, value: impl Into<String>) -> Self {
        self.crossorigin = Some(value.into());
        self
    }

    ///
    pub fn disabled(mut self, value: impl Into<String>) -> Self {
        self.disabled = Some(value.into());
        self
    }

    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Attributes/fetchpriority
    pub fn fetchpriority(mut self, value: impl Into<String>) -> Self {
        self.fetchpriority = Some(value.into());
        self
    }

    ///
    pub fn href(mut self, value: impl Into<String>) -> Self {
        self.href = Some(value.into());
        self
    }

    ///
    pub fn hreflang(mut self, value: impl Into<String>) -> Self {
        self.hreflang = Some(value.into());
        self
    }

    ///
    pub fn imagesizes(mut self, value: impl Into<String>) -> Self {
        self.imagesizes = Some(value.into());
        self
    }

    ///
    pub fn imagesrcset(mut self, value: impl Into<String>) -> Self {
        self.imagesrcset = Some(value.into());
        self
    }

    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Attributes/integrity
    pub fn integrity(mut self, value: impl Into<String>) -> Self {
        self.integrity = Some(value.into());
        self
    }

    ///
    pub fn media(mut self, value: impl Into<String>) -> Self {
        self.media = Some(value.into());
        self
    }

    ///
    pub fn referrerpolicy(mut self, value: impl Into<String>) -> Self {
        self.referrerpolicy = Some(value.into());
        self
    }

    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Attributes/rel
    pub fn rel(mut self, value: impl Into<String>) -> Self {
        self.rel = Some(value.into());
        self
    }

    ///
    pub fn rev(mut self, value: impl Into<String>) -> Self {
        self.rev = Some(value.into());
        self
    }

    ///
    pub fn sizes(mut self, value: impl Into<String>) -> Self {
        self.sizes = Some(value.into());
        self
    }

    ///
    pub fn target(mut self, value: impl Into<String>) -> Self {
        self.target = Some(value.into());
        self
    }

    ///
    pub fn r#type(mut self, value: impl Into<String>) -> Self {
        self.r#type = Some(value.into());
        self
    }

    pub fn to_element(self) -> super::Element {
        super::Element {
            global_attributes: super::GlobalAttributes::default(),
            element_content: super::ElementContent::Link(self),
        }
    }
}
