// このファイルは narumincho-vdom-build によって自動生成されました。

/// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/font
pub struct Font {
    ///
    pub color: std::option::Option<String>,
    ///
    pub face: std::option::Option<String>,
    ///
    pub size: std::option::Option<String>,
}

pub fn font() -> Font {
    Font {
        color: None,
        face: None,
        size: None,
    }
}
impl Font {
    ///
    pub fn color(mut self, value: impl Into<String>) -> Self {
        self.color = Some(value.into());
        self
    }

    ///
    pub fn face(mut self, value: impl Into<String>) -> Self {
        self.face = Some(value.into());
        self
    }

    ///
    pub fn size(mut self, value: impl Into<String>) -> Self {
        self.size = Some(value.into());
        self
    }

    pub fn to_element(self) -> super::Element {
        super::Element {
            global_attributes: super::GlobalAttributes::default(),
            element_content: super::ElementContent::Font(self),
        }
    }
}
