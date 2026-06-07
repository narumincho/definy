// このファイルは narumincho-vdom-build によって自動生成されました。

/// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/a
pub struct A {
    ///
    pub attributionsourceid: std::option::Option<String>,
    ///
    pub attributionsrc: std::option::Option<String>,
    ///
    pub charset: std::option::Option<String>,
    ///
    pub coords: std::option::Option<String>,
    ///
    pub download: std::option::Option<String>,
    ///
    pub href: std::option::Option<String>,
    ///
    pub hreflang: std::option::Option<String>,
    ///
    pub hreftranslate: std::option::Option<String>,
    ///
    pub implicit_noopener: std::option::Option<String>,
    ///
    pub interestfor: std::option::Option<String>,
    ///
    pub name: std::option::Option<String>,
    ///
    pub ping: std::option::Option<String>,
    ///
    pub referrerpolicy: std::option::Option<String>,
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Attributes/rel
    pub rel: std::option::Option<String>,
    ///
    pub rev: std::option::Option<String>,
    ///
    pub shape: std::option::Option<String>,
    ///
    pub target: std::option::Option<String>,
    ///
    pub text_fragments: std::option::Option<String>,
    ///
    pub r#type: std::option::Option<String>,
}

pub fn a() -> A {
    A {
        attributionsourceid: None,
        attributionsrc: None,
        charset: None,
        coords: None,
        download: None,
        href: None,
        hreflang: None,
        hreftranslate: None,
        implicit_noopener: None,
        interestfor: None,
        name: None,
        ping: None,
        referrerpolicy: None,
        rel: None,
        rev: None,
        shape: None,
        target: None,
        text_fragments: None,
        r#type: None,
    }
}
impl A {
    ///
    pub fn attributionsourceid(mut self, value: impl Into<String>) -> Self {
        self.attributionsourceid = Some(value.into());
        self
    }

    ///
    pub fn attributionsrc(mut self, value: impl Into<String>) -> Self {
        self.attributionsrc = Some(value.into());
        self
    }

    ///
    pub fn charset(mut self, value: impl Into<String>) -> Self {
        self.charset = Some(value.into());
        self
    }

    ///
    pub fn coords(mut self, value: impl Into<String>) -> Self {
        self.coords = Some(value.into());
        self
    }

    ///
    pub fn download(mut self, value: impl Into<String>) -> Self {
        self.download = Some(value.into());
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
    pub fn hreftranslate(mut self, value: impl Into<String>) -> Self {
        self.hreftranslate = Some(value.into());
        self
    }

    ///
    pub fn implicit_noopener(mut self, value: impl Into<String>) -> Self {
        self.implicit_noopener = Some(value.into());
        self
    }

    ///
    pub fn interestfor(mut self, value: impl Into<String>) -> Self {
        self.interestfor = Some(value.into());
        self
    }

    ///
    pub fn name(mut self, value: impl Into<String>) -> Self {
        self.name = Some(value.into());
        self
    }

    ///
    pub fn ping(mut self, value: impl Into<String>) -> Self {
        self.ping = Some(value.into());
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
    pub fn shape(mut self, value: impl Into<String>) -> Self {
        self.shape = Some(value.into());
        self
    }

    ///
    pub fn target(mut self, value: impl Into<String>) -> Self {
        self.target = Some(value.into());
        self
    }

    ///
    pub fn text_fragments(mut self, value: impl Into<String>) -> Self {
        self.text_fragments = Some(value.into());
        self
    }

    ///
    pub fn r#type(mut self, value: impl Into<String>) -> Self {
        self.r#type = Some(value.into());
        self
    }

    pub fn to_element(self, children: Vec<super::Node>) -> super::Element {
        super::Element {
            global_attributes: super::GlobalAttributes::default(),
            element_content: super::ElementContent::A(self),
            children,
        }
    }
}
