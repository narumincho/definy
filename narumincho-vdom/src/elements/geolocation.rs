// このファイルは narumincho-vdom-build によって自動生成されました。

/// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/geolocation
pub struct Geolocation {
    ///
    pub autolocate: std::option::Option<String>,
    ///
    pub watch: std::option::Option<String>,
}

pub fn geolocation() -> Geolocation {
    Geolocation {
        autolocate: None,
        watch: None,
    }
}
impl Geolocation {
    ///
    pub fn autolocate(mut self, value: impl Into<String>) -> Self {
        self.autolocate = Some(value.into());
        self
    }

    ///
    pub fn watch(mut self, value: impl Into<String>) -> Self {
        self.watch = Some(value.into());
        self
    }

    pub fn to_element(self, children: Vec<super::Node>) -> super::Element {
        super::Element {
            global_attributes: super::GlobalAttributes::default(),
            element_content: super::ElementContent::Geolocation(self),
            children,
        }
    }
}
