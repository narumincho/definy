// このファイルは narumincho-vdom-build によって自動生成されました。

/// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/area
pub struct Area {
    ///
    pub alt: std::option::Option<String>,
    ///
    pub attributionsrc: std::option::Option<String>,
    ///
    pub coords: std::option::Option<String>,
    ///
    pub download: std::option::Option<String>,
    ///
    pub href: std::option::Option<String>,
    ///
    pub implicit_noopener: std::option::Option<String>,
    ///
    pub interestfor: std::option::Option<String>,
    ///
    pub nohref: std::option::Option<String>,
    ///
    pub ping: std::option::Option<String>,
    ///
    pub referrerpolicy: std::option::Option<String>,
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Attributes/rel
    pub rel: std::option::Option<String>,
    ///
    pub shape: std::option::Option<String>,
    ///
    pub target: std::option::Option<String>,
}

pub fn area() -> Area {
    Area {
        alt: None,
        attributionsrc: None,
        coords: None,
        download: None,
        href: None,
        implicit_noopener: None,
        interestfor: None,
        nohref: None,
        ping: None,
        referrerpolicy: None,
        rel: None,
        shape: None,
        target: None,
    }
}
impl Area {
    ///
    pub fn alt(mut self, value: impl Into<String>) -> Self {
        self.alt = Some(value.into());
        self
    }

    ///
    pub fn attributionsrc(mut self, value: impl Into<String>) -> Self {
        self.attributionsrc = Some(value.into());
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
    pub fn nohref(mut self, value: impl Into<String>) -> Self {
        self.nohref = Some(value.into());
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
    pub fn shape(mut self, value: impl Into<String>) -> Self {
        self.shape = Some(value.into());
        self
    }

    ///
    pub fn target(mut self, value: impl Into<String>) -> Self {
        self.target = Some(value.into());
        self
    }

    pub fn to_element(self, children: Vec<super::Node>) -> super::Element {
        super::Element {
            global_attributes: super::GlobalAttributes::default(),
            element_content: super::ElementContent::Area(self),
            children,
        }
    }
}
