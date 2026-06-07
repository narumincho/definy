// このファイルは narumincho-vdom-build によって自動生成されました。

/// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/fencedframe
pub struct Fencedframe {
    ///
    pub allow: std::option::Option<String>,
    ///
    pub height: std::option::Option<String>,
    ///
    pub width: std::option::Option<String>,
}

pub fn fencedframe() -> Fencedframe {
    Fencedframe {
        allow: None,
        height: None,
        width: None,
    }
}
impl Fencedframe {
    ///
    pub fn allow(mut self, value: impl Into<String>) -> Self {
        self.allow = Some(value.into());
        self
    }

    ///
    pub fn height(mut self, value: impl Into<String>) -> Self {
        self.height = Some(value.into());
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
            element_content: super::ElementContent::Fencedframe(self),
            children,
        }
    }
}
