// このファイルは narumincho-vdom-build によって自動生成されました。

/// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/hr
pub struct Hr {
    ///
    pub align: std::option::Option<String>,
    ///
    pub color: std::option::Option<String>,
    ///
    pub hr_in_select: std::option::Option<String>,
    ///
    pub noshade: std::option::Option<String>,
    ///
    pub size: std::option::Option<String>,
    ///
    pub width: std::option::Option<String>,
}

pub fn hr() -> Hr {
    Hr {
        align: None,
        color: None,
        hr_in_select: None,
        noshade: None,
        size: None,
        width: None,
    }
}
impl Hr {
    ///
    pub fn align(mut self, value: impl Into<String>) -> Self {
        self.align = Some(value.into());
        self
    }

    ///
    pub fn color(mut self, value: impl Into<String>) -> Self {
        self.color = Some(value.into());
        self
    }

    ///
    pub fn hr_in_select(mut self, value: impl Into<String>) -> Self {
        self.hr_in_select = Some(value.into());
        self
    }

    ///
    pub fn noshade(mut self, value: impl Into<String>) -> Self {
        self.noshade = Some(value.into());
        self
    }

    ///
    pub fn size(mut self, value: impl Into<String>) -> Self {
        self.size = Some(value.into());
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
            element_content: super::ElementContent::Hr(self),
        }
    }
}
