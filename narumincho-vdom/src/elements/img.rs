// このファイルは narumincho-vdom-build によって自動生成されました。

/// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/img
pub struct Img {
    ///
    pub align: std::option::Option<String>,
    ///
    pub alt: std::option::Option<String>,
    ///
    pub aspect_ratio_computed_from_attributes: std::option::Option<String>,
    ///
    pub attributionsrc: std::option::Option<String>,
    ///
    pub border: std::option::Option<String>,
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Attributes/crossorigin
    pub crossorigin: std::option::Option<String>,
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/img#decoding
    pub decoding: std::option::Option<String>,
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Attributes/fetchpriority
    pub fetchpriority: std::option::Option<String>,
    ///
    pub height: std::option::Option<String>,
    ///
    pub hspace: std::option::Option<String>,
    ///
    pub ismap: std::option::Option<String>,
    ///
    pub loading: std::option::Option<String>,
    ///
    pub longdesc: std::option::Option<String>,
    ///
    pub name: std::option::Option<String>,
    ///
    pub referrerpolicy: std::option::Option<String>,
    ///
    pub sizes: std::option::Option<String>,
    ///
    pub src: std::option::Option<String>,
    ///
    pub srcset: std::option::Option<String>,
    ///
    pub usemap: std::option::Option<String>,
    ///
    pub vspace: std::option::Option<String>,
    ///
    pub width: std::option::Option<String>,
}

pub fn img() -> Img {
    Img {
        align: None,
        alt: None,
        aspect_ratio_computed_from_attributes: None,
        attributionsrc: None,
        border: None,
        crossorigin: None,
        decoding: None,
        fetchpriority: None,
        height: None,
        hspace: None,
        ismap: None,
        loading: None,
        longdesc: None,
        name: None,
        referrerpolicy: None,
        sizes: None,
        src: None,
        srcset: None,
        usemap: None,
        vspace: None,
        width: None,
    }
}
impl Img {
    ///
    pub fn align(mut self, value: impl Into<String>) -> Self {
        self.align = Some(value.into());
        self
    }

    ///
    pub fn alt(mut self, value: impl Into<String>) -> Self {
        self.alt = Some(value.into());
        self
    }

    ///
    pub fn aspect_ratio_computed_from_attributes(mut self, value: impl Into<String>) -> Self {
        self.aspect_ratio_computed_from_attributes = Some(value.into());
        self
    }

    ///
    pub fn attributionsrc(mut self, value: impl Into<String>) -> Self {
        self.attributionsrc = Some(value.into());
        self
    }

    ///
    pub fn border(mut self, value: impl Into<String>) -> Self {
        self.border = Some(value.into());
        self
    }

    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Attributes/crossorigin
    pub fn crossorigin(mut self, value: impl Into<String>) -> Self {
        self.crossorigin = Some(value.into());
        self
    }

    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/img#decoding
    pub fn decoding(mut self, value: impl Into<String>) -> Self {
        self.decoding = Some(value.into());
        self
    }

    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Attributes/fetchpriority
    pub fn fetchpriority(mut self, value: impl Into<String>) -> Self {
        self.fetchpriority = Some(value.into());
        self
    }

    ///
    pub fn height(mut self, value: impl Into<String>) -> Self {
        self.height = Some(value.into());
        self
    }

    ///
    pub fn hspace(mut self, value: impl Into<String>) -> Self {
        self.hspace = Some(value.into());
        self
    }

    ///
    pub fn ismap(mut self, value: impl Into<String>) -> Self {
        self.ismap = Some(value.into());
        self
    }

    ///
    pub fn loading(mut self, value: impl Into<String>) -> Self {
        self.loading = Some(value.into());
        self
    }

    ///
    pub fn longdesc(mut self, value: impl Into<String>) -> Self {
        self.longdesc = Some(value.into());
        self
    }

    ///
    pub fn name(mut self, value: impl Into<String>) -> Self {
        self.name = Some(value.into());
        self
    }

    ///
    pub fn referrerpolicy(mut self, value: impl Into<String>) -> Self {
        self.referrerpolicy = Some(value.into());
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
    pub fn usemap(mut self, value: impl Into<String>) -> Self {
        self.usemap = Some(value.into());
        self
    }

    ///
    pub fn vspace(mut self, value: impl Into<String>) -> Self {
        self.vspace = Some(value.into());
        self
    }

    ///
    pub fn width(mut self, value: impl Into<String>) -> Self {
        self.width = Some(value.into());
        self
    }

    pub fn to_element(self, children: Vec<super::Node>) -> super::Element {
        super::Element {
            global_attributes: super::GlobalAttributes::default(),
            element_content: super::ElementContent::Img(self),
            children,
        }
    }
}
