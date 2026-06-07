// このファイルは narumincho-vdom-build によって自動生成されました。

/// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/canvas
pub struct Canvas {
    ///
    pub height: std::option::Option<String>,
    ///
    pub moz_opaque: std::option::Option<String>,
    ///
    pub width: std::option::Option<String>,
}

pub fn canvas() -> Canvas {
    Canvas {
        height: None,
        moz_opaque: None,
        width: None,
    }
}
impl Canvas {
    ///
    pub fn height(mut self, value: impl Into<String>) -> Self {
        self.height = Some(value.into());
        self
    }

    ///
    pub fn moz_opaque(mut self, value: impl Into<String>) -> Self {
        self.moz_opaque = Some(value.into());
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
            element_content: super::ElementContent::Canvas(self),
            children,
        }
    }
}
