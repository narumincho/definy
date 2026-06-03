// このファイルは narumincho-vdom-build によって自動生成されました。

/// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/body
pub struct Body {
    ///
    pub alink: std::option::Option<String>,
    ///
    pub background: std::option::Option<String>,
    ///
    pub bgcolor: std::option::Option<String>,
    ///
    pub bottommargin: std::option::Option<String>,
    ///
    pub leftmargin: std::option::Option<String>,
    ///
    pub link: std::option::Option<String>,
    ///
    pub rightmargin: std::option::Option<String>,
    ///
    pub text: std::option::Option<String>,
    ///
    pub topmargin: std::option::Option<String>,
    ///
    pub vlink: std::option::Option<String>,
}

pub fn body() -> Body {
    Body {
        alink: None,
        background: None,
        bgcolor: None,
        bottommargin: None,
        leftmargin: None,
        link: None,
        rightmargin: None,
        text: None,
        topmargin: None,
        vlink: None,
    }
}
impl Body {
    ///
    pub fn alink(mut self, value: impl Into<String>) -> Self {
        self.alink = Some(value.into());
        self
    }

    ///
    pub fn background(mut self, value: impl Into<String>) -> Self {
        self.background = Some(value.into());
        self
    }

    ///
    pub fn bgcolor(mut self, value: impl Into<String>) -> Self {
        self.bgcolor = Some(value.into());
        self
    }

    ///
    pub fn bottommargin(mut self, value: impl Into<String>) -> Self {
        self.bottommargin = Some(value.into());
        self
    }

    ///
    pub fn leftmargin(mut self, value: impl Into<String>) -> Self {
        self.leftmargin = Some(value.into());
        self
    }

    ///
    pub fn link(mut self, value: impl Into<String>) -> Self {
        self.link = Some(value.into());
        self
    }

    ///
    pub fn rightmargin(mut self, value: impl Into<String>) -> Self {
        self.rightmargin = Some(value.into());
        self
    }

    ///
    pub fn text(mut self, value: impl Into<String>) -> Self {
        self.text = Some(value.into());
        self
    }

    ///
    pub fn topmargin(mut self, value: impl Into<String>) -> Self {
        self.topmargin = Some(value.into());
        self
    }

    ///
    pub fn vlink(mut self, value: impl Into<String>) -> Self {
        self.vlink = Some(value.into());
        self
    }

    pub fn to_element(self) -> super::Element {
        super::Element {
            global_attributes: super::GlobalAttributes::default(),
            element_content: super::ElementContent::Body(self),
        }
    }
}
