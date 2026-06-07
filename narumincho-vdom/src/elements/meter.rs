// このファイルは narumincho-vdom-build によって自動生成されました。

/// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/meter
pub struct Meter {
    ///
    pub high: std::option::Option<String>,
    ///
    pub low: std::option::Option<String>,
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Attributes/max
    pub max: std::option::Option<String>,
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Attributes/min
    pub min: std::option::Option<String>,
    ///
    pub optimum: std::option::Option<String>,
    ///
    pub value: std::option::Option<String>,
}

pub fn meter() -> Meter {
    Meter {
        high: None,
        low: None,
        max: None,
        min: None,
        optimum: None,
        value: None,
    }
}
impl Meter {
    ///
    pub fn high(mut self, value: impl Into<String>) -> Self {
        self.high = Some(value.into());
        self
    }

    ///
    pub fn low(mut self, value: impl Into<String>) -> Self {
        self.low = Some(value.into());
        self
    }

    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Attributes/max
    pub fn max(mut self, value: impl Into<String>) -> Self {
        self.max = Some(value.into());
        self
    }

    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Attributes/min
    pub fn min(mut self, value: impl Into<String>) -> Self {
        self.min = Some(value.into());
        self
    }

    ///
    pub fn optimum(mut self, value: impl Into<String>) -> Self {
        self.optimum = Some(value.into());
        self
    }

    ///
    pub fn value(mut self, value: impl Into<String>) -> Self {
        self.value = Some(value.into());
        self
    }

    pub fn to_element(self, children: Vec<super::Node>) -> super::Element {
        super::Element {
            global_attributes: super::GlobalAttributes::default(),
            element_content: super::ElementContent::Meter(self),
            children,
        }
    }
}
