// このファイルは narumincho-vdom-build によって自動生成されました。

/// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/marquee
pub struct Marquee {
    ///
    pub behavior: std::option::Option<String>,
    ///
    pub bgcolor: std::option::Option<String>,
    ///
    pub direction: std::option::Option<String>,
    ///
    pub height: std::option::Option<String>,
    ///
    pub hspace: std::option::Option<String>,
    ///
    pub r#loop: std::option::Option<String>,
    ///
    pub scrollamount: std::option::Option<String>,
    ///
    pub scrolldelay: std::option::Option<String>,
    ///
    pub truespeed: std::option::Option<String>,
    ///
    pub vspace: std::option::Option<String>,
    ///
    pub width: std::option::Option<String>,
}

pub fn marquee() -> Marquee {
    Marquee {
        behavior: None,
        bgcolor: None,
        direction: None,
        height: None,
        hspace: None,
        r#loop: None,
        scrollamount: None,
        scrolldelay: None,
        truespeed: None,
        vspace: None,
        width: None,
    }
}
impl Marquee {
    ///
    pub fn behavior(mut self, value: impl Into<String>) -> Self {
        self.behavior = Some(value.into());
        self
    }

    ///
    pub fn bgcolor(mut self, value: impl Into<String>) -> Self {
        self.bgcolor = Some(value.into());
        self
    }

    ///
    pub fn direction(mut self, value: impl Into<String>) -> Self {
        self.direction = Some(value.into());
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
    pub fn r#loop(mut self, value: impl Into<String>) -> Self {
        self.r#loop = Some(value.into());
        self
    }

    ///
    pub fn scrollamount(mut self, value: impl Into<String>) -> Self {
        self.scrollamount = Some(value.into());
        self
    }

    ///
    pub fn scrolldelay(mut self, value: impl Into<String>) -> Self {
        self.scrolldelay = Some(value.into());
        self
    }

    ///
    pub fn truespeed(mut self, value: impl Into<String>) -> Self {
        self.truespeed = Some(value.into());
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

    pub fn to_element(self) -> super::Element {
        super::Element {
            global_attributes: super::GlobalAttributes::default(),
            element_content: super::ElementContent::Marquee(self),
        }
    }
}
